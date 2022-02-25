/* eslint-disable @typescript-eslint/no-explicit-any */

import yargs, { Argv } from 'yargs'
import { NetworkContracts } from '@graphprotocol/common-ts'

import { addDefaultArgOptions } from '../config'
import { log } from '../logging'
import { DisputeResolver } from '../resolver'

const resolveCmdBuilder = (yargs: Argv): Argv => {
  return yargs
    .option('account', {
      description: 'Ethereum account',
      type: 'string',
      demandOption: false,
      requiresArg: true,
      group: 'Ethereum',
    })
    .option('execute', {
      description: 'Execute the transaction',
      type: 'boolean',
      demandOption: false,
      requiresArg: false,
      default: false,
    })
    .positional('disputeID', { type: 'string' })
}

export const acceptDisputeCommand = {
  command: 'accept <disputeID>',
  describe: 'Accept dispute',
  builder: resolveCmdBuilder,
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const resolver = new DisputeResolver(argv.env)
    await resolver.accept(argv.disputeID, argv.execute)
  },
}

export const drawDisputeCommand = {
  command: 'draw <disputeID>',
  describe: 'Draw dispute',
  builder: resolveCmdBuilder,
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const resolver = new DisputeResolver(argv.env)
    await resolver.draw(argv.disputeID, argv.execute)
  },
}

export const rejectDisputeCommand = {
  command: 'reject <disputeID>',
  describe: 'Reject dispute',
  builder: resolveCmdBuilder,
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const resolver = new DisputeResolver(argv.env)
    await resolver.reject(argv.disputeID, argv.execute)
  },
}

export const verifyDisputeCommand = {
  command: 'verify <payload>',
  describe: 'Verify transaction payload that resolves a dispute',
  builder: (yargs: Argv): Argv => {
    return yargs.positional('payload', { type: 'string' })
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const contracts: NetworkContracts = argv.env.contracts

    log.info(`Decoding: ${argv.payload}`)
    log.info('--------')

    try {
      const call = contracts.disputeManager.interface.parseTransaction({
        data: argv.payload,
      })
      log.info(`> Resolve: ${call.signature} (${call.sighash})`)
      log.info(`> Dispute: ${call.args}`)
    } catch (err) {
      log.error(`ERROR: ${err.reason}`)
    }
  },
}

export const resolveCommand = {
  command: 'resolve',
  describe: 'Resolve dispute',
  builder: (yargs: Argv): Argv => {
    return addDefaultArgOptions(
      yargs
        .command(acceptDisputeCommand)
        .command(drawDisputeCommand)
        .command(rejectDisputeCommand)
        .command(verifyDisputeCommand),
    )
  },
  handler: async (): Promise<void> => {
    yargs.showHelp()
  },
}
