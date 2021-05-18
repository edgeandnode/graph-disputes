import fs from 'fs'
import YAML from 'yaml'

interface Config {
  ethereum: string
  ethereumNetwork: string
  networkSubgraphEndpoint: string
  trustedSubgraphEndpoint: string
}

export const initConfig = (config: Config): void => {
  const value = YAML.stringify(config)
  fs.writeFileSync('~.graph-disputes', value)
}
