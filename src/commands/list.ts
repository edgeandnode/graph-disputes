/* eslint-disable @typescript-eslint/no-explicit-any */

import treeify from 'treeify'
import chalk from 'chalk'
import { Argv } from 'yargs'
import { providers } from 'ethers'
import { SubgraphDeploymentID } from '@graphprotocol/common-ts'

import { setupEnv } from '../env'
import { getDisputes, getEpoch, Dispute } from '../model'
import { PoiChecker } from '../poi'
import { Client } from '@urql/core'
import { POIDisputeAttributes } from '../store'

function styleDisputeStatus(status) {
  switch (status) {
    case 'Accepted':
      return chalk.greenBright(status)
    case 'Rejected':
      return chalk.redBright(status)
    case 'Draw':
      return chalk.yellowBright(status)
  }
  return chalk.dim(status)
}

const disputeCheck = async (
  dispute: Dispute,
  networkSubgraph: Client,
  poiChecker: PoiChecker,
  provider: providers.Provider,
) => {
  const subgraphDeployment = new SubgraphDeploymentID(
    dispute.subgraphDeployment.id,
  )

  const [
    createdEpoch,
    closedEpoch,
    prevEpoch,
    prevPrevEpoch,
  ] = await Promise.all([
    getEpoch(networkSubgraph, dispute.allocation.createdAtEpoch),
    getEpoch(networkSubgraph, dispute.allocation.closedAtEpoch),
    getEpoch(networkSubgraph, dispute.allocation.closedAtEpoch - 1),
    getEpoch(networkSubgraph, dispute.allocation.closedAtEpoch - 2),
  ])

  const createdBlock = await provider.getBlock(
    dispute.allocation.createdAtBlockHash,
  )
  const createdBlockPOI = await poiChecker.getPoi(
    subgraphDeployment,
    createdBlock,
    dispute.indexer.id,
  )

  const createdEpochStartBlock = await provider.getBlock(
    createdEpoch.startBlock,
  )
  const createdEpochStartBlockPOI = await poiChecker.getPoi(
    subgraphDeployment,
    createdEpochStartBlock,
    dispute.indexer.id,
  )
  const closedEpochStartBlock = await provider.getBlock(closedEpoch.startBlock)
  const closedPOI = await poiChecker.getPoi(
    subgraphDeployment,
    closedEpochStartBlock,
    dispute.indexer.id,
  )
  const prevEpochStartBlock = await provider.getBlock(prevEpoch.startBlock)
  const prevPOI = await poiChecker.getPoi(
    subgraphDeployment,
    prevEpochStartBlock,
    dispute.indexer.id,
  )
  const prevPrevEpochStartBlock = await provider.getBlock(
    prevPrevEpoch.startBlock,
  )
  const prevPrevPOI = await poiChecker.getPoi(
    subgraphDeployment,
    prevPrevEpochStartBlock,
    dispute.indexer.id,
  )

  const status =
    createdBlockPOI == dispute.allocation.poi ||
    createdEpochStartBlockPOI == dispute.allocation.poi ||
    closedPOI == dispute.allocation.poi ||
    prevPOI == dispute.allocation.poi ||
    prevPrevPOI == dispute.allocation.poi

  const disputeAttributes: POIDisputeAttributes = {
    indexer: dispute.indexer.id,
    fisherman: dispute.fisherman.id,
    subgraphDeploymentID: subgraphDeployment.ipfsHash,
    trustedIndexer: poiChecker.name,
    allocationID: dispute.allocation.id,
    proof: dispute.allocation.poi,
    createdStartBlockNumber: createdBlock.number,
    createdStartBlockReferenceProof: createdBlockPOI,
    createdEpoch: +createdEpoch.id,
    createdEpochStartBlockNumber: createdEpochStartBlock.number,
    createdEpochReferenceProof: createdEpochStartBlockPOI,
    closedEpoch: +closedEpoch.id,
    closedEpochStartBlockNumber: closedEpochStartBlock.number,
    closedEpochReferenceProof: closedPOI,
    previousEpoch: +prevEpoch.id,
    previousEpochStartBlockNumber: prevEpochStartBlock.number,
    previousEpochReferenceProof: prevPOI,
    previousPreviousEpoch: +prevPrevEpoch.id,
    previousPreviousEpochStartBlockNumber: prevPrevEpochStartBlock.number,
    previousPreviousEpochReferenceProof: prevPrevPOI,
    status: status ? 'validated' : 'noMatch',
  }

  return disputeAttributes
  // return {
  //   type: dispute.type,
  //   status: styleDisputeStatus(dispute.status),
  //   indexer: chalk.underline.whiteBright(dispute.indexer.id),
  //   fisherman: chalk.underline.whiteBright(dispute.fisherman.id),
  //   subgraphDeployment: {
  //     id: `${subgraphDeployment.bytes32} (${subgraphDeployment.ipfsHash})`,
  //   },
  //   allocation: {
  //     id: chalk.underline.whiteBright(dispute.allocation.id),
  //     createdAtEpoch: dispute.allocation.createdAtEpoch,
  //     createdAtBlock: dispute.allocation.createdAtBlockHash,
  //     closedAtEpoch: dispute.allocation.closedAtEpoch,
  //     closedAtBlock: `${dispute.allocation.closedAtBlockHash} (#${dispute.allocation.closedAtBlockNumber})`,
  //     poi: dispute.allocation.poi,
  //   },
  //   referencePOI: {
  //     closedEpoch: {
  //       id: closedEpoch.id,
  //       startBlock: closedEpoch.startBlock,
  //       poi: closedPOI,
  //       match: chalk.red(closedPOI === dispute.allocation.poi),
  //     },
  //     prevEpoch: {
  //       id: prevEpoch.id,
  //       startBlock: prevEpoch.startBlock,
  //       poi: prevPOI,
  //       match: chalk.red(prevPOI === dispute.allocation.poi),
  //     },
  //     prevPrevEpoch: {
  //       id: prevPrevEpoch.id,
  //       startBlock: prevPrevEpoch.startBlock,
  //       poi: prevPrevPOI,
  //       match: chalk.red(prevPrevPOI === dispute.allocation.poi),
  //     },
  //     createdEpoch: {
  //       id: createdEpoch.id,
  //       startBlock: createdEpoch.startBlock,
  //       poi: createdEpochStartBlockPOI,
  //       match: chalk.red(createdEpochStartBlockPOI === dispute.allocation.poi),
  //     },
  //     createdBlock: {
  //       id: createdBlock.number,
  //       startBlock: createdBlock.number,
  //       poi: createdBlockPOI,
  //       match: chalk.red(createdBlockPOI === dispute.allocation.poi),
  //     },
  //   },
  // }
}

