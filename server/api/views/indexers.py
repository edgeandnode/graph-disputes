from typing import List, Optional
from fastapi import APIRouter
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from sqlalchemy import and_

from ..models.indexer import Indexer
from ..models.indexer_uploads import DataKindEnum, IndexerUploads
from ..models.divergent_blocks import DivergentBlocks

router = APIRouter()


class IndexerMetadata(BaseModel):
    ethereum_client: Optional[str] = None
    ethereum_cleint_version: Optional[str] = None
    hardware_configuration: Optional[str] = None
    graph_node_version: Optional[str] = None
    graph_node_configuration: Optional[dict] = None


class IndexerModel(BaseModel):
    indexer_id: str
    name: str
    indexer_metadata: Optional[IndexerMetadata] = None


class IndexerUpload(BaseModel):
    data_path: str
    data_kind_enum: DataKindEnum


class IndexerResponse(BaseModel):
    indexer_id: str
    name: str
    indexer_metadata: Optional[IndexerMetadata] = None
    indexer_uploads: Optional[List[IndexerUpload]] = []


@router.post("/indexers")
async def create_indexer(indexer: IndexerModel):
    indexer = await Indexer.create(
        indexer_id=indexer.indexer_id,
        name=indexer.name,
        indexer_metadata=jsonable_encoder(indexer.indexer_metadata),
    )
    # indexer = await Indexer.upsert_indexer(indexer)
    return indexer.to_dict()


@router.get("/indexers/{uid}")
async def get_indexer(uid: str):
    indexer = await Indexer.query.where(Indexer.indexer_id == uid).gino.first()
    return indexer.to_dict()


class IndexerUploadResponse(BaseModel):
    path: str
    kind: str


class IndexerUploadsResponse(BaseModel):
    indexer_uploads: List[IndexerUploadResponse]


@router.get(
    "/indexers/uploads/{indexer_id}/{dispute_id}", response_model=IndexerUploadsResponse
)
async def get_indexer_uploads(indexer_id: str, dispute_id: str):
    indexer_uploads = await IndexerUploads.query.where(
        and_(
            IndexerUploads.indexer_id == indexer_id,
            IndexerUploads.dispute_id == dispute_id,
        )
    ).gino.all()

    mapped_uploads = [
        IndexerUploadResponse(path=d.data_path, kind=d.data_kind_enum.name)
        for d in indexer_uploads
    ]
    uploads_response = IndexerUploadsResponse(indexer_uploads=mapped_uploads)

    return uploads_response


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
