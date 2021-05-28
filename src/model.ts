/* eslint-disable @typescript-eslint/no-explicit-any */

import { Client } from '@urql/core'
import gql from 'graphql-tag'
export interface Epoch {
  id: number
  startBlock: number
}
export interface Allocation {
  id: string
  createdAtEpoch: number
  createdAtBlockHash: number
  closedAtEpoch: number
  closedAtBlockHash: number
  closedAtBlockNumber: number
  poi: string
}

export interface SubgraphDeployment {
  id: string
}
export interface Fisherman {
  id: string
}
export interface Indexer {
  id: string
}
export interface Dispute {
  id: string
  type: string
  status: string
  allocation: Allocation
  subgraphDeployment: SubgraphDeployment
  indexer: Indexer
  fisherman: Fisherman
}

export const getEpoch = async (
  networkSubgraph: Client,
  epochID: number,
): Promise<Epoch> => {
  const result = await networkSubgraph
    .query(
      gql`
        query($epochID: Int!) {
          epoch(id: $epochID) {
            id
            startBlock
          }
        }
      `,
      { epochID },
    )
    .toPromise()
  return result.data.epoch
}

export const getDisputes = async (
  networkSubgraph: Client,
): Promise<Dispute[]> => {
  const result = await networkSubgraph
    .query(
      gql`
        {
          disputes(orderBy: "createdAt", orderDirection: "asc") {
            id
            type
            status
            allocation {
              id
              createdAtEpoch
              createdAtBlockHash
              closedAtEpoch
              closedAtBlockHash
              closedAtBlockNumber
              poi
            }
            subgraphDeployment {
              id
            }
            indexer {
              id
            }
            fisherman {
              id
            }
          }
        }
      `,
    )
    .toPromise()
  return result.data.disputes
}

export const getDispute = async (
  networkSubgraph: Client,
  disputeID: string,
): Promise<Dispute> => {
  const result = await networkSubgraph
    .query(
      gql`
        query($disputeID: String!) {
          dispute(id: $disputeID) {
            id
            type
            status
            indexer {
              id
            }
            fisherman {
              id
            }
          }
        }
      `,
      { disputeID },
    )
    .toPromise()
  return result.data.dispute
}