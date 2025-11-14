export interface IndexerUpload {
  path: string;
  kind: string;
}
export interface Indexers {
  indexer_id: string;
  name: string;
  indexer_uploads: IndexerUpload[];
}

export interface Dispute {
  id?: number;
  dispute_id: string;
  indexer_ids?: string[];
  indexers?: Indexers[];
  dispute_stage: number;
  subgraph_id: string;
  metadata?: string;
}

export const GET_DISPUTES_URL = 'http://localhost:8000/disputes';
