/* eslint-disable @typescript-eslint/no-explicit-any */

import yargs, { Argv } from 'yargs'

import { DisputeResolver } from '../resolver'

export const acceptDisputeCommand = {
  command: 'accept <disputeID>',
  describe: 'Accept dispute',
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
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const resolver = new DisputeResolver(argv.env)
    await resolver.reject(argv.disputeID, argv.execute)
  },
}

export const resolveCommand = {
  command: 'resolve',
  describe: 'Resolve dispute',
  builder: (yargs: Argv): Argv => {
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
      .command(acceptDisputeCommand)
      .command(drawDisputeCommand)
      .command(rejectDisputeCommand)
  },
  handler: async (): Promise<void> => {
    yargs.showHelp()
  },
}
