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
  createdAtBlockHash: string
  closedAtEpoch: number
  closedAtBlockHash: string
  closedAtBlockNumber: number
  poi: string
  indexer?: Indexer
  subgraphDeployment?: SubgraphDeployment
  indexingIndexerRewards?: number
}

export interface Attestation {
  id: string
  subgraphDeployment: SubgraphDeployment
  requestCID: string
  responseCID: string
  v: number
  r: string
  s: string
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
  attestation: Attestation
}

export interface GraphNetwork {
  indexingSlashingPercentage: number
  minimumDisputeDeposit: number
  querySlashingPercentage: number
  currentEpoch: number
  maxThawingPeriod: number
  epochLength: number
}

export interface POISubmission {
  id: string
  poi: string
  publicPoi: string | null
  submittedAtEpoch: number
  allocation: {
    id: string
    indexer: {
      id: string
    }
  }
}

export const getEpoch = async (
  networkSubgraph: Client,
  epochID: number,
): Promise<Epoch> => {
  const result = await networkSubgraph
    .query(
      gql`
        query ($epochID: Int!) {
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
        query ($allocationID: String!) {
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
        query ($disputeID: String!) {
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
            attestation {
              id
              subgraphDeployment {
                id
              }
              requestCID
              responseCID
              v
              r
              s
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
        query ($networkId: Int!) {
          graphNetwork(id: $networkId) {
            id
            indexingSlashingPercentage
            currentEpoch
            maxThawingPeriod
            epochLength
          }
        }
      `,
      { networkId },
    )
    .toPromise()
  return result.data.graphNetwork
}

export const getAllocationsByDeployment = async (
  networkSubgraph: Client,
  ipfsHash: string,
): Promise<{ id: string }[]> => {
  const allAllocations: { id: string }[] = []
  let lastId = ''

  while (true) {
    const result = await networkSubgraph
      .query(
        gql`
          query ($ipfsHash: String!, $lastId: String!) {
            allocations(
              first: 1000
              where: { subgraphDeployment_: { ipfsHash: $ipfsHash }, id_gt: $lastId }
              orderBy: id
              orderDirection: asc
            ) {
              id
            }
          }
        `,
        { ipfsHash, lastId },
      )
      .toPromise()

    if (result.error) {
      throw new Error(`Failed to fetch allocations: ${result.error.message}`)
    }

    const allocations = result.data?.allocations || []
    if (allocations.length === 0) break

    allAllocations.push(...allocations)
    lastId = allocations[allocations.length - 1].id

    if (allocations.length < 1000) break
  }

  return allAllocations
}

export const getPOISubmissions = async (
  networkSubgraph: Client,
  allocationIds: string[],
): Promise<POISubmission[]> => {
  if (allocationIds.length === 0) return []

  const allSubmissions: POISubmission[] = []
  const batchSize = 100

  for (let i = 0; i < allocationIds.length; i += batchSize) {
    const batch = allocationIds.slice(i, i + batchSize)
    let lastId = ''

    while (true) {
      const result = await networkSubgraph
        .query(
          gql`
            query ($allocationIds: [String!]!, $lastId: String!) {
              poiSubmissions(
                first: 1000
                where: { allocation_in: $allocationIds, id_gt: $lastId }
                orderBy: id
                orderDirection: asc
              ) {
                id
                poi
                publicPoi
                submittedAtEpoch
                allocation {
                  id
                  indexer {
                    id
                  }
                }
              }
            }
          `,
          { allocationIds: batch, lastId },
        )
        .toPromise()

      if (result.error) {
        throw new Error(`Failed to fetch POI submissions: ${result.error.message}`)
      }

      const submissions = result.data?.poiSubmissions || []
      if (submissions.length === 0) break

      allSubmissions.push(...submissions)
      lastId = submissions[submissions.length - 1].id

      if (submissions.length < 1000) break
    }
  }

  return allSubmissions
}
