import { basename } from 'path'
import yargs from 'yargs'
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
  if (argv._[0] !== 'setup') {
    return { env: await setupEnv(argv) }
  }
  return {}
})

yargs
  .scriptName('graph-disputes')
  .env('GRAPH_DISPUTES')
  .default('config', DEFAULT_CONFIG_NAME)
  .config('config', function (configName) {
    const configPath = findUp.sync(basename(configName))
    try {
      return configPath ? JSON.parse(fs.readFileSync(configPath, 'utf-8')) : {}
    } catch (e) {
      return {}
    }
  })
  .command(setupCommand)
  .command(createCommand)
  .command(listCommand)
  .command(showCommand)
  .command(resolveCommand)
  .command(inspectCommand)
  .demandCommand(1, 'Choose a command from the above list')
  .help().argv
