/* eslint-disable @typescript-eslint/no-explicit-any */

import treeify from 'treeify'
import { Argv } from 'yargs'

import { populateEntry } from '../dispute'
import { setupEnv } from '../env'
import { getDisputes } from '../model'

export const listCommand = {
  command: 'list',
  describe: 'List disputes',
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    const env = await setupEnv(argv)

    // Get disputes to list
    const data = {}
    const disputes = await getDisputes(env.networkSubgraph)
    console.log(disputes.length, 'disputes found')

    // Process each dispute and populate additional information
    for (const dispute of disputes) {
      const disputeEntry = await populateEntry(dispute, env, false)
      data[dispute.id] = disputeEntry
    }

    // Display disputes
    console.log('Disputes')
    console.log('--------')
    console.log(treeify.asTree(data, true, true))
  },
}
