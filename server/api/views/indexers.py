from typing import List, Optional
from fastapi import APIRouter
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel

from ..models.indexer import Indexer
from ..models.indexer_uploads import IndexerUploads
from ..models.divergent_blocks import DivergentBlocks

router = APIRouter()


class IndexerMetadata(BaseModel):
    ethereum_client: Optional[str] = None
    hardware_configuration: Optional[str] = None
    graph_node_version: Optional[str] = None


class IndexerModel(BaseModel):
    indexer_id: str
    name: str
    indexer_metadata: Optional[IndexerMetadata] = None


@router.post("/indexers")
async def create_indexer(indexer: IndexerModel):
    indexer = await Indexer.create(
        indexer_id=indexer.indexer_id,
        name=indexer.name,
        indexer_metadata=jsonable_encoder(indexer.indexer_metadata),
    )
    return indexer.to_dict()


@router.get("/indexers/{uid}")
async def get_indexer(uid: str):
    indexer = await Indexer.get_or_404(uid)
    return indexer.to_dict()


@router.get("/indexers/uploads/{uid}")
async def get_indexer_uploads(uid: str):
    indexer_uploads = await IndexerUploads.get_or_404(uid)
    return indexer_uploads.to_dict()


@router.get("/indexers/divergent/{uid}")
async def get_divergent_blocks(uid: str):
    divergent_blocks = await DivergentBlocks.get_or_404(uid)
    return divergent_blocks.to_dict()


class DivergentBlockModel(BaseModel):
    indexer_1: str
    indexer_2: str
    blocks: List[int]


def init_app(app):
    app.include_router(router)
