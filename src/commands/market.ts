import { getClients, queryContract, fetchPrices } from '../client'
import { denomLabel, formatAmount, formatPercent, formatPrice, formatUsd, printSection, computeUsdValue } from '../format'
import { MarketV2Response, AssetParams, TotalDepositResponse } from '../types'

export async function marketCommand(denom: string, network: 'mainnet' | 'testnet', json = false): Promise<any> {
  const { cosmwasm, addresses } = await getClients(network)

  const [market, priceMap, params, totalDeposit] = await Promise.all([
    queryContract<MarketV2Response>(cosmwasm, addresses.redBank, { market_v2: { denom } }),
    fetchPrices(cosmwasm, addresses.oracle, [denom]),
    addresses.params
      ? queryContract<AssetParams | null>(cosmwasm, addresses.params, { asset_params: { denom } }).catch((err) => {
          console.error(`Warning: Could not fetch asset params: ${err.message}`)
          return null
        })
      : Promise.resolve(null),
    addresses.params
      ? queryContract<TotalDepositResponse>(cosmwasm, addresses.params, { total_deposit: { denom } }).catch((err) => {
          console.error(`Warning: Could not fetch total deposit: ${err.message}`)
          return null
        })
      : Promise.resolve(null),
  ])

  const priceStr = priceMap.get(denom) || '0'
  const supplyUsd = computeUsdValue(market.collateral_total_amount, priceStr, denom)
  const borrowUsd = computeUsdValue(market.debt_total_amount, priceStr, denom)

  if (json) {
    return {
      denom,
      asset: denomLabel(denom),
      network,
      price: Number(priceStr),
      totalSupply: market.collateral_total_amount,
      totalBorrow: market.debt_total_amount,
      supplyUsd,
      borrowUsd,
      utilization: Number(market.utilization_rate),
      supplyApy: Number(market.liquidity_rate),
      borrowApy: Number(market.borrow_rate),
      reserveFactor: Number(market.reserve_factor),
      interestRateModel: {
        base: Number(market.interest_rate_model.base),
        optimalUtilization: Number(market.interest_rate_model.optimal_utilization_rate),
        slope1: Number(market.interest_rate_model.slope_1),
        slope2: Number(market.interest_rate_model.slope_2),
      },
      params: params ? {
        maxLtv: Number(params.max_loan_to_value),
        liquidationThreshold: Number(params.liquidation_threshold),
        closeFactor: Number(params.close_factor),
        depositCap: params.deposit_cap,
        depositEnabled: params.red_bank.deposit_enabled,
        borrowEnabled: params.red_bank.borrow_enabled,
        withdrawEnabled: params.red_bank.withdraw_enabled,
        cmWhitelisted: params.credit_manager.whitelisted,
      } : null,
      totalDeposit: totalDeposit ? {
        amount: totalDeposit.amount,
        cap: totalDeposit.cap,
        capUsedPct: Number(totalDeposit.cap) > 0
          ? (Number(totalDeposit.amount) / Number(totalDeposit.cap)) * 100
          : 0,
      } : null,
    }
  }

  console.log(`\n=== ${denomLabel(denom)} Market Detail ===`)

  printSection('Market State', [
    ['Total Supply', `${formatAmount(market.collateral_total_amount, denom)} (${formatUsd(supplyUsd)})`],
    ['Total Borrow', `${formatAmount(market.debt_total_amount, denom)} (${formatUsd(borrowUsd)})`],
    ['Utilization', formatPercent(market.utilization_rate)],
    ['Supply APY', formatPercent(market.liquidity_rate)],
    ['Borrow APY', formatPercent(market.borrow_rate)],
    ['Reserve Factor', formatPercent(market.reserve_factor)],
  ])

  if (priceStr !== '0') {
    printSection('Oracle Price', [
      ['Price', formatPrice(priceStr)],
      ['Denom', denom],
    ])
  }

  printSection('Interest Rate Model', [
    ['Base Rate', formatPercent(market.interest_rate_model.base)],
    ['Optimal Utilization', formatPercent(market.interest_rate_model.optimal_utilization_rate)],
    ['Slope 1', formatPercent(market.interest_rate_model.slope_1)],
    ['Slope 2', formatPercent(market.interest_rate_model.slope_2)],
  ])

  if (params) {
    printSection('Risk Parameters', [
      ['Max LTV', formatPercent(params.max_loan_to_value)],
      ['Liquidation Threshold', formatPercent(params.liquidation_threshold)],
      ['Close Factor', formatPercent(params.close_factor)],
      ['Deposit Cap', formatAmount(params.deposit_cap, denom)],
      ['Deposit Enabled', params.red_bank.deposit_enabled ? 'Yes' : 'No'],
      ['Borrow Enabled', params.red_bank.borrow_enabled ? 'Yes' : 'No'],
      ['Withdraw Enabled', params.red_bank.withdraw_enabled ? 'Yes' : 'No'],
      ['CM Whitelisted', params.credit_manager.whitelisted ? 'Yes' : 'No'],
    ])
  }

  if (totalDeposit) {
    const capUsedPct = Number(totalDeposit.cap) > 0
      ? ((Number(totalDeposit.amount) / Number(totalDeposit.cap)) * 100).toFixed(2)
      : '0.00'
    printSection('Total Deposit (Red Bank + Credit Manager)', [
      ['Total Deposited', formatAmount(totalDeposit.amount, denom)],
      ['Cap', formatAmount(totalDeposit.cap, denom)],
      ['Cap Used', `${capUsedPct}%`],
    ])
  }

  console.log('')
}
