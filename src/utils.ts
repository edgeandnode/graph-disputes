import inquirer from 'inquirer'
import chalk from 'chalk'
import { formatUnits } from 'ethers'

export const treeifyFormat = {
  joined: true,
  spacerNoNeighbour: '   ',
  spacerNeighbour: chalk.gray('│  '),
  keyNoNeighbour: chalk.gray('└─ '),
  keyNeighbour: chalk.gray('├─ '),
  sortFn: null,
}

export const askConfirm = async (message: string): Promise<boolean> => {
  const res = await inquirer.prompt({
    name: 'confirm',
    type: 'confirm',
    message,
  })
  return res.confirm
}

export const toGRT = (value: bigint): string => {
  return formatUnits(value)
}
