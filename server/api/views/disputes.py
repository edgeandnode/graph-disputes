import datetime
from enum import Enum
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from starlette.requests import Request
from sqlalchemy import and_

from ..models import db
from ..models.disputes import Dispute, DisputeStage
from ..models.indexer import Indexer
from ..models.indexer_uploads import DataKindEnum, IndexerUploads


from ..graphql import *


router = APIRouter()


class DisputeKind(str, Enum):
    true_dispute = "dispute"
    request_for_info = "request_for_info"


class DisputeModel(BaseModel):
    id: Optional[int] = None
    dispute_id: str
    indexer_ids: List[str]
    dispute_kind: DisputeKind
    supgraph_id: Optional[str] = ""


class IndexerMetadata(BaseModel):
    ethereum_client: Optional[str] = None
    ethereum_cleint_version: Optional[str] = None
    hardware_configuration: Optional[str] = None
    graph_node_version: Optional[str] = None
    graph_node_configuration: Optional[dict] = None


class IndexerUpload(BaseModel):
    data_path: str
    data_kind_enum: DataKindEnum


class IndexerUploadResponse(BaseModel):
    path: str
    kind: str


class IndexerResponse(BaseModel):
    indexer_id: str
    name: str
    indexer_uploads: Optional[List[IndexerUploadResponse]] = []


class DisputeResponse(BaseModel):
    dispute_id: str
    indexer_ids: List[str]
    dispute_stage: DisputeStage
    subgraph_id: Optional[str] = ""
    indexers: Optional[List[IndexerResponse]] = []


class DisputesResponse(BaseModel):
    disputes: List[DisputeResponse]


## Make this only work on active disputes for now. Probably refactor this all
## Into a graphql model too.


@router.get("/disputes", response_model=DisputesResponse)
async def get_disputes():
    disputes = await Dispute.query.gino.all()

    mapped_disputes = [DisputeResponse(**d.to_dict()) for d in disputes]
    enriched_disputes = []

    for dispute in mapped_disputes:
        indexer_responses = []
        dispute_indexers = await Indexer.query.where(
            Indexer.indexer_id.in_(dispute.indexer_ids)
        ).gino.all()
        for indexer in dispute_indexers:
            indexer_uploads = await IndexerUploads.query.where(
                and_(
                    IndexerUploads.indexer_id == indexer.indexer_id,
                    IndexerUploads.dispute_id == dispute.dispute_id,
                )
            ).gino.all()
            mapped_uploads = [
                IndexerUploadResponse(path=d.data_path, kind=d.data_kind_enum.name)
                for d in indexer_uploads
                if d
            ]
            indexer_response = IndexerResponse(
                indexer_id=indexer.indexer_id,
                name=indexer.name,
                indexer_uploads=mapped_uploads,
            )
            indexer_responses.append(indexer_response)

        enriched_dispute = dispute
        enriched_dispute.indexers = indexer_responses
        enriched_disputes.append(enriched_dispute)

    dispute_response = DisputesResponse(disputes=enriched_disputes)

    return dispute_response


@router.get("/disputes/{uid}")
async def get_dispute(uid: str):
    dispute = await Dispute.query.where(Dispute.dispute_id == uid).gino.first()
    return dispute.to_dict()


@router.post("/disputes")
async def add_dispute(dispute: DisputeModel):
    """
    Create a new dispute. Gather the set of related indexers and track them.

    If indexers aren't in the database. generate entries for them.
    """
    if dispute.dispute_kind == "dispute":
        try:
            subgraph_id = get_subgraph_deployment_id_from_dispute(dispute.dispute_id)
            subgraph_deployment = get_subgraph_deployment(subgraph_id)
            dispute_indexers = get_indexers_from_subgraph_deployment(
                subgraph_deployment
            )
        except Exception as e:
            raise HTTPException(status_code=404, detail="{}".format(e))

    else:
        try:
            subgraph_id = dispute.subgraph_deployment
            subgraph_deployment = get_subgraph_deployment(dispute.subgraph_deployment)
            dispute_indexers = get_indexers_from_subgraph_deployment(
                subgraph_deployment
            )
        except Exception as e:
            raise HTTPException(status_code=404, detail="{}".format(e))

    all_indexers = []
    all_indexers.extend(dispute.indexer_ids)
    all_indexers.extend(dispute_indexers)

    ipfs_hash = subgraph_deployment["subgraphDeployment"]["ipfsHash"]

    async with db.transaction(isolation="serializable") as tx_root:
        conn = tx_root.connection
        tx = await conn.transaction()

        try:
            new_dispute = Dispute(
                dispute_id=dispute.dispute_id,
                indexer_ids=all_indexers,
                dispute_stage=DisputeStage.waiting_for_poi.name,
                subgraph_id=ipfs_hash,
                updated_at=datetime.datetime.utcnow(),
            )

            await Dispute.upsert_dispute(new_dispute)
            values = [{"indexer_id": x} for x in all_indexers]

            await Indexer.bulk_upsert(values)
            await tx.commit()
            modified_dispute = await Dispute.get(dispute.dispute_id)

        except Exception as e:
            await tx.rollback()
            raise HTTPException(status_code=404, detail="{}".format(e))

    return modified_dispute.to_dict()


@router.patch("/disputes/{uid}")
async def progress_dispute(request: Request, uid: str):
    dispute = await Dispute.get_or_404(uid)
    json = await request.json()
    stage = json["dispute_stage"]
    await dispute.update(dispute_stage=stage).apply()

    new_dispute = dispute
    new_dispute.dispute_stage = stage
    return new_dispute.to_dict()


@router.delete("/disputes/{uid}")
async def delete_dispute(uid: str):
    dispute = await Dispute.get_or_404(uid)
    await dispute.delete()
    return dict(id=uid)


def init_app(app):
    app.include_router(router)
