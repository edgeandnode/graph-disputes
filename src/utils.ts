import inquirer from 'inquirer'
import { BigNumber, utils } from 'ethers'

const { formatUnits } = utils

export const askConfirm = async (message: string): Promise<boolean> => {
  const res = await inquirer.prompt({
    name: 'confirm',
    type: 'confirm',
    message,
  })
  return res.confirm
}

export const toGRT = (value: BigNumber): string => {
  return formatUnits(value)
}
