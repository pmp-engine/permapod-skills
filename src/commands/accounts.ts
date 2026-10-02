import { getClients, queryContract, paginateArray } from '../client'
import { DEFAULT_PAGE_LIMIT } from '../config'
import { printTable } from '../format'
import { Account } from '../types'

export async function accountsCommand(owner: string, network: 'mainnet' | 'testnet', json = false): Promise<any> {
  const { cosmwasm, addresses } = await getClients(network)

  const accounts = await paginateArray<Account>(
    async (startAfter) => queryContract(cosmwasm, addresses.creditManager, {
      accounts: { owner, limit: DEFAULT_PAGE_LIMIT, start_after: startAfter },
    }),
    (item) => item.id,
  )

  if (accounts.length === 0) {
    if (json) return { owner, network, accounts: [] }
    console.log(`\nNo Credit Manager accounts found for ${owner}`)
    return
  }

  if (json) {
    return {
      owner,
      network,
      accounts: accounts.map(a => ({ id: a.id, kind: a.kind || 'default' })),
    }
  }

  console.log(`\nCredit Manager Accounts for ${owner}`)

  const headers = ['Account ID', 'Type']
  const rows = accounts.map(a => [a.id, a.kind || 'default'])

  printTable(headers, rows)
}
