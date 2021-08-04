import datetime

from . import db
from sqlalchemy import *


class IndexerUploads(db.Model):
    """
    Used to keep track of where indexer data is being stached.

    """

    __tablename__ = "indexer_uploads"
    id = db.Column(db.BigInteger(), primary_key=True)
    current_time = db.Column(DateTime, default=datetime.datetime.utcnow)
    ##Allocation POI being disputed
    dispute_id = db.Column(db.String())
    ##Indexer
    indexer_id = db.Column("indexer_id", db.String())

    data_path = db.Column("data_path", db.String())
    data_kind = db.Column("data_kind", db.String())
