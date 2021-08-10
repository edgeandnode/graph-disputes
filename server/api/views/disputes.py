from typing import List, Optional
from fastapi import APIRouter
from pydantic import BaseModel

from ..models import db
from ..models.disputes import Dispute
from ..models.indexer import Indexer

from ..dispute.fsm import DisputeResolver

router = APIRouter()


@router.get("/disputes/{uid}")
async def get_dispute(uid: str):
    dispute = await Dispute.get_or_404(uid)
    return dispute.to_dict()


class DisputeModel(BaseModel):
    id: Optional[int] = None
    allocation_id: str
    indexer_ids: List[str]


@router.post("/disputes")
async def add_dispute(dispute: DisputeModel):
    """
    Create a new dispute. Gather the set of related indexers and track them.

    If indexers aren't in the database. generate entries for them.
    """

    async with db.transaction(isolation="serializable") as tx_root:
        conn = tx_root.connection
        tx = await conn.transaction()

        try:
            created_dispute = await Dispute.create(
                dispute_id=dispute.allocation_id,
                indexer_ids=dispute.indexer_ids,
                stage="waiting_for_poi",
            )
            values = [{"indexer_id": x} for x in dispute.indexer_ids]

            await Indexer.bulk_upsert(values)

            await tx.commit()
        except:
            await tx.rollback()

    return created_dispute.to_dict()


@router.delete("/disputes/{uid}")
async def delete_dispute(uid: str):
    dispute = await Dispute.get_or_404(uid)
    await dispute.delete()
    return dict(id=uid)


def init_app(app):
    app.include_router(router)
