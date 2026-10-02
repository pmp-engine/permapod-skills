import { getClients, queryContract, paginateAll, fetchPrices } from '../client'
import { MIN_USD_VALUE_THRESHOLD, DEFAULT_PAGE_LIMIT } from '../config'
import { denomLabel, formatAmount, formatPercent, formatUsd, printTable, computeUsdValue } from '../format'
import { MarketV2Response, AssetParams } from '../types'

export async function marketsCommand(network: 'mainnet' | 'testnet', json = false): Promise<any> {
  const { cosmwasm, addresses } = await getClients(network)

  // Fetch markets and asset params in parallel (independent queries)
  const [markets, assetParams] = await Promise.all([
    paginateAll<MarketV2Response>(
      async (startAfter) => queryContract(cosmwasm, addresses.redBank, {
        markets_v2: { limit: DEFAULT_PAGE_LIMIT, start_after: startAfter },
      }),
      (item) => item.denom,
    ),
    addresses.params
      ? paginateAll<AssetParams>(
          async (startAfter) => queryContract(cosmwasm, addresses.params, {
            all_asset_params_v2: { limit: DEFAULT_PAGE_LIMIT, start_after: startAfter },
          }),
          (item) => item.denom,
        ).catch((err) => {
          console.error(`Warning: Could not fetch asset params: ${err.message}`)
          return [] as AssetParams[]
        })
      : Promise.resolve([] as AssetParams[]),
  ])

  if (markets.length === 0) {
    if (json) return { network, markets: [] }
    console.log('No markets found.')
    return
  }

  const priceMap = await fetchPrices(cosmwasm, addresses.oracle, markets.map(m => m.denom))
  const paramsMap = new Map(assetParams.map(p => [p.denom, p]))

  // Filter + compute USD in one pass
  const activeRows: { market: MarketV2Response; supplyUsd: number }[] = []
  for (const m of markets) {
    const price = priceMap.get(m.denom)
    if (!price) continue
    const supplyUsd = computeUsdValue(m.collateral_total_amount, price, m.denom)
    if (supplyUsd >= MIN_USD_VALUE_THRESHOLD) {
      activeRows.push({ market: m, supplyUsd })
    }
  }

  if (activeRows.length === 0) {
    if (json) return { network, markets: [] }
    console.log('No active markets found (all below $10 threshold).')
    return
  }

  if (json) {
    return {
      network,
      markets: activeRows.map(({ market: m, supplyUsd }) => {
        const params = paramsMap.get(m.denom)
        return {
          asset: denomLabel(m.denom),
          denom: m.denom,
          totalSupply: m.collateral_total_amount,
          totalBorrow: m.debt_total_amount,
          supplyUsd,
          utilization: Number(m.utilization_rate),
          supplyApy: Number(m.liquidity_rate),
          borrowApy: Number(m.borrow_rate),
          maxLtv: params ? Number(params.max_loan_to_value) : null,
          liquidationThreshold: params ? Number(params.liquidation_threshold) : null,
        }
      }),
    }
  }

  console.log(`\nPerma Pod Markets (${network}) - ${activeRows.length} active assets`)

  const headers = ['Asset', 'Total Supply', 'Total Borrow', 'Supply USD', 'Utilization', 'Supply APY', 'Borrow APY', 'Max LTV', 'Liq Threshold']
  const rows = activeRows.map(({ market: m, supplyUsd }) => {
    const params = paramsMap.get(m.denom)
    return [
      denomLabel(m.denom),
      formatAmount(m.collateral_total_amount, m.denom),
      formatAmount(m.debt_total_amount, m.denom),
      formatUsd(supplyUsd),
      formatPercent(m.utilization_rate),
      formatPercent(m.liquidity_rate),
      formatPercent(m.borrow_rate),
      params ? formatPercent(params.max_loan_to_value) : 'N/A',
      params ? formatPercent(params.liquidation_threshold) : 'N/A',
    ]
  })

  printTable(headers, rows)
}
