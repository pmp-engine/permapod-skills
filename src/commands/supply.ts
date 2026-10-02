import { getClients, queryContract, paginateAll, fetchPrices } from '../client'
import { MIN_USD_VALUE_THRESHOLD, DEFAULT_PAGE_LIMIT } from '../config'
import { denomLabel, formatAmount, formatUsd, printTable, computeUsdValue } from '../format'
import { TotalDepositResponse } from '../types'

export async function supplyCommand(network: 'mainnet' | 'testnet', json = false): Promise<any> {
  const { cosmwasm, addresses } = await getClients(network)

  const deposits = await paginateAll<TotalDepositResponse>(
    async (startAfter) => queryContract(cosmwasm, addresses.params, {
      all_total_deposits_v2: { limit: DEFAULT_PAGE_LIMIT, start_after: startAfter },
    }),
    (item) => item.denom,
  )

  const priceMap = await fetchPrices(cosmwasm, addresses.oracle, deposits.map(d => d.denom))

  // Filter + compute in one pass
  const activeRows: { deposit: TotalDepositResponse; usdValue: number }[] = []
  for (const d of deposits) {
    const price = priceMap.get(d.denom)
    if (!price) continue
    const usdValue = computeUsdValue(d.amount, price, d.denom)
    if (usdValue >= MIN_USD_VALUE_THRESHOLD) {
      activeRows.push({ deposit: d, usdValue })
    }
  }

  if (activeRows.length === 0) {
    if (json) return { network, deposits: [] }
    console.log('No active deposits found.')
    return
  }

  if (json) {
    return {
      network,
      deposits: activeRows.map(({ deposit: d, usdValue }) => ({
        asset: denomLabel(d.denom),
        denom: d.denom,
        amount: d.amount,
        cap: d.cap,
        capUsedPct: Number(d.cap) > 0 ? (Number(d.amount) / Number(d.cap)) * 100 : 0,
        remaining: Number(d.cap) > 0 ? (Number(d.cap) - Number(d.amount)).toString() : '0',
        usdValue,
      })),
    }
  }

  console.log(`\nTotal Supply Overview (${network})`)

  const headers = ['Asset', 'Deposited', 'Cap', 'Cap Used', 'Remaining', 'Value (USD)']
  const rows = activeRows.map(({ deposit: d, usdValue }) => {
    const capUsed = Number(d.cap) > 0
      ? ((Number(d.amount) / Number(d.cap)) * 100).toFixed(1)
      : '0.0'
    const remaining = Number(d.cap) > 0
      ? (Number(d.cap) - Number(d.amount)).toString()
      : '0'

    return [
      denomLabel(d.denom),
      formatAmount(d.amount, d.denom),
      formatAmount(d.cap, d.denom),
      `${capUsed}%`,
      formatAmount(remaining, d.denom),
      formatUsd(usdValue),
    ]
  })

  printTable(headers, rows)
}
