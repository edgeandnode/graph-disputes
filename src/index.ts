import { basename } from 'path'
import yargs, { Argv } from 'yargs'
import fs from 'fs'
import findUp from 'find-up'

import { DEFAULT_CONFIG_NAME } from './config'
import { setupEnv } from './env'

import { setupCommand } from './commands/setup'
import { createCommand } from './commands/create'
import { resolveCommand } from './commands/resolve'
import { listCommand } from './commands/list'
import { showCommand } from './commands/show'
import { inspectCommand } from './commands/inspect'

yargs.middleware(async argv => {
  return { env: await setupEnv(argv) }
})

yargs
  .scriptName('graph-disputes')
  .env('GRAPH_DISPUTES')
  .config('config', function (configName) {
    const configPath = findUp.sync(basename(configName))
    return configPath ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : {}
  })
  .default('config', DEFAULT_CONFIG_NAME)
  .command(setupCommand)
  .command({
    command: 'dispute',
    describe: 'Dispute management',
    builder: (yargs: Argv): Argv => {
      return yargs
        .option('ethereum', {
          description: 'Ethereum node or provider URL',
          type: 'string',
          required: true,
          group: 'Ethereum',
        })
        .option('ethereum-network', {
          description: 'Ethereum network',
          type: 'string',
          required: false,
          default: 'mainnet',
          group: 'Ethereum',
        })
        .option('network-subgraph-endpoint', {
          description: 'Endpoint to query the network subgraph from',
          type: 'string',
          required: true,
          group: 'Network Subgraph',
        })
        .option('trusted-subgraph-endpoint', {
          description: 'Endpoint to query the trusted indexing proofs',
          type: 'string',
          required: true,
          group: 'Trusted Subgraph',
        })
        .option('log-level', {
          description: 'Log level',
          type: 'string',
          default: 'debug',
          group: 'Logging',
        })
        .command(createCommand)
        .command(listCommand)
        .command(showCommand)
        .command(resolveCommand)
        .command(inspectCommand)
        .demandCommand(1, 'Choose a command from the above list')
    },
    handler: async (): Promise<void> => {
      yargs.showHelp()
    },
  })
  .help().argv
