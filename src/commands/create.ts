// function createIndexingDispute(address _allocationID, uint256 _deposit)

/* eslint-disable @typescript-eslint/no-explicit-any */

import Table from 'cli-table'
import chalk from 'chalk'
import { Wallet } from 'ethers'
import yargs, { Argv } from 'yargs'
import { parseGRT } from '@graphprotocol/common-ts'

import { setupEnv } from '../env'
import { approveIfRequired } from '../network'

export const createIndexingCommand = {
  command: 'indexing <allocationID> <deposit>',
  describe: 'Create indexing dispute',
  builder: (yargs: Argv): Argv => {
    return yargs
      .option('account', {
        description: 'Ethereum account',
        type: 'string',
        required: true,
        group: 'Ethereum',
      })
      .positional('allocationID', { type: 'string' })
      .positional('deposit', { type: 'string' })
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const { provider, contracts } = await setupEnv(argv)

    const allocationID = argv.allocationID
    const depositWei = parseGRT(argv.deposit)
    const sender = new Wallet(argv.account, provider)

    await approveIfRequired(
      contracts.token,
      sender,
      contracts.disputeManager.address,
      depositWei,
    )
    const tx = await contracts.disputeManager
      .connect(sender)
      .createIndexingDispute(allocationID, depositWei)
    await tx.wait()
  },
}

export const createCommand = {
  command: 'create',
  describe: 'Create dispute',
  builder: (yargs: Argv): Argv => {
    return yargs.command(createIndexingCommand)
  },
  handler: async (): Promise<void> => {
    yargs.showHelp()
  },
}
