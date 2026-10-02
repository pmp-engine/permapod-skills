# Architecture

```
CLI (index.ts)
  |
  +-- commands/        # One file per command
  |     +-- dashboard  # Aggregates: Red Bank + Oracle
  |     +-- markets    # Red Bank markets_v2 + Oracle prices + Params
  |     +-- market     # Red Bank market_v2 + Oracle + Params + total_deposit
  |     +-- prices     # Oracle prices_by_denoms
  |     +-- supply     # Params all_total_deposits_v2 + Oracle
  |     +-- yields     # Red Bank markets_v2 + Incentives active_emissions
  |     +-- wallet     # Red Bank user_collaterals + user_debts + user_position
  |     +-- accounts   # Credit Manager accounts
  |     +-- account    # Credit Manager positions
  |     +-- rewards    # Incentives user_unclaimed_rewards
  |     +-- vaults     # Params all_vault_configs_v2 + CM vault_utilization
  |
  +-- config.ts        # Chain config, addresses, denom registry
  +-- client.ts        # CosmWasm client, fetchPrices, pagination helper
  +-- format.ts        # Amount/price/percent formatting, table printer
```

All queries are read-only (no signing, no mnemonic, no wallet needed). The CLI connects via public RPC and queries CosmWasm smart contract state directly.

## Command Flow

Each command follows the same pattern:

1. Get clients (CosmWasm + contract addresses + chain config)
2. Query required contracts (Red Bank, Oracle, Params, Incentives, Credit Manager)
3. Fetch prices for USD value calculations
4. Format and print output (tables or key-value sections)

## Key Modules

- **config.ts**: Chain config, contract addresses, denom label/decimal registry, constants
- **client.ts**: CosmWasm client creation/caching, generic contract query wrapper, bulk price fetching with fallback, cursor-based pagination helper
- **format.ts**: Human-readable formatting for amounts, prices, percentages, USD values, plus table and section printers
- **types.ts**: TypeScript interfaces matching on-chain query response shapes
