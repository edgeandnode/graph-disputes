import { SubgraphDeploymentID } from '@graphprotocol/common-ts'
import { Client } from '@urql/core'
import { providers } from 'ethers'
import gql from 'graphql-tag'
import PQueue from 'p-queue'

export interface Poi {
  proof: string
  block: EthereumBlock
}

export interface EthereumBlock {
  number: number
  hash: string
}

export class PoiChecker {
  provider: providers.Provider
  subgraph: Client

  constructor(provider: providers.Provider, subgraph: Client) {
    this.provider = provider
    this.subgraph = subgraph
  }

  getPoiRange = async (
    deployment: SubgraphDeploymentID,
    startBlock: number,
    endBlock: number,
    indexerAddress: string,
  ): Promise<{ [key: number]: Poi[] }> => {
    const poiList = []
    await this.getPoiRangeStream(
      deployment,
      startBlock,
      endBlock,
      indexerAddress,
      (poi: Poi) => poiList.push(poi),
    )
    return poiList
  }

  getPoiRangeStream = async (
    deployment: SubgraphDeploymentID,
    startBlock: number,
    endBlock: number,
    indexerAddress: string,
    callback: (poi: Poi) => void,
  ): Promise<void> => {
    const blockRange = Array.from(
      { length: endBlock - startBlock },
      (v, k) => k + startBlock,
    )

    const queue = new PQueue({ concurrency: 6 })
    for (const blockNumber of blockRange) {
      queue.add(async () => {
        const block = await this.provider.getBlock(blockNumber)
        callback(await this.getPoi(deployment, block, indexerAddress))
      })
    }
    await queue.onIdle()
  }

  getPoi = async (
    deployment: SubgraphDeploymentID,
    block: EthereumBlock,
    indexerAddress: string,
  ): Promise<Poi> => {
    const result = await this.subgraph
      .query(
        gql`
          query(
            $subgraph: String!
            $blockHash: String!
            $blockNumber: Int!
            $indexer: String!
          ) {
            proofOfIndexing(
              subgraph: $subgraph
              blockHash: $blockHash
              blockNumber: $blockNumber
              indexer: $indexer
            )
          }
        `,
        {
          subgraph: deployment.ipfsHash,
          blockHash: block.hash,
          blockNumber: block.number,
          indexer: indexerAddress,
        },
      )
      .toPromise()

    if (!result.data) {
      return null
    }
    return {
      proof: result.data.proofOfIndexing,
      block,
    }
  }
}
