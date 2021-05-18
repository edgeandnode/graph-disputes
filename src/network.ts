import { BigNumber, ContractTransaction, Signer, providers } from 'ethers'
import { GraphToken } from '@graphprotocol/contracts/dist/types/GraphToken'

export const approveIfRequired = async (
  token: GraphToken,
  sender: Signer,
  spender: string,
  amount: BigNumber,
): Promise<providers.TransactionReceipt> | null => {
  const owner = await sender.getAddress()
  const allowance = await token.allowance(owner, spender)
  if (allowance.lt(amount)) {
    const tx = await token.connect(sender).approve(spender, amount)
    return waitTransaction(tx)
  }
  return null
}

export const waitTransaction = async (
  tx: ContractTransaction,
): Promise<providers.TransactionReceipt> => {
  console.log(`Transaction sent: ${tx.hash}`)
  const receipt = await tx.wait()
  receipt.status
    ? console.log(`Transaction succeeded: ${tx.hash}`)
    : console.log(`Transaction failed: ${tx.hash}`)
  return receipt
}
