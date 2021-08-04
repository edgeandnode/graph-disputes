from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB, insert

from . import db


class Indexer(db.Model):
    __tablename__ = "indexer"
    indexer_id = db.Column(db.String(), primary_key=True)
    name = db.Column(db.Unicode(), default="unnamed")
    ## Store information like the ethereum client, indexer hardware,etc.
    indexer_metadata = db.Column("indexer_metadata", JSONB)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

    @classmethod
    def bulk_upsert(cls, indexers):
        qs = insert(cls.__table__).values(
            [{"indexer_id": indexer["indexer_id"]} for indexer in indexers]
        )
        return (
            qs.on_conflict_do_update(
                index_elements=[cls.indexer_id],
                set_={
                    "updated_at": datetime.utcnow()
                },  # or even qs.excluded['some_column']
            )
            .returning(Indexer.__table__)
            .gino.all()
        )
