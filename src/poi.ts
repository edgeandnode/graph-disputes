import { SubgraphDeploymentID } from '@graphprotocol/common-ts'
import { Client } from '@urql/core'
import { providers } from 'ethers'
import gql from 'graphql-tag'

export type POI = string

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
  ): Promise<{ [key: number]: POI[] }> => {
    const blockRange = Array.from(
      { length: endBlock - startBlock },
      (v, k) => k + startBlock,
    )

    const poiList = {}
    for (const blockNumber of blockRange) {
      const block = await this.provider.getBlock(blockNumber)
      poiList[blockNumber] = await this.getPoi(
        deployment,
        block,
        indexerAddress,
      )
    }

    return poiList
  }

  getPoi = async (
    deployment: SubgraphDeploymentID,
    block: EthereumBlock,
    indexerAddress: string,
  ): Promise<POI> => {
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
    return result.data.proofOfIndexing
  }
}
