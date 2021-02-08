// function createIndexingDispute(address _allocationID, uint256 _deposit)

/* eslint-disable @typescript-eslint/no-explicit-any */

import Table from 'cli-table'
import chalk from 'chalk'
import { Wallet } from 'ethers'
import yargs, { Argv } from 'yargs'
import { Client } from '@urql/core'
import { NetworkContracts, parseGRT } from '@graphprotocol/common-ts'

import { setupEnv } from '../env'
import { getDispute } from '../model'
import { waitTransaction } from '../network'
import { askConfirm } from '../utils'

export const showDisputeResolution = async (
  networkSubgraph: Client,
  contracts: NetworkContracts,
  disputeID: string,
): Promise<void> => {
  const dispute = await getDispute(networkSubgraph, disputeID)
  const slashedAmount = await contracts.disputeManager.getTokensToSlash(
    dispute.indexer.id,
  )
  const rewardsAmount = await contracts.disputeManager.getTokensToReward(
    dispute.indexer.id,
  )
  // TODO: print status
}

export const acceptDisputeCommand = {
  command: 'accept <disputeID>',
  describe: 'Accept dispute',
  builder: (yargs: Argv): Argv => {
    return yargs
      .option('account', {
        description: 'Ethereum account',
        type: 'string',
        required: true,
        group: 'Ethereum',
      })
      .positional('disputeID', { type: 'string' })
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const { provider, networkSubgraph, contracts } = await setupEnv(argv)

    const disputeID = argv.disputeID
    const sender = new Wallet(argv.account, provider)

    const dispute = await getDispute(networkSubgraph, disputeID)
    const slashedAmount = await contracts.disputeManager.getTokensToSlash(
      dispute.indexer.id,
    )
    const rewardsAmount = await contracts.disputeManager.getTokensToReward(
      dispute.indexer.id,
    )

    // TODO: show how much the indexer will be slashed
    // TODO: show the bond the fisherman will get
    // Confirm
    if (
      !(await askConfirm(
        `You are about to resolve dispute ${disputeID} as accepted, confirm?`,
      ))
    ) {
      process.exit(1)
    }

    // Dispute
    console.log(`Accepting dispute ${disputeID}...`)
    const tx = await contracts.disputeManager
      .connect(sender)
      .acceptDispute(disputeID)
    await waitTransaction(tx)
  },
}

export const rejectDisputeCommand = {
  command: 'reject <disputeID>',
  describe: 'Reject dispute',
  builder: (yargs: Argv): Argv => {
    return yargs
      .option('account', {
        description: 'Ethereum account',
        type: 'string',
        required: true,
        group: 'Ethereum',
      })
      .positional('disputeID', { type: 'string' })
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const { provider, networkSubgraph, contracts } = await setupEnv(argv)

    const disputeID = argv.disputeID
    const sender = new Wallet(argv.account, provider)

    await showDisputeResolution(networkSubgraph, contracts, disputeID)

    // TODO: show the fisherman bond returned
    // Confirm
    if (
      !(await askConfirm(
        `You are about to resolve dispute ${disputeID} as rejected, confirm?`,
      ))
    ) {
      process.exit(1)
    }

    // Dispute
    console.log(`Rejecting dispute ${disputeID}...`)
    const tx = await contracts.disputeManager
      .connect(sender)
      .rejectDispute(disputeID)
    await waitTransaction(tx)
  },
}
