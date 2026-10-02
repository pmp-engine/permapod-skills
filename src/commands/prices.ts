import { getClients, queryContract, paginateAll, fetchPrices } from '../client'
import { MIN_USD_VALUE_THRESHOLD, DEFAULT_PAGE_LIMIT } from '../config'
import { denomLabel, formatPrice, printTable, computeUsdValue } from '../format'
import { MarketV2Response } from '../types'

export async function pricesCommand(network: 'mainnet' | 'testnet', json = false): Promise<any> {
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

  if (activeMarkets.length === 0) {
    if (json) return { network, prices: [] }
    console.log('No active asset prices found.')
    return
  }

  if (json) {
    return {
      network,
      prices: activeMarkets.map(m => ({
        asset: denomLabel(m.denom),
        denom: m.denom,
        price: Number(priceMap.get(m.denom) || '0'),
      })),
    }
  }

  console.log(`\nOracle Prices (${network})`)

  const headers = ['Asset', 'Denom', 'Price (USD)']
  const rows = activeMarkets.map(m => {
    const price = priceMap.get(m.denom) || '0'
    return [
      denomLabel(m.denom),
      m.denom.length > 20 ? `${m.denom.slice(0, 12)}...${m.denom.slice(-6)}` : m.denom,
      formatPrice(price),
    ]
  })

  printTable(headers, rows)
}

export async function priceCommand(denom: string, network: 'mainnet' | 'testnet', json = false): Promise<any> {
  const { cosmwasm, addresses } = await getClients(network)

  const priceMap = await fetchPrices(cosmwasm, addresses.oracle, [denom])
  const price = priceMap.get(denom)

  if (!price) {
    throw new Error(`No price source found for ${denomLabel(denom)} (${denom})`)
  }

  if (json) {
    return {
      asset: denomLabel(denom),
      denom,
      network,
      price: Number(price),
    }
  }

  console.log(`\n${denomLabel(denom)} Price: ${formatPrice(price)}`)
  console.log(`  Denom: ${denom}`)
  console.log('')
}
