import logging
from typing import List
from fastapi import APIRouter
from pydantic import BaseModel
from fastapi import HTTPException
from sqlalchemy import and_, or_
from starlette.requests import Request


from ..models.divergent_blocks import DivergentBlocks
from ..dispute.fsm import DisputeResolver, create_resolver


logger = logging.getLogger(__name__)


router = APIRouter()


class IndexerDivergentBlocks(BaseModel):
    indexer_id: str
    divergent_blocks: List[int]


@router.get(
    "/divergent_blocks/{dispute_id}/{indexer_id}", response_model=IndexerDivergentBlocks
)
async def get_divergent_blocks_for_dispute(
    dispute_id: str, indexer_id: str, request: Request
):
    """
    For a given indexer returns all of their divergent blocks for a given dispute

    Should only be callable when the stage of the dispute in question has reached
    the `generated_divergent_blocks` step.

    """

    ##TODO: decide on 1. Pass in the headers or as a path arg
    try:
        indexer_id = request.headers["indexer-node"]
        dispute_id = request.headers["dispute-hash"]
    except:
        pass

    # Returns all divergent blocks for an indexer on a dispute
    # Maybe refactor so there isn't the secondary or clause?

    divergent_blocks = (
        await DivergentBlocks.select("divergent_blocks")
        .where(
            and_(
                or_(
                    DivergentBlocks.indexer_id_1 == indexer_id,
                    DivergentBlocks.indexer_id_2 == indexer_id,
                ),
                DivergentBlocks.dispute_id == dispute_id,
            )
        )
        .gino.all()
    )

    ##Flatten the results and deduplicate
    combined = []
    for query_result in divergent_blocks:
        combined.extend(query_result[0])

    deduplicated_blocks = list(set(combined))

    indexer_blocks = IndexerDivergentBlocks(
        indexer_id=indexer_id, divergent_blocks=deduplicated_blocks
    )

    return indexer_blocks


class DivergentBlockModel(BaseModel):
    dispute_id: str
    indexer_id_1: str
    indexer_id_2: str
    divergent_blocks: List[int]


@router.post("/divergent_blocks")
async def submit_divergent_blocks(dblocks: DivergentBlockModel):
    """
    NOT PUBLIC
    Just used for testing.

    """
    created_blocks = await DivergentBlocks.create(
        dispute_id=dblocks.dispute_id,
        indexer_id_1=dblocks.indexer_id_1,
        indexer_id_2=dblocks.indexer_id_2,
        divergent_blocks=dblocks.divergent_blocks,
    )

    return created_blocks.to_dict()


@router.post("/divergent_blocks/{dispute_id}")
async def generate_divergent_blocks(dispute_id: str, request: Request):
    """
    Trigger the creation of divergent blocks for a dispute

    """
    # Create the resolver with supplied dispute
    dsp: DisputeResolver = await create_resolver(
        dispute_id,
    )
    generated = await dsp.generate_divergent_blocks()

    if not generated:
        logger.info("Could not generate divergent blocks")
        raise HTTPException(status_code=500, detail="Could not generate")
    return generated.to_json()


def init_app(app):
    app.include_router(router)
