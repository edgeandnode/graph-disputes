import datetime

from . import db
from sqlalchemy import *
from sqlalchemy.dialects.postgresql import ARRAY


class DivergentBlocks(db.Model):
    """
    Used to keep track of divergent blocks an indexer needs to filter for.
    """

    __tablename__ = "divergent_blocks"
    id = db.Column(db.BigInteger(), primary_key=True)
    current_time = db.Column(DateTime, default=datetime.datetime.utcnow)
    ##Allocation POI being disputed
    dispute_id = db.Column(db.String())
    ##Divergent ids exist between PAIRS of indexers.
    ##@TODO: Maybe this isn't the right way of going about this.
    indexer_id_1 = db.Column(db.String())
    indexer_id_2 = db.Column(db.String())

    ##Store things like the divergent ids, or any extra data
    divergent_blocks = db.Column("divergent_blocks", ARRAY(db.BigInteger()))
