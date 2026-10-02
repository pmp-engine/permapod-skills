# permapod-skills

This file provides guidance to AI coding agents working on this repository.

## What is permapod-skills?

A read-only CLI and Claude Code skill for querying the Perma Pod lending/borrowing protocol on Zigchain. It queries CosmWasm smart contracts via public RPC to return protocol metrics, market data, wallet positions, and reward balances. There are no write operations — no signing, no mnemonic, no private keys anywhere in this codebase.

The CLI is used both directly by humans and as a tool by Claude Code when the skill is installed.

## Development commands

```bash
yarn install          # Install dependencies
yarn build            # Compile TypeScript to build/
yarn test             # Run unit tests (Jest)
yarn lint             # Run ESLint
yarn dev              # Run via ts-node (no build needed)
yarn format:fix       # Auto-format with Prettier

make release-check    # Full pipeline: build → test → lint → drift-check → eval
make drift-check      # Verify SKILL.md matches .surface
make eval             # Validate skill eval cases
make surface          # Regenerate .surface from CLI
make clean            # Remove build/ and coverage/
```

## Architecture Overview

This is a TypeScript project using:
- [@cosmjs/cosmwasm-stargate](https://github.com/cosmos/cosmjs) for querying CosmWasm smart contracts
- Cursor-based pagination for all list queries
- BigInt arithmetic for on-chain amount formatting (avoids JS float precision loss)

### Module layout

| Module | Purpose |
|--------|---------|
| `src/index.ts` | CLI entry point — argument parsing, command routing, error handling, cleanup |
| `src/client.ts` | CosmWasm client creation with timeout, retry with exponential backoff, pagination helpers, price fetching |
| `src/config.ts` | Chain config (RPC endpoints, contract addresses), denom registry, constants. Supports env var overrides |
| `src/format.ts` | BigInt-safe amount formatting, USD formatting, percentage formatting, table/section printers |
| `src/types.ts` | TypeScript interfaces matching on-chain query response shapes (kept minimal — only fields commands use) |
| `src/validate.ts` | Bech32 address validation, empty contract address guards |
| `src/commands/*.ts` | One file per CLI command. Each follows the same pattern (see below) |

### Command pattern

Every command file exports a single async function with this signature:

```typescript
export async function fooCommand(network: 'mainnet' | 'testnet', json = false): Promise<any>
```

Wallet-level commands add an `address` (or `accountId`) parameter before `network`.

Each command follows the same flow:
1. `getClients(network)` — get cached CosmWasm client + contract addresses
2. Query contracts — use `queryContract`, `paginateAll` (V2 endpoints), or `paginateArray` (array endpoints)
3. `fetchPrices` — get oracle prices for USD calculations
4. Build result object from computed data
5. If `json` is true, return the result object (caller prints it)
6. Otherwise, format and print to console using `printTable`/`printSection`

When adding a new command, follow this exact pattern. Do not add console output in json mode.

### Pagination

There are two pagination helpers in `client.ts`:

- **`paginateAll<T>`** — for V2 endpoints that return `{ data: T[], metadata: { has_more: boolean } }`. Used by `markets_v2`, `all_asset_params_v2`, `all_total_deposits_v2`, `all_vault_configs_v2`.
- **`paginateArray<T>`** — for non-V2 endpoints that return `T[]` directly. Used by `user_collaterals`, `user_debts`, `user_unclaimed_rewards`, `accounts`.

Both use cursor-based `start_after` pagination with a `MAX_PAGES = 50` safety cap and stale cursor detection. Always use the appropriate helper — never query with just `limit` and assume you got everything.

### Contract query reference

Before adding or modifying queries, consult `references/query-reference.md` for the exact message format, pagination patterns, and response shapes. Contract addresses are in `references/contract-addresses.md` and mirrored in `src/config.ts`.

The on-chain contracts are based on the [Mars Protocol](https://github.com/mars-protocol/contracts) architecture. Key contracts:

| Contract | What it stores |
|----------|---------------|
| Red Bank | Market state (supply, borrow, rates, utilization), user collaterals/debts, health |
| Oracle | Asset prices (Stork/Pyth feeds) |
| Params | Risk parameters (LTV, liquidation thresholds, deposit caps), total deposits |
| Incentives | Emission schedules, unclaimed user rewards |
| Credit Manager | Leveraged accounts (deposits, lends, debts, vaults) |

### Error handling

- `client.ts` wraps all queries with retry + exponential backoff (`MAX_RETRIES` from config)
- `client.ts` connects with a timeout (`CONNECTION_TIMEOUT_MS`) via `Promise.race`
- Commands should throw errors, not call `process.exit`. The global handler in `index.ts` catches everything
- When a secondary query fails (e.g., fetching asset params alongside markets), log a warning with `console.error('Warning: ...')` and continue with partial data. Do not silently swallow errors
- `fetchPrices` falls back from bulk to individual queries automatically, logging a warning

### Formatting and precision

- **Always use `formatAmount` / `computeUsdValue`** from `format.ts` for on-chain amounts. They use BigInt internally to avoid floating-point precision loss on amounts exceeding `Number.MAX_SAFE_INTEGER`
- The BigInt path handles: zero, empty string, negative values (via abs). Falls back to `Number()` for non-integer strings
- `DENOM_DECIMALS` in config.ts maps denoms to their decimal places (all currently 6). Unknown denoms default to 6
- `DENOM_LABELS` provides human-readable names. The `denomLabel()` function falls back to truncating long denoms

### Validation

- `validateAddress(address, prefix)` — checks bech32 format (prefix, length, character set). Called in `index.ts` before wallet/accounts/rewards commands
- `ensureContractAddress(address, name, network)` — throws if address is empty. Use before querying contracts that may not be deployed on testnet (e.g., Params, Incentives)

### Config and env vars

All hardcoded values in `config.ts` support env var overrides:
- `PERMAPOD_RPC_URL` / `PERMAPOD_TESTNET_RPC_URL` — RPC endpoints
- `PERMAPOD_TIMEOUT_MS` — connection timeout (default 15000)
- `PERMAPOD_MAX_RETRIES` — retry count (default 2)

Never add secrets or private keys to config. This is a read-only tool.

## Testing

Tests are in `src/__tests__/` using Jest + ts-jest. Run with `yarn test`.

### What's tested

| File | Coverage |
|------|----------|
| `format.test.ts` | `formatAmount` (normal, zero, empty, large BigInt, unknown denom, custom precision), `formatPercent`, `formatUsd`, `formatPrice`, `computeUsdValue` (normal, zero, large, fallback), `denomLabel` (known, IBC, truncation) |
| `validate.test.ts` | `validateAddress` (valid user/contract addrs, wrong prefix, empty, too short, invalid chars, custom prefix), `ensureContractAddress` (pass/throw) |

### Adding tests

- Put test files in `src/__tests__/<module>.test.ts`
- Test pure functions (format, validate, config). Commands require mocking CosmWasm which is out of scope for unit tests
- The eval cases in `skill-evals/cases/` serve as integration test specifications (validated by `skill-evals/run.sh`)

## Release process

### The five checks

`make release-check` runs these in order — all must pass:

1. **`yarn build`** — TypeScript compiles with `strict: true`, no errors
2. **`yarn test`** — 36 unit tests pass
3. **`yarn lint`** — ESLint reports 0 errors (warnings for `any` types are accepted)
4. **`make drift-check`** — `.surface` file matches SKILL.md (commands, flags, denoms, env vars)
5. **`make eval`** — All 11 skill eval cases are well-formed and reference valid commands

### Adding a new command (checklist)

1. Create `src/commands/<name>.ts` following the command pattern above
2. Add types to `src/types.ts` if the response shape is new
3. Wire into `src/index.ts` — import, add switch case, add address validation if wallet-level
4. Add the command to `.surface`
5. Document in `SKILL.md` — command table, decision tree, at least one example
6. Create `skill-evals/cases/<name>.yml` with 3+ natural language queries
7. Run `make release-check`

### Adding a new denom

1. Add to `DENOM_LABELS` and `DENOM_DECIMALS` in `src/config.ts`
2. Add to `.surface` under denom shortcuts
3. Add to SKILL.md denom shortcuts table
4. Run `make drift-check`

### Changing global flags

1. Update argument parsing in `src/index.ts`
2. Update `.surface`
3. Update SKILL.md (Global Options table + help output)
4. Run `make drift-check`

## Code style

- No semicolons
- Single quotes
- Trailing commas
- 120-char line width
- See `.prettierrc` and `.eslintrc.json`
- Run `yarn format:fix` to auto-format

The ESLint config warns on `@typescript-eslint/no-explicit-any`. The `any` return type on command functions is intentional (JSON output shape varies per command). Do not add `// eslint-disable` comments — the warnings are acceptable.

## Skill system

This project serves dual purposes: standalone CLI and Claude Code skill.

- **SKILL.md** — the skill definition that Claude reads. Contains triggers (50 phrases), agent invariants (10 rules), decision tree, command reference, and examples. This is the contract between the skill and the LLM
- **`.surface`** — the CLI surface inventory. Must stay in sync with SKILL.md (enforced by drift-check)
- **`skill-evals/`** — YAML eval cases defining expected LLM behavior for natural language queries
- **`.claude-plugin/`** — marketplace metadata and session-start hook for environment validation

When changing CLI behavior, always update both SKILL.md and .surface. The drift checker catches omissions.
