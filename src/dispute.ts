import chalk from 'chalk'
import { providers } from 'ethers'
import { SubgraphDeploymentID } from '@graphprotocol/common-ts'

import { getEpoch, Dispute } from './model'
import { PoiChecker } from './poi'
import { Client } from '@urql/core'

function styleBoolean(value: boolean) {
  return value ? chalk.greenBright(value) : chalk.redBright(value)
}

function styleType(value: string) {
  switch (value) {
    case 'Indexing':
      return chalk.blueBright(value)
    case 'Query':
      return chalk.yellowBright(value)
  }
  return value
}

function styleDisputeStatus(status: string) {
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

export const disputeToEntry = async (
  dispute: Dispute,
  networkSubgraph: Client,
  poiChecker: PoiChecker,
  provider: providers.Provider,
  extended = false,
): Promise<any> => {
  const subgraphDeployment = new SubgraphDeploymentID(
    dispute.subgraphDeployment.id,
  )

  // Epochs
  const [lastEpoch, prevEpoch] = await Promise.all([
    getEpoch(networkSubgraph, dispute.allocation.closedAtEpoch),
    getEpoch(networkSubgraph, dispute.allocation.closedAtEpoch - 1),
  ])

  // Reference POI
  const [lastBlock, prevBlock] = await Promise.all([
    provider.getBlock(lastEpoch.startBlock),
    provider.getBlock(prevEpoch.startBlock),
  ])
  const [lastPoi, prevPoi] = await Promise.all([
    poiChecker.getPoi(subgraphDeployment, lastBlock, dispute.indexer.id),
    poiChecker.getPoi(subgraphDeployment, prevBlock, dispute.indexer.id),
  ])

  // Assemble dispute data
  const disputeEntry = {
    Type: styleType(dispute.type),
    Status: styleDisputeStatus(dispute.status),
    Indexer: chalk.underline.whiteBright(dispute.indexer.id),
    Fisherman: chalk.underline.whiteBright(dispute.fisherman.id),
    SubgraphDeployment: {
      id: `${subgraphDeployment.bytes32} (${subgraphDeployment.ipfsHash})`,
    },
    Allocation: {
      id: chalk.underline.whiteBright(dispute.allocation.id),
      createdAtEpoch: dispute.allocation.createdAtEpoch,
      createdAtBlock: dispute.allocation.createdAtBlockHash,
      closedAtEpoch: dispute.allocation.closedAtEpoch,
      closedAtBlock: `${dispute.allocation.closedAtBlockHash} (#${dispute.allocation.closedAtBlockNumber})`,
    },
    POI: {
      submitted: dispute.allocation.poi,
      match:
        lastPoi && prevPoi
          ? styleBoolean(
              lastPoi.proof === dispute.allocation.poi ||
                prevPoi.proof === dispute.allocation.poi,
            )
          : chalk.redBright('Not-Found'),
    },
  }

  // Extended information
  if (extended) {
    disputeEntry.POI['Reference'] = {
      lastEpoch: {
        id: lastEpoch.id,
        startBlock: lastEpoch.startBlock,
        POI: lastPoi.proof,
        match: styleBoolean(lastPoi.proof === dispute.allocation.poi),
      },
      prevEpoch: {
        id: prevEpoch.id,
        startBlock: prevEpoch.startBlock,
        POI: prevPoi.proof,
        match: styleBoolean(prevPoi.proof === dispute.allocation.poi),
      },
    }
  }

  return disputeEntry
}
