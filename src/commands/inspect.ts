/* eslint-disable @typescript-eslint/no-explicit-any */

import { Argv } from 'yargs'

import { addDefaultArgOptions } from '../config'
import { log } from '../logging'
import { getAllocation } from '../model'

export const inspectCommand = {
  command: 'inspect <allocationID>',
  describe: 'Inspect allocation',
  builder: (yargs: Argv): Argv => {
    return addDefaultArgOptions(
      yargs.positional('allocationID', {
        description: 'Allocation ID',
        type: 'string',
      }),
    )
  },
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    // Parse arguments
    const { networkSubgraph } = argv.env
    const allocationID = argv.allocationID

    // Get dispute
    const allocation = await getAllocation(networkSubgraph, allocationID)
    log.info(JSON.stringify(allocation, null, 2))
  },
}
