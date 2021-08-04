from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB, insert

from . import db


class Indexer(db.Model):
    __tablename__ = "indexer"
    id = db.Column(db.BigInteger(),nullable=True)
    indexer_id = db.Column(
        db.String(),
        primary_key=True
    )  # Won't make primary key so can keep updated records
    name = db.Column(db.Unicode(), default="unnamed")
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

    @classmethod
    def upsert_indexer(cls, indexer):
        qs = insert(cls.__table__).values(indexer.to_dict())
        return (
            qs.on_conflict_do_update(
                index_elements=[cls.indexer_id],
                set_={
                    "updated_at": datetime.utcnow()
                },  # or even qs.excluded['some_column']
            )
            .returning(Indexer.__table__)
            .gino.scalar()
        )

    # @classmethod
    # def bulk_upsert(cls, indexers):
    #     qs = insert(cls.__table__).values(indexers)
    #     return (
    #         qs.returning(Indexer.__table__)
    #         .gino.all()
    #     )
    @classmethod
    def bulk_upsert(cls, indexers):
        qs = insert(cls.__table__).values(indexers)
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