# Query Reference

## Red Bank Queries (Lending Pool)

Query the Red Bank contract for market data and user positions.

| Query | Message | Returns |
|-------|---------|---------|
| All markets | `{ "markets_v2": { "limit": 30 } }` | Supply, borrow, rates, utilization |
| Single market | `{ "market_v2": { "denom": "<denom>" } }` | Full market state for one asset |
| User collateral | `{ "user_collaterals": { "user": "<addr>", "limit": 30 } }` | Deposit amounts and enabled status |
| User debts | `{ "user_debts": { "user": "<addr>", "limit": 30 } }` | Borrow amounts per asset |
| User health | `{ "user_position": { "user": "<addr>" } }` | Health factors, collateral/debt totals |

## Oracle Queries (Prices)

| Query | Message | Returns |
|-------|---------|---------|
| All prices | `{ "prices_by_denoms": { "denoms": [...] } }` | Map of denom to USD price |
| Single price | `{ "price": { "denom": "<denom>" } }` | Price for one asset |
| Price sources | `{ "price_sources": { "limit": 30 } }` | Configured oracle sources (Stork/Pyth) |

Note: `prices_by_denoms` returns a map `{ "denom": "price" }`, not an array.

## Params Queries (Risk Parameters)

| Query | Message | Returns |
|-------|---------|---------|
| Asset params | `{ "asset_params": { "denom": "<denom>" } }` | LTV, liquidation threshold, caps |
| All asset params | `{ "all_asset_params_v2": { "limit": 30 } }` | Risk params for all assets |
| Total deposits | `{ "all_total_deposits_v2": { "limit": 30 } }` | Deposits across Red Bank + Credit Mgr |

## Incentives Queries (Rewards)

| Query | Message | Returns |
|-------|---------|---------|
| Active emissions | `{ "active_emissions": { "denom": "<d>", "kind": "red_bank" } }` | Current reward emission rates |
| Unclaimed rewards | `{ "user_unclaimed_rewards": { "user": "<addr>", "limit": 30 } }` | Pending rewards to claim |
| Whitelist | `{ "whitelist": {} }` | Whitelisted incentive tokens |

## Credit Manager Queries (Leveraged Accounts)

| Query | Message | Returns |
|-------|---------|---------|
| User accounts | `{ "accounts": { "owner": "<addr>", "limit": 30 } }` | Credit account IDs and types |
| Account positions | `{ "positions": { "account_id": "<id>" } }` | Deposits, debts, lends, vaults |
| Vault utilization | `{ "vault_utilization": { "vault": { "address": "<addr>" } } }` | How much of vault cap is used |

## Pagination

All paginated queries use `start_after` cursor-based pagination:
- Default limit: 10, max limit: 30
- V2 endpoints return `{ "data": [...], "metadata": { "has_more": bool } }`
- Pass the last item's key as `start_after` for the next page
