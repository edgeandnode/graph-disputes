import { join } from 'path'
import { homedir } from 'os'
import fs from 'fs'

export const DEFAULT_CONFIG_NAME = '.graph-disputes'
export const DEFAULT_CONFIG_PATH = join(homedir(), DEFAULT_CONFIG_NAME)

interface Config {
  ethereum: string
  ethereumNetwork: string
  networkSubgraphEndpoint: string
  trustedSubgraphEndpoint: string
}

export const initConfig = (config: Config): void => {
  const value = JSON.stringify(config)
  fs.writeFileSync(DEFAULT_CONFIG_PATH, value, { flag: 'w' })
}

export const loadConfig = (): Config | null => {
  try {
    return JSON.parse(fs.readFileSync(DEFAULT_CONFIG_PATH).toString())
  } catch {
    return null
  }
}
