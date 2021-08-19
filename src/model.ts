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
  indexer?: Indexer
  subgraphDeployment?: SubgraphDeployment
  indexingIndexerRewards?: number
}

export interface SubgraphDeployment {
  id: string
}

export interface Fisherman {
  id: string
  defaultDisplayName: string
}

export interface Indexer {
  id: string
  defaultDisplayName: string
  indexer: {
    stakedTokens: number
  }
}

export interface Dispute {
  id: string
  type: string
  status: string
  createdAt: number
  allocation: Allocation
  subgraphDeployment: SubgraphDeployment
  indexer: Indexer
  fisherman: Fisherman
}

export interface GraphNetwork {
  indexingSlashingPercentage: number
  minimumDisputeDeposit: number
  querySlashingPercentage: number
  currentEpoch: number
  thawingPeriod: number
  epochLength: number
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

export const getAllocation = async (
  networkSubgraph: Client,
  allocationID: string,
): Promise<Allocation> => {
  const result = await networkSubgraph
    .query(
      gql`
        query($allocationID: String!) {
          allocation(id: $allocationID) {
            id
            createdAtEpoch
            createdAtBlockHash
            closedAtEpoch
            closedAtBlockHash
            closedAtBlockNumber
            poi
            subgraphDeployment {
              id
            }
            indexer {
              id
            }
          }
        }
      `,
      { allocationID },
    )
    .toPromise()
  return result.data.allocation
}

export const getDisputes = async (
  networkSubgraph: Client,
  status: string,
): Promise<Dispute[]> => {
  const where = status ? '{ status: $status }' : '{}'
  const result = await networkSubgraph
    .query(
      gql`
        query($status: DisputeStatus) {
          disputes(
            orderBy: "createdAt"
            orderDirection: "asc"
            where: ${where}
          ) {
            id
            type
            status
            createdAt
            allocation {
              id
              createdAtEpoch
              createdAtBlockHash
              closedAtEpoch
              closedAtBlockHash
              closedAtBlockNumber
              poi
              indexingIndexerRewards
            }
            subgraphDeployment {
              id
            }
            indexer {
              id
              defaultDisplayName
              indexer {
                stakedTokens
              }
            }
            fisherman {
              id
              defaultDisplayName
            }
          }
        }
      `,
      { status },
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
            createdAt
            allocation {
              id
              createdAtEpoch
              createdAtBlockHash
              closedAtEpoch
              closedAtBlockHash
              closedAtBlockNumber
              poi
              indexingIndexerRewards
            }
            subgraphDeployment {
              id
            }
            indexer {
              id
              defaultDisplayName
              indexer {
                stakedTokens
              }
            }
            fisherman {
              id
              defaultDisplayName
            }
          }
        }
      `,
      { disputeID },
    )
    .toPromise()
  return result.data.dispute
}

export const getNetworkSettings = async (
  networkSubgraph: Client,
): Promise<GraphNetwork> => {
  const networkId = 1
  const result = await networkSubgraph
    .query(
      gql`
        query($networkId: Int!) {
          graphNetwork(id: $networkId) {
            id
            indexingSlashingPercentage
            currentEpoch
            thawingPeriod
            epochLength
          }
        }
      `,
      { networkId },
    )
    .toPromise()
  return result.data.graphNetwork
}
