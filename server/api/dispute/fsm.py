from transitions import Machine
from ..models import db
from ..models.disputes import Dispute
from ..models.indexer import Indexer
from ..models.indexer_uploads import IndexerUploads
from ..storage.gcloud import upload_file


async def create_resolver(dispute_id, indexer_id):
    resolver = DisputeResolver(dispute_id, indexer_id)
    await resolver._init()
    return resolver


import ipdb


class DisputeResolver(object):
    """
    Dispute resolver is a fsm that gets sent events which will trigger functions
    for resolving a dispute.
    """

    # Define some states. Most of the time, narcoleptic superheroes are just like
    # everyone else. Except for...
    states = [
        "waiting_for_poi",
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
        # Initialize the state machine
        if not state:
            return None
        self.machine = Machine(model=self, states=DisputeResolver.states, initial=state)

        # An indexer has supplied us with their poi. We need all of them
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

        # Superheroes are always on call. ALWAYS. But they're not always
        # dressed in work-appropriate clothing.
        self.machine.add_transition(
            "received_all_entities",
            "generated_divergent_blocks",
            "arbitrating",
            after="notify_arbitrator",
        )

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

    async def indexer_add_poi(self, content, file_name):
        """
        Keep a tally of the progress of each indexer's POI on the dispute

        Does two things, Given the file data from the poi:
            0. Check that this upload is even necessary
            1. Upload the data to a persistent data storage
                -GCS
            2. Note the upload path in postgres for the given indexer

        Potential Errors:
            - No currently active dispute for indexer.
            - Failure to save to cloud object store
            - Failure to insert path into the database


        """
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

    async def generate_divergent_blocks():
        pass

    async def indexer_add_entities(self):
        """Keep a tally of the progress of each indexer's subgraph entities on the dispute"""
        pass

    async def notify_arbitrator(self):
        """Send an emai;/slack or some notification to E&N"""
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