export const listCommand = {
  command: 'list',
  describe: 'List arbitration disputes',
  builder: (yargs: Argv): Argv => {
    return yargs
      .option('ethereum', {
        description: 'Ethereum node or provider URL',
        type: 'string',
        required: true,
        group: 'Ethereum',
      })
      .option('ethereum-network', {
        description: 'Ethereum network',
        type: 'string',
        required: false,
        default: 'mainnet',
        group: 'Ethereum',
      })
      .option('network-subgraph-endpoint', {
        description: 'Endpoint to query the network subgraph',
        type: 'string',
        required: true,
        group: 'Network',
      })
      .option('trusted-subgraph-endpoints', {
        description: 'Endpoints to query the trusted indexing proofs',
        type: 'string',
        array: true,
        required: true,
        group: 'Indexer',
        coerce: arg =>
          arg.reduce(
            (acc: string[], value: string) => [...acc, ...value.split(',')],
            [],
          ),
      })
      .option('log-level', {
        description: 'Log level',
        type: 'string',
        default: 'debug',
        group: 'Logging',
      })
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const {
      provider,
      networkSubgraph,
      trustedPOICheckers,
      disputesModel,
    } = await setupEnv(argv)

    // Get disputes to list
    const data = []
    const disputes = await getDisputes(networkSubgraph)

    // const filterOut = [
    //   '0x31edcacc9a53bc8ab4be2eeb0d873409da4c4228cb2d60e4243bd3b4e8af7500',
    //   '0x500a8e47cbdeca7386448ae9e7d52578871b9942ebbef4892469da293bb661f9',
    // ]
    const filterOut = [
      '0x500a8e47cbdeca7386448ae9e7d52578871b9942ebbef4892469da293bb661f9',
    ]

    // Process each dispute and populate additional information
    for (const dispute of disputes.filter(
      dispute => !filterOut.includes(dispute.subgraphDeployment.id),
    )) {
      console.log('DISPUTE', dispute)
      for (const checker of trustedPOICheckers) {
        console.log('CHECKER', checker.name)
        const disputeResults = await disputeCheck(
          dispute,
          networkSubgraph,
          checker,
          provider,
        )
        console.log(disputeResults)
        data.push(disputeResults)
      }

      // DEBUG - TODO: make it optional. Use a promise to make it faster
      // const poiList = await poiChecker.getPoiRange(
      //   new SubgraphDeploymentID(dispute.subgraphDeployment.id),
      //   8365040,
      //   8365050,
      //   dispute.indexer.id,
      // )
      // console.log(poiList)
    }
    console.log(data)
    const stored = disputesModel.POIDispute.bulkCreate(data, {
      ignoreDuplicates: true,
    })

    // Display disputes
    // console.log('Disputes')
    // console.log('--------')
    // console.log(treeify.asTree(data, true, true))
  },
}
