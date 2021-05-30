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
    await resolver.accept(argv.disputeID)
  },
}

export const drawDisputeCommand = {
  command: 'draw <disputeID>',
  describe: 'Draw dispute',
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const resolver = new DisputeResolver(argv.env)
    await resolver.draw(argv.disputeID)
  },
}

export const rejectDisputeCommand = {
  command: 'reject <disputeID>',
  describe: 'Reject dispute',
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const resolver = new DisputeResolver(argv.env)
    await resolver.reject(argv.disputeID)

    // TODO: initiate a gnosis transaction for signing
    // TODO: print raw data
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
        required: true,
        group: 'Ethereum',
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
