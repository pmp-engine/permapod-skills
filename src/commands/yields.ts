import { getClients, queryContract, paginateAll, fetchPrices } from '../client'
import { MIN_USD_VALUE_THRESHOLD, DEFAULT_PAGE_LIMIT } from '../config'
import { denomLabel, formatPercent, printTable, computeUsdValue } from '../format'
import { MarketV2Response, ActiveEmission } from '../types'

export async function yieldsCommand(network: 'mainnet' | 'testnet', json = false): Promise<any> {
  const { cosmwasm, addresses } = await getClients(network)

  const markets = await paginateAll<MarketV2Response>(
    async (startAfter) => queryContract(cosmwasm, addresses.redBank, {
      markets_v2: { limit: DEFAULT_PAGE_LIMIT, start_after: startAfter },
    }),
    (item) => item.denom,
  )

  const priceMap = await fetchPrices(cosmwasm, addresses.oracle, markets.map(m => m.denom))

  const activeMarkets = markets.filter(m => {
    const price = priceMap.get(m.denom)
    if (!price) return false
    return computeUsdValue(m.collateral_total_amount, price, m.denom) >= MIN_USD_VALUE_THRESHOLD
  })

  // Fetch all emissions in parallel
  const emissionResults = await Promise.allSettled(
    activeMarkets.map(async (m) => {
      const emissions: ActiveEmission[] = await queryContract(cosmwasm, addresses.incentives, {
        active_emissions: { denom: m.denom, kind: 'red_bank' },
      })
      return { denom: m.denom, emissions }
    }),
  )

  const emissionsMap: Record<string, ActiveEmission[]> = {}
  for (const r of emissionResults) {
    if (r.status === 'fulfilled' && r.value.emissions.length > 0) {
      emissionsMap[r.value.denom] = r.value.emissions
    }
  }

  if (json) {
    return {
      network,
      yields: activeMarkets.map(m => ({
        asset: denomLabel(m.denom),
        denom: m.denom,
        supplyApy: Number(m.liquidity_rate),
        borrowApy: Number(m.borrow_rate),
        emissions: emissionsMap[m.denom]?.map(e => ({
          rewardDenom: e.denom,
          rewardAsset: denomLabel(e.denom),
          emissionRate: e.emission_rate,
        })) || [],
      })),
    }
  }

  console.log(`\nYield Overview (${network})`)

  const headers = ['Asset', 'Supply APY', 'Borrow APY']
  const rows = activeMarkets.map(m => [
    denomLabel(m.denom),
    formatPercent(m.liquidity_rate),
    formatPercent(m.borrow_rate),
  ])

  printTable(headers, rows)

  console.log('Active Incentive Emissions:')
  let hasEmissions = false
  for (const r of emissionResults) {
    if (r.status === 'fulfilled' && r.value.emissions.length > 0) {
      hasEmissions = true
      console.log(`  ${denomLabel(r.value.denom)}:`)
      r.value.emissions.forEach(e => {
        console.log(`    Reward: ${denomLabel(e.denom)} @ ${e.emission_rate}/sec`)
      })
    }
  }

  if (!hasEmissions) {
    console.log('  No active incentive emissions found.')
  }
  console.log('')
}
