import { getClients, queryContract, paginateAll } from '../client'
import { DEFAULT_PAGE_LIMIT } from '../config'
import { denomLabel, formatAmount, formatPercent, printTable } from '../format'
import { VaultConfig, VaultUtilizationResponse } from '../types'

export async function vaultsCommand(network: 'mainnet' | 'testnet', json = false): Promise<any> {
  const { cosmwasm, addresses } = await getClients(network)

  const vaultConfigs = await paginateAll<VaultConfig>(
    async (startAfter) => queryContract(cosmwasm, addresses.params, {
      all_vault_configs_v2: { limit: DEFAULT_PAGE_LIMIT, start_after: startAfter },
    }),
    (item) => item.addr,
  )

  if (vaultConfigs.length === 0) {
    if (json) return { network, vaults: [] }
    console.log(`\nNo vaults configured (${network})`)
    return
  }

  // Fetch all vault utilizations in parallel
  const utilizationResults = await Promise.allSettled(
    vaultConfigs.map(async (v) => {
      const u: VaultUtilizationResponse = await queryContract(cosmwasm, addresses.creditManager, {
        vault_utilization: { vault: { address: v.addr } },
      })
      return u
    }),
  )
  const utilizationMap = new Map<string, VaultUtilizationResponse>()
  for (const r of utilizationResults) {
    if (r.status === 'fulfilled') {
      utilizationMap.set(r.value.vault.address, r.value)
    }
  }

  if (json) {
    return {
      network,
      vaults: vaultConfigs.map(v => {
        const util = utilizationMap.get(v.addr)
        return {
          address: v.addr,
          depositCap: v.deposit_cap,
          utilization: util?.utilization || null,
          maxLtv: Number(v.max_loan_to_value),
          liquidationThreshold: Number(v.liquidation_threshold),
          whitelisted: v.whitelisted,
        }
      }),
    }
  }

  console.log(`\nVault Configurations (${network})`)

  const headers = ['Vault', 'Deposit Cap', 'Used', 'Max LTV', 'Liq Threshold', 'Active']
  const rows = vaultConfigs.map(v => {
    const util = utilizationMap.get(v.addr)
    const used = util ? formatAmount(util.utilization.amount, util.utilization.denom) : 'N/A'

    return [
      `${v.addr.slice(0, 10)}...${v.addr.slice(-6)}`,
      `${formatAmount(v.deposit_cap.amount, v.deposit_cap.denom)} ${denomLabel(v.deposit_cap.denom)}`,
      used,
      formatPercent(v.max_loan_to_value),
      formatPercent(v.liquidation_threshold),
      v.whitelisted ? 'Yes' : 'No',
    ]
  })

  printTable(headers, rows)
}
