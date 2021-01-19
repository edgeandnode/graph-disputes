import { BigNumber, Signer } from 'ethers'
import { GraphToken } from '@graphprotocol/contracts/dist/typechain/contracts/GraphToken'

export const approveIfRequired = async (
  token: GraphToken,
  sender: Signer,
  spender: string,
  amount: BigNumber,
): Promise<void> => {
  const owner = await sender.getAddress()
  const allowance = await token.allowance(owner, spender)
  if (allowance.lt(amount)) {
    await token.connect(sender).approve(spender, amount)
  }
}
