import { Argv } from 'yargs'

import { initConfig } from '../config'

export const setupCommand = {
  command: 'setup',
  describe: 'Setup config',
  handler: async (
    argv: { [key: string]: any } & Argv['argv'],
  ): Promise<void> => {
    initConfig({
      ethereum: 'coso1',
      ethereumNetwork: 'coso2',
      networkSubgraphEndpoint: 'coso3',
      trustedSubgraphEndpoint: 'coso4',
    })
  },
}
