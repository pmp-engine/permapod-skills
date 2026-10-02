import { getClients, queryContract, fetchPrices } from '../client'
import { denomLabel, formatAmount, formatUsd, printTable, computeUsdValue } from '../format'
import { Positions } from '../types'

export async function accountCommand(accountId: string, network: 'mainnet' | 'testnet', json = false): Promise<any> {
  const { cosmwasm, addresses } = await getClients(network)

  const positions: Positions = await queryContract(cosmwasm, addresses.creditManager, {
    positions: { account_id: accountId },
  })

  const allDenoms = [
    ...positions.deposits.map(d => d.denom),
    ...positions.debts.map(d => d.denom),
    ...positions.lends.map(l => l.denom),
  ]
  const priceMap = await fetchPrices(cosmwasm, addresses.oracle, [...new Set(allDenoms)])

  const activeDeposits = positions.deposits.filter(d => Number(d.amount) > 0)
  const activeLends = positions.lends.filter(l => Number(l.amount) > 0)
  const activeDebts = positions.debts.filter(d => Number(d.amount) > 0)
  const activeLps = positions.staked_astro_lps.filter(s => Number(s.amount) > 0)

  const mapCoin = (c: { denom: string; amount: string }) => {
    const price = priceMap.get(c.denom) || '0'
    return {
      asset: denomLabel(c.denom),
      denom: c.denom,
      amount: c.amount,
      usd: computeUsdValue(c.amount, price, c.denom),
    }
  }

  if (json) {
    return {
      accountId,
      accountKind: positions.account_kind || 'default',
      network,
      deposits: activeDeposits.map(mapCoin),
      lends: activeLends.map(mapCoin),
      debts: activeDebts.map(mapCoin),
      vaultCount: positions.vaults.length,
      stakedLps: activeLps.map(mapCoin),
    }
  }

  console.log(`\n=== Credit Account: ${accountId} (${positions.account_kind || 'default'}) ===`)

  if (activeDeposits.length > 0) {
    const rows = activeDeposits.map(d => {
      const m = mapCoin(d)
      return [m.asset, formatAmount(d.amount, d.denom), formatUsd(m.usd)]
    })
    console.log('\nHeld Deposits:')
    printTable(['Asset', 'Amount', 'Value (USD)'], rows)
  }

  if (activeLends.length > 0) {
    const rows = activeLends.map(l => {
      const m = mapCoin(l)
      return [m.asset, formatAmount(l.amount, l.denom), formatUsd(m.usd)]
    })
    console.log('Lent to Red Bank:')
    printTable(['Asset', 'Amount', 'Value (USD)'], rows)
  }

  if (activeDebts.length > 0) {
    const rows = activeDebts.map(d => {
      const m = mapCoin(d)
      return [m.asset, formatAmount(d.amount, d.denom), formatUsd(m.usd)]
    })
    console.log('Debts:')
    printTable(['Asset', 'Amount', 'Value (USD)'], rows)
  }

  if (positions.vaults.length > 0) {
    console.log(`Vault Positions: ${positions.vaults.length}`)
  }

  if (activeLps.length > 0) {
    const rows = activeLps.map(s => [denomLabel(s.denom), formatAmount(s.amount, s.denom)])
    console.log('Staked LP Positions:')
    printTable(['LP Token', 'Amount'], rows)
  }

  if (activeDeposits.length === 0 && activeDebts.length === 0 && activeLends.length === 0 &&
      positions.vaults.length === 0) {
    console.log('\nEmpty account - no positions found.')
  }

  console.log('')
}
