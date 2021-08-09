import datetime
import enum

from . import db
from sqlalchemy import *


class DataKindEnum(enum.Enum):
    poi = 1
    entities = 2


class IndexerUploads(db.Model):
    """
    Used to keep track of where indexer data is being stached.

    """

    __tablename__ = "indexer_uploads"
    id = db.Column(db.BigInteger(), primary_key=True)
    current_time = db.Column(DateTime, default=datetime.datetime.utcnow)
    dispute_id = db.Column(db.String())
    indexer_id = db.Column("indexer_id", db.String())
    data_path = db.Column("data_path", db.String())
    data_kind = Column("data_kind", db.String())
    data_kind_enum = Column(
        Enum(DataKindEnum),
        nullable=True,
    )
