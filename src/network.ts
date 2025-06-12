import { Signer, TransactionReceipt, TransactionResponse } from 'ethers'
import { IGraphToken } from '@graphprotocol/horizon'

import { log } from './logging'

export const approveIfRequired = async (
  token: IGraphToken,
  sender: Signer,
  spender: string,
  amount: bigint,
): Promise<TransactionReceipt | null> => {
  const owner = await sender.getAddress()
  const allowance = await token.allowance(owner, spender)
  if (allowance < amount) {
    const tx = await token.connect(sender).approve(spender, amount)
    return waitTransaction(tx)
  }
  return null
}

export const waitTransaction = async (
  tx: TransactionResponse,
): Promise<TransactionReceipt> => {
  log.info(`Transaction sent: ${tx.hash}`)
  const receipt = await tx.wait()
  receipt.status
    ? log.info(`Transaction succeeded: ${tx.hash}`)
    : log.info(`Transaction failed: ${tx.hash}`)
  return receipt
}
