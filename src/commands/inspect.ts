/* eslint-disable @typescript-eslint/no-explicit-any */

import treeify from 'treeify'
import { Argv } from 'yargs'
import { SubgraphDeploymentID } from '@graphprotocol/common-ts'

import { populateEntry } from '../dispute'
import { setupEnv } from '../env'
import { getAllocation } from '../model'
import { Poi } from '../poi'

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
    console.log(allocation)
  },
}
