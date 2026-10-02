import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate'
import {
  ChainConfig,
  ContractAddresses,
  MAINNET_CONFIG,
  MAINNET_ADDRESSES,
  TESTNET_CONFIG,
  TESTNET_ADDRESSES,
  CONNECTION_TIMEOUT_MS,
  MAX_RETRIES,
  DEFAULT_PAGE_LIMIT,
} from './config'

export interface ProtocolClients {
  cosmwasm: CosmWasmClient
  addresses: ContractAddresses
  config: ChainConfig
}

const clientCache = new Map<string, ProtocolClients>()

// Connect with a timeout to avoid hanging indefinitely on unresponsive RPCs
async function connectWithTimeout(endpoint: string): Promise<CosmWasmClient> {
  const timeout = CONNECTION_TIMEOUT_MS
  const connectPromise = CosmWasmClient.connect(endpoint)
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`RPC connection timed out after ${timeout}ms. Check your network or set PERMAPOD_RPC_URL.`)),
      timeout,
    ),
  )
  return Promise.race([connectPromise, timeoutPromise])
}

// Retry wrapper with exponential backoff
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: Error | undefined
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error
      if (attempt < MAX_RETRIES) {
        const delay = 1000 * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}

export async function getClients(network: 'mainnet' | 'testnet' = 'mainnet'): Promise<ProtocolClients> {
  const cached = clientCache.get(network)
  if (cached) return cached

  const config = network === 'mainnet' ? MAINNET_CONFIG : TESTNET_CONFIG
  const addresses = network === 'mainnet' ? MAINNET_ADDRESSES : TESTNET_ADDRESSES

  const cosmwasm = await connectWithTimeout(config.rpcEndpoint)

  const clients = { cosmwasm, addresses, config }
  clientCache.set(network, clients)
  return clients
}

// Disconnect all cached clients
export function disconnectAll(): void {
  for (const [, clients] of clientCache) {
    try { clients.cosmwasm.disconnect() } catch { /* ignore */ }
  }
  clientCache.clear()
}

// Generic smart query helper with retry
export async function queryContract<T>(client: CosmWasmClient, contractAddress: string, queryMsg: object): Promise<T> {
  return withRetry(() => client.queryContractSmart(contractAddress, queryMsg))
}

// Fetch prices for a list of denoms, returns Map<denom, priceString>
export async function fetchPrices(
  client: CosmWasmClient,
  oracleAddress: string,
  denoms: string[],
): Promise<Map<string, string>> {
  const priceMap = new Map<string, string>()
  if (denoms.length === 0) return priceMap

  try {
    const result = await queryContract(client, oracleAddress, {
      prices_by_denoms: { denoms },
    })
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      for (const [denom, price] of Object.entries(result as Record<string, string>)) {
        priceMap.set(denom, price)
      }
    }
  } catch {
    // Bulk query unsupported or failed -- fetch individually in parallel
    console.error('Warning: Bulk price query unavailable, fetching prices individually...')
    const results = await Promise.allSettled(
      denoms.map(async (denom) => {
        const p: any = await queryContract(client, oracleAddress, { price: { denom } })
        return { denom, price: p?.price ?? (typeof p === 'string' ? p : null) }
      }),
    )
    let failures = 0
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value.price) {
        priceMap.set(r.value.denom, r.value.price)
      } else {
        failures++
      }
    }
    if (failures > 0) {
      console.error(`Warning: Failed to fetch prices for ${failures} asset(s)`)
    }
  }

  return priceMap
}

const MAX_PAGES = 50

// Paginate through V2 endpoints that return { data, metadata: { has_more } }
export async function paginateAll<T>(
  queryFn: (startAfter?: string) => Promise<{ data: T[]; metadata: { has_more: boolean } }>,
  getKey: (item: T) => string,
): Promise<T[]> {
  const results: T[] = []
  let startAfter: string | undefined

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await queryFn(startAfter)
    results.push(...response.data)
    if (!response.metadata.has_more || response.data.length === 0) break

    const nextKey = getKey(response.data[response.data.length - 1])
    if (nextKey === startAfter) break // stale cursor guard
    startAfter = nextKey
  }

  return results
}

// Paginate through array-response queries (non-V2 endpoints)
export async function paginateArray<T>(
  queryFn: (startAfter?: string) => Promise<T[]>,
  getKey: (item: T) => string,
  limit: number = DEFAULT_PAGE_LIMIT,
): Promise<T[]> {
  const results: T[] = []
  let startAfter: string | undefined

  for (let page = 0; page < MAX_PAGES; page++) {
    const batch = await queryFn(startAfter)
    results.push(...batch)
    if (batch.length < limit) break

    const nextKey = getKey(batch[batch.length - 1])
    if (nextKey === startAfter) break // stale cursor guard
    startAfter = nextKey
  }

  return results
}
