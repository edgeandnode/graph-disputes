/* eslint-disable @typescript-eslint/no-explicit-any */

import { Argv } from 'yargs'

import { log } from '../logging'
import { setupEnv } from '../env'
import { getAllocation } from '../model'

export const inspectCommand = {
  command: 'inspect <allocationID>',
  describe: 'Inspect allocation',
  builder: (yargs: Argv): Argv => {
    return yargs.positional('allocationID', {
      description: 'Allocation ID',
      type: 'string',
    })
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const env = await setupEnv(argv)

    // Parse arguments
    const allocationID = argv.allocationID

    // Get dispute
    const allocation = await getAllocation(env.networkSubgraph, allocationID)
    log.info(JSON.stringify(allocation, null, 2))
  },
}
