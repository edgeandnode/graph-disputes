import datetime

from . import db
from .indexer_uploads import IndexerUploads

import enum
from sqlalchemy import *
from sqlalchemy.dialects.postgresql import ARRAY, JSONB


class DisputeStage(enum.Enum):
    waiting_for_poi = 1
    acquired_poi = 2
    generated_divergent_blocks = 3
    arbitrating = 4
    dispute_settled = 5


class Dispute(db.Model):
    """
    Track open disputes and link them to the indexers who can help resolve it.
    """

    __tablename__ = "disputes"
    id = db.Column(db.BigInteger(), primary_key=True)
    dispute_id = db.Column(db.String())
    current_time = db.Column(DateTime, nullable=False, default=datetime.datetime.utcnow)
    ##All indexers implicated in the dispute
    indexer_ids = db.Column("indexer_ids", ARRAY(String))
    stage = db.Column(db.String(), nullable=True, default="waiting_for_poi")
    dispute_stage = Column(
        Enum(DisputeStage),
        nullable=True,
        default=DisputeStage.waiting_for_poi,
    )
    subgraph_id = db.Column(db.String(), nullable=True)
    ##Store things like the divergent ids, or any extra data
    metadata = db.Column("metadata", JSONB, nullable=True)

    @classmethod
    async def get_poi_table_paths(cls, dispute_id):

        paths = await IndexerUploads.select("data_path").where(
            and_(
                IndexerUploads.dispute_id == dispute_id,
                IndexerUploads.data_kind == "poi",
            )
        )
        return paths
