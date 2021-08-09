import datetime
import pandas as pd

from sqlalchemy.dialects.postgresql import ARRAY, insert
from . import db


class DivergentBlocks(db.Model):
    """
    Used to keep track of divergent blocks an indexer needs to filter for.
    """

    __tablename__ = "divergent_blocks"
    id = db.Column(db.BigInteger(), primary_key=True)
    current_time = db.Column(db.DateTime, default=datetime.datetime.utcnow)
    ##Allocation POI being disputed
    dispute_id = db.Column(db.String())
    ##Divergent ids exist between PAIRS of indexers.
    """
    @TODO: Maybe using pairs isn't the right way of going about this?

    If we consider divergent blocks as a graph, every pair of indexers 
    can potentially have a different set of divergent blocks.
    """
    indexer_id_1 = db.Column(db.String())
    indexer_id_2 = db.Column(db.String())

    ##Store things like the divergent ids, or any extra data
    divergent_blocks = db.Column("divergent_blocks", ARRAY(db.BigInteger()))
    updated_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    _idx = db.Index(
        "divergent_indexer_pair",
        "dispute_id",
        "indexer_id_1",
        "indexer_id_2",
        unique=True,
    )

    @classmethod
    def bulk_upsert(cls, divergent_blocks: pd.DataFrame, dispute_id: str):
        dictionary_blocks = divergent_blocks.to_dict(orient="records")

        [
            divergent_block.update(dispute_id=dispute_id)
            for divergent_block in dictionary_blocks
        ]
        qs = insert(cls.__table__).values(dictionary_blocks)
        return (
            qs.on_conflict_do_update(
                index_elements=[cls.dispute_id, cls.indexer_id_1, cls.indexer_id_2],
                set_={
                    "updated_at": datetime.datetime.utcnow()
                },  # or even qs.excluded['some_column']
            )
            .returning(DivergentBlocks.__table__)
            .gino.all()
        )
