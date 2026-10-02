import { getClients, queryContract, paginateArray, fetchPrices } from '../client'
import { DEFAULT_PAGE_LIMIT } from '../config'
import { denomLabel, formatAmount, formatUsd, printTable, printSection, computeUsdValue } from '../format'
import { UserCollateralResponse, UserDebtResponse, UserPositionResponse } from '../types'

export async function walletCommand(address: string, network: 'mainnet' | 'testnet', json = false): Promise<any> {
  const { cosmwasm, addresses } = await getClients(network)

  const [collaterals, debts, position] = await Promise.all([
    paginateArray<UserCollateralResponse>(
      async (startAfter) => queryContract(cosmwasm, addresses.redBank, {
        user_collaterals: { user: address, limit: DEFAULT_PAGE_LIMIT, start_after: startAfter },
      }),
      (item) => item.denom,
    ),
    paginateArray<UserDebtResponse>(
      async (startAfter) => queryContract(cosmwasm, addresses.redBank, {
        user_debts: { user: address, limit: DEFAULT_PAGE_LIMIT, start_after: startAfter },
      }),
      (item) => item.denom,
    ),
    queryContract<UserPositionResponse>(cosmwasm, addresses.redBank, {
      user_position: { user: address },
    }),
  ])

  const allDenoms = [...new Set([...collaterals.map(c => c.denom), ...debts.map(d => d.denom)])]
  const priceMap = await fetchPrices(cosmwasm, addresses.oracle, allDenoms)

  const activeCollaterals = collaterals.filter(c => Number(c.amount) > 0)
  const activeDebts = debts.filter(d => Number(d.amount) > 0)

  const collateralData = activeCollaterals.map(c => {
    const price = priceMap.get(c.denom) || '0'
    return {
      asset: denomLabel(c.denom),
      denom: c.denom,
      amount: c.amount,
      usd: computeUsdValue(c.amount, price, c.denom),
      enabled: c.enabled,
    }
  })

  const debtData = activeDebts.map(d => {
    const price = priceMap.get(d.denom) || '0'
    return {
      asset: denomLabel(d.denom),
      denom: d.denom,
      amount: d.amount,
      usd: computeUsdValue(d.amount, price, d.denom),
    }
  })

  let health: any
  if (position.health_status === 'not_borrowing') {
    health = { status: 'not_borrowing' }
  } else {
    const hf = position.health_status.borrowing
    const liqHf = Number(hf.liq_threshold_hf)
    health = {
      status: 'borrowing',
      maxLtvHf: Number(hf.max_ltv_hf),
      liquidationHf: liqHf,
      riskLevel: liqHf < 1.1 ? 'HIGH' : liqHf < 1.5 ? 'MEDIUM' : 'SAFE',
    }
  }

  if (json) {
    return { address, network, health, collaterals: collateralData, debts: debtData }
  }

  console.log(`\n=== Wallet: ${address} ===`)

  if (health.status === 'not_borrowing') {
    printSection('Health', [['Status', 'Not Borrowing']])
  } else {
    printSection('Health', [
      ['Status', 'Borrowing'],
      ['Max LTV HF', health.maxLtvHf.toFixed(4)],
      ['Liquidation HF', health.liquidationHf.toFixed(4)],
      ['Risk Level', health.riskLevel === 'HIGH' ? 'HIGH RISK' : health.riskLevel === 'MEDIUM' ? 'Medium' : 'Safe'],
    ])
  }

  if (collateralData.length > 0) {
    console.log('\nDeposits (Collateral):')
    printTable(
      ['Asset', 'Amount', 'Value (USD)', 'Enabled'],
      collateralData.map(c => [c.asset, formatAmount(c.amount, c.denom), formatUsd(c.usd), c.enabled ? 'Yes' : 'No']),
    )
  } else {
    console.log('\nNo deposits found.')
  }

  if (debtData.length > 0) {
    console.log('Borrows (Debt):')
    printTable(
      ['Asset', 'Amount', 'Value (USD)'],
      debtData.map(d => [d.asset, formatAmount(d.amount, d.denom), formatUsd(d.usd)]),
    )
  } else {
    console.log('No borrows found.')
  }

  console.log('')
}
