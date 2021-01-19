/* eslint-disable @typescript-eslint/no-explicit-any */

import Table from 'cli-table'
import chalk from 'chalk'
import { Argv } from 'yargs'

import { setupEnv } from '../env'
import { getDispute } from '../model'

export const showCommand = {
  command: 'show <id>',
  describe: 'Show arbitration dispute',
  builder: (yargs: Argv): Argv => {
    return yargs.positional('id', { type: 'string' })
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const { contracts, networkSubgraph } = await setupEnv(argv)

    const dispute = await getDispute(networkSubgraph, argv.id)
    console.log(dispute)
  },
}
