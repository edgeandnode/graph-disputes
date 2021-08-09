import logging
import pandas as pd
from typing import Optional
from sqlalchemy import and_
from transitions import Machine

from ..graphql import get_subgraph_deployment_id_from_dispute
from ..models import db
from ..models.disputes import Dispute
from ..models.divergent_blocks import DivergentBlocks
from ..models.indexer_uploads import IndexerUploads
from ..storage.gcloud import upload_file, POI_BUCKET_NAME
from .web3 import (
    get_matching_events,
    get_subgraph_data_sources,
    get_subgraph_manifest,
)
from analysis.calculate_divergent_block import calculate_divergent_blocks

logger = logging.getLogger(__name__)


async def create_resolver(dispute_id, indexer_id):
    """
    Async helper function allows for construction to depend on a database query.
    """
    resolver = DisputeResolver(dispute_id, indexer_id)
    await resolver._init()
    return resolver


class DisputeResolver(object):
    """
    Dispute resolver is a finite state machine that gets sent events which will trigger functions
    for resolving a dispute.

    As it progresses through a dispute it will intermittently alter relevant state
    in the database.
    """

    # Define some states. Most of the time, narcoleptic superheroes are just like
    # everyone else. Except for...
    states = [
        "waiting_for_poi",
        "acquired_poi",
        "generated_divergent_blocks",
        "arbitrating",
        "dispute_settled",
    ]

    def __init__(self, dispute_id, indexer_id):
        self.dispute_id = dispute_id
        self.indexer_id = indexer_id

        self.number_of_indexers = 0

    async def _init(self):
        state = await self.get_stage()
        self.state = state
        if not state or state == "dispute_settled":
            # The dispute is inactive. Can't do anything.
            return None
        self.machine = Machine(model=self, states=DisputeResolver.states, initial=state)

        # An indexer has supplied us with their poi. We wait for all of the indexers
        # Or until we decide it's time to move on

        self.machine.add_transition(
            trigger="added_poi",
            source="waiting_for_poi",
            dest="waiting_for_poi",
            after="indexer_add_poi",
        )

        # Once all indexers have been accounted for, we can move onto the process of generating divergent blocks
        self.machine.add_transition(
            "all_poi_upload", "waiting_for_poi", "generated_divergent_blocks"
        )

        # All indexers need to upload data around the divergent block
        self.machine.add_transition(
            "add_entities_callcache",
            "generated_divergent_blocks",
            "generated_divergent_blocks",
            after="indexer_add_entities",
        )

        # Notify an arbitrator onnce all of the jury dutied indexers
        # have supplied their entities
        self.machine.add_transition(
            "received_all_entities",
            "generated_divergent_blocks",
            "arbitrating",
            after="notify_arbitrator",
        )

        # Mark the dispute as settled.
        self.machine.add_transition(
            "done", "arbitrating", "dispute_settled", after="dispute_settled"
        )

    async def get_stage(self):
        current_stage = (
            await Dispute.select("stage")
            .where(Dispute.dispute_id == self.dispute_id)
            .gino.scalar()
        )
        return current_stage

    async def indexer_in_dispute(self):
        """
        Check that this indexer should even be contributing to the dispute.
        """
        is_implicated = await Dispute.query.where(
            and_(
                Dispute.dispute_id == self.dispute_id,
                Dispute.indexer_ids.contains([self.indexer_id]),
            )
        ).gino.all()
        return len(is_implicated) > 0

    async def indexer_add_poi(self, content, file_name):
        """
        Keep a tally of the progress of each indexer's POI on the dispute.

        Does three things given the file data from the poi:

        0. Check that this upload is even necessary
        1. Upload the data to a persistent data storage
         -GCS
        2. Note the upload path in postgres for the given indexer

        Potential Errors:
            - No currently active dispute for indexer.
            - Failure to save to cloud object store
            - Failure to insert path into the database


        """

        # Check that this indexer is implicated in the dispute
        is_implicated = await self.indexer_in_dispute()

        if not is_implicated:
            raise Exception("You aren't able to contribute to this dispute")

        # Push the file contents to object storage.
        status, object_path = await upload_file(
            file_data=content,
            object_name=file_name,
            indexer_node=self.indexer_id,
            dispute_hash=self.dispute_id,
        )

        # Push the filepath to database
        push_to_db = await IndexerUploads.create(
            dispute_id=self.dispute_id,
            indexer_id=self.indexer_id,
            data_path=object_path,
            data_kind="poi",
        )
        return object_path

    async def generate_divergent_blocks(self) -> Optional[pd.DataFrame]:
        """
        Create divergent block entries and update the dispute state
        """
        # ensure this is the right stage

        stage = (
            await Dispute.select("stage")
            .where(Dispute.dispute_id == self.dispute_id)
            .gino.scalar()
        )

        # Todo: Make the individual states have their own error messaging
        if stage not in ["generated_divergent_blocks", "acquired_poi"]:
            return None

        divergent_blocks = calculate_divergent_blocks(self.dispute_id)

        async with db.transaction(isolation="serializable") as tx_root:

            conn = tx_root.connection
            tx = await conn.transaction()
            try:
                create_blocks = await DivergentBlocks.bulk_upsert(
                    divergent_blocks=divergent_blocks, dispute_id=self.dispute_id
                )

                # Don't need this roundabout
                dispute = await Dispute.query.where(
                    Dispute.dispute_id == self.dispute_id
                ).gino.first()

                dispute = await dispute.update(
                    stage="generated_divergent_blocks"
                ).apply()

                await tx.commit()
            except:
                await tx.rollback()
                return None

        return divergent_blocks

    async def generate_matching_events(self):
        """
        Gathers divergent blocks and uses them to generate a set of
        matching events against an ethereum node which are stashed in GCS.
        """
        # Returns int8[]
        divergent_blocks = (
            await DivergentBlocks.select("divergent_blocks")
            .where(DivergentBlocks.dispute_id == self.dispute_id)
            .gino.all()
        )
        all_blocks = []

        for divergent_set in divergent_blocks:
            all_blocks.extend(divergent_set.values()[0])
        unique_blocks = list(set(all_blocks))

        subgraph_id = (
            await Dispute.select("subgraph_id")
            .where(Dispute.dispute_id == self.dispute_id)
            .gino.scalar()
        )

        if not subgraph_id:
            # It wasn't included in the upload somehow. Use the dispute id to graph it.
            subgraph_id = get_subgraph_deployment_id_from_dispute(self.dispute_id)

        if not subgraph_id:
            raise Exception("Can't find the subgraph")

        manifest = get_subgraph_manifest(subgraph_id)
        data_sources = get_subgraph_data_sources(manifest)
        matching_events = get_matching_events(data_sources, unique_blocks)
        # upload_result = await stream_dataframe_to_gcs(matching_events, self.dispute_id)
        try:
            # Lazily depending on pandas gcsfs api. Could do a streaming upload.
            matching_events.to_csv(
                "gs://{}/{}/matching_events.csv".format(
                    POI_BUCKET_NAME, self.dispute_id
                )
            )
            return matching_events
        except Exception as e:
            logger.error("Can't upload matching events to GCS")
            raise e

    async def indexer_add_entities(self, content, file_name):
        """Keep a tally of the progress of each indexer's subgraph entities on the dispute"""
        is_implicated = await self.indexer_in_dispute()

        if not is_implicated:
            raise Exception("You aren't able to contribute to this dispute")

        state = await self.get_stage()
        if not state or state != "generated_divergent_blocks":
            # The dispute is inactive. Can't do anything.
            raise Exception("Dispute is not currently accepting entities")

        # Push the file contents to object storage.
        status, object_path = await upload_file(
            file_data=content,
            object_name=file_name,
            indexer_node=self.indexer_id,
            dispute_hash=self.dispute_id,
        )

        # Push the filepath to database
        push_to_db = await IndexerUploads.create(
            dispute_id=self.dispute_id,
            indexer_id=self.indexer_id,
            data_path=object_path,
            data_kind="entities",
        )
        return object_path

    async def notify_arbitrator(self):
        """Send an email/slack or some notification to E&N"""
        pass

    async def dispute_settled(self):
        """Modify state of the dispute"""
        pass

    @property
    def has_quorom(self):
        """
        Determine the number of indexers required to start the dispute process.
        """
        return True
