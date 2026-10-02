import { getClients, queryContract, paginateAll, fetchPrices } from '../client'
import { MIN_USD_VALUE_THRESHOLD, DEFAULT_PAGE_LIMIT } from '../config'
import { denomLabel, formatUsd, printTable, printSection, computeUsdValue } from '../format'
import { MarketV2Response } from '../types'

export async function dashboardCommand(network: 'mainnet' | 'testnet', json = false): Promise<any> {
  const { cosmwasm, addresses } = await getClients(network)

  const markets = await paginateAll<MarketV2Response>(
    async (startAfter) => queryContract(cosmwasm, addresses.redBank, {
      markets_v2: { limit: DEFAULT_PAGE_LIMIT, start_after: startAfter },
    }),
    (item) => item.denom,
  )

  const priceMap = await fetchPrices(cosmwasm, addresses.oracle, markets.map(m => m.denom))

  let totalTvl = 0
  let totalBorrowed = 0
  let weightedSupplyApy = 0
  let weightedBorrowApy = 0

  const assetBreakdown: { label: string; denom: string; tvl: number; borrowed: number; supplyApy: number; borrowApy: number; price: number }[] = []

  for (const m of markets) {
    const price = priceMap.get(m.denom)
    if (!price) continue
    const tvl = computeUsdValue(m.collateral_total_amount, price, m.denom)
    if (tvl < MIN_USD_VALUE_THRESHOLD) continue

    const borrowed = computeUsdValue(m.debt_total_amount, price, m.denom)

    totalTvl += tvl
    totalBorrowed += borrowed
    weightedSupplyApy += tvl * Number(m.liquidity_rate)
    weightedBorrowApy += borrowed * Number(m.borrow_rate)

    assetBreakdown.push({
      label: denomLabel(m.denom),
      denom: m.denom,
      tvl,
      borrowed,
      supplyApy: Number(m.liquidity_rate),
      borrowApy: Number(m.borrow_rate),
      price: Number(price),
    })
  }

  const avgSupplyApy = totalTvl > 0 ? (weightedSupplyApy / totalTvl) : 0
  const avgBorrowApy = totalBorrowed > 0 ? (weightedBorrowApy / totalBorrowed) : 0
  const utilization = totalTvl > 0 ? totalBorrowed / totalTvl : 0

  if (json) {
    return {
      network,
      tvl: totalTvl,
      totalBorrowed,
      availableLiquidity: totalTvl - totalBorrowed,
      utilization,
      avgSupplyApy,
      avgBorrowApy,
      activeMarkets: assetBreakdown.length,
      markets: assetBreakdown,
    }
  }

  console.log(`\n========================================`)
  console.log(`  Perma Pod Protocol Dashboard (${network})`)
  console.log(`========================================`)

  printSection('Protocol Overview', [
    ['Total Value Locked', formatUsd(totalTvl)],
    ['Total Borrowed', formatUsd(totalBorrowed)],
    ['Available Liquidity', formatUsd(totalTvl - totalBorrowed)],
    ['Overall Utilization', `${(utilization * 100).toFixed(2)}%`],
    ['Avg Supply APY (weighted)', `${(avgSupplyApy * 100).toFixed(2)}%`],
    ['Avg Borrow APY (weighted)', `${(avgBorrowApy * 100).toFixed(2)}%`],
    ['Active Markets', `${assetBreakdown.length}`],
  ])

  const headers = ['Asset', 'Price', 'TVL (USD)', 'Borrowed (USD)', 'Supply APY', 'Borrow APY']
  const rows = assetBreakdown.map(a => [
    a.label,
    `$${a.price.toFixed(4)}`,
    formatUsd(a.tvl),
    formatUsd(a.borrowed),
    `${(a.supplyApy * 100).toFixed(2)}%`,
    `${(a.borrowApy * 100).toFixed(2)}%`,
  ])

  printTable(headers, rows)
}
