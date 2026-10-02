import { getClients, queryContract, paginateArray, fetchPrices } from '../client'
import { DEFAULT_PAGE_LIMIT } from '../config'
import { denomLabel, formatAmount, formatUsd, printTable, computeUsdValue } from '../format'
import { Coin } from '../types'

export async function rewardsCommand(address: string, network: 'mainnet' | 'testnet', json = false): Promise<any> {
  const { cosmwasm, addresses } = await getClients(network)

  const rewards = await paginateArray<Coin>(
    async (startAfter) => queryContract(cosmwasm, addresses.incentives, {
      user_unclaimed_rewards: { user: address, limit: DEFAULT_PAGE_LIMIT, start_after: startAfter },
    }),
    (item) => item.denom,
  )

  const activeRewards = rewards.filter(r => Number(r.amount) > 0)

  if (activeRewards.length === 0) {
    if (json) return { address, network, rewards: [] }
    console.log(`\nNo unclaimed rewards for ${address}`)
    return
  }

  const priceMap = await fetchPrices(cosmwasm, addresses.oracle, activeRewards.map(r => r.denom))

  const rewardData = activeRewards.map(r => {
    const price = priceMap.get(r.denom) || '0'
    return {
      asset: denomLabel(r.denom),
      denom: r.denom,
      amount: r.amount,
      usd: computeUsdValue(r.amount, price, r.denom),
    }
  })

  if (json) {
    return { address, network, rewards: rewardData }
  }

  console.log(`\nUnclaimed Rewards for ${address}`)

  const headers = ['Reward Token', 'Amount', 'Value (USD)']
  const rows = rewardData.map(r => [r.asset, formatAmount(r.amount, r.denom), formatUsd(r.usd)])

  printTable(headers, rows)
}
