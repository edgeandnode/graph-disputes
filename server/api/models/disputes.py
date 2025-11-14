import enum
import datetime
from sqlalchemy import *
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, insert

from . import db
from .indexer_uploads import IndexerUploads


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
    id = db.Sequence("dispute_id_seq", start=0, increment=1)
    dispute_id = db.Column(db.String(), primary_key=True)
    ##All indexers implicated in the dispute
    indexer_ids = db.Column("indexer_ids", ARRAY(String))
    # stage = db.Column(db.String(), nullable=True, default="waiting_for_poi")
    dispute_stage = Column(
        Enum(DisputeStage),
        nullable=True,
        default=DisputeStage.waiting_for_poi,
    )
    subgraph_id = db.Column(db.String(), nullable=True)
    ##Store things like the divergent ids, or any extra data
    metadata = db.Column("metadata", JSONB, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    @classmethod
    def upsert_dispute(cls, dispute):
        qs = insert(cls.__table__).values(dispute.to_dict())
        ##merge and deduplicate
        return (
            qs.on_conflict_do_update(
                index_elements=[cls.dispute_id],
                set_={
                    "updated_at": datetime.datetime.utcnow(),
                    "indexer_ids": dispute.indexer_ids,
                },  # or even qs.excluded['some_column']
            )
            .returning(Dispute.__table__)
            .gino.scalar()
        )

    @classmethod
    async def get_poi_table_paths(cls, dispute_id):

        paths = await IndexerUploads.select("data_path").where(
            and_(
                IndexerUploads.dispute_id == dispute_id,
                IndexerUploads.data_kind == "poi",
            )
        )
        return paths
