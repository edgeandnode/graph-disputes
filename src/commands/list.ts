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

const disputeToEntry = async (
  dispute: Dispute,
  networkSubgraph: Client,
  poiChecker: PoiChecker,
  provider: providers.Provider,
) => {
  const subgraphDeployment = new SubgraphDeploymentID(
    dispute.subgraphDeployment.id,
  )

  const [currEpoch, prevEpoch] = await Promise.all([
    getEpoch(networkSubgraph, dispute.allocation.closedAtEpoch),
    getEpoch(networkSubgraph, dispute.allocation.closedAtEpoch - 1),
  ])

  const currBlock = await provider.getBlock(currEpoch.startBlock)
  const currPOI = await poiChecker.getPoi(
    subgraphDeployment,
    currBlock,
    dispute.indexer.id,
  )
  const prevBlock = await provider.getBlock(currEpoch.startBlock)
  const prevPOI = await poiChecker.getPoi(
    subgraphDeployment,
    prevBlock,
    dispute.indexer.id,
  )

  return {
    type: dispute.type,
    status: styleDisputeStatus(dispute.status),
    indexer: chalk.underline.whiteBright(dispute.indexer.id),
    fisherman: chalk.underline.whiteBright(dispute.fisherman.id),
    subgraphDeployment: {
      id: `${subgraphDeployment.bytes32} (${subgraphDeployment.ipfsHash})`,
    },
    allocation: {
      id: chalk.underline.whiteBright(dispute.allocation.id),
      createdAtEpoch: dispute.allocation.createdAtEpoch,
      createdAtBlock: dispute.allocation.createdAtBlockHash,
      closedAtEpoch: dispute.allocation.closedAtEpoch,
      closedAtBlock: `${dispute.allocation.closedAtBlockHash} (#${dispute.allocation.closedAtBlockNumber})`,
      poi: dispute.allocation.poi,
    },
    referencePOI: {
      currEpoch: {
        id: currEpoch.id,
        startBlock: currEpoch.startBlock,
        poi: currPOI,
        match: chalk.red(currPOI === dispute.allocation.poi),
      },
      prevEpoch: {
        id: prevEpoch.id,
        startBlock: prevEpoch.startBlock,
        poi: prevPOI,
        match: chalk.red(prevPOI === dispute.allocation.poi),
      },
    },
  }
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
        group: 'Network Subgraph',
      })
      .option('trusted-subgraph-endpoint', {
        description: 'Endpoint to query the trusted indexig proofs',
        type: 'string',
        required: true,
        group: 'Trusted Subgraph',
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
    const { provider, networkSubgraph, poiChecker } = await setupEnv(argv)

    // Get disputes to list
    const data = {}
    const disputes = await getDisputes(networkSubgraph)

    // Process each dispute and populate additional information
    for (const dispute of disputes) {
      const disputeEntry = await disputeToEntry(
        dispute,
        networkSubgraph,
        poiChecker,
        provider,
      )
      data[dispute.id] = disputeEntry

      // DEBUG - TODO: make it optional. Use a promise to make it faster
      const poiList = await poiChecker.getPoiRange(
        new SubgraphDeploymentID(dispute.subgraphDeployment.id),
        8365040,
        8365050,
        dispute.indexer.id,
      )
      console.log(poiList)
    }

    // Display disputes
    console.log('Disputes')
    console.log('--------')
    console.log(treeify.asTree(data, true, true))
  },
}
