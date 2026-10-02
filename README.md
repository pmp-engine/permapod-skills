Query the Permapod lending/borrowing protocol on Zigchain in seconds -- get TVL, market rates, wallet health, yield comparisons, and reward balances without navigating block explorers or writing custom scripts.

## What You Can Do

- **Protocol overview**: TVL, total borrows, weighted average APYs across all markets
- **Market analysis**: Supply/borrow rates, utilization, risk parameters for any asset
- **Wallet health**: Deposits, debts, health factors, and liquidation risk for any address
- **Yield comparison**: Side-by-side supply/borrow APYs with active incentive emissions
- **Reward tracking**: Check unclaimed incentive rewards for any wallet
- **Vault monitoring**: Vault configurations, deposit caps, and utilization
- **JSON output**: Structured output for programmatic consumption via `--json`

## Installation

### Claude Code

Add the skill directly from GitHub:

```bash
claude skill add --from https://github.com/permapod/permapod-skills
```

Or clone and install manually:

```bash
git clone https://github.com/permapod/permapod-skills.git
cd permapod-skills
yarn install && yarn build
```

Then place the skill folder in your Claude Code skills directory, or point Claude to this folder.

### OpenClaw

Add the skill by GitHub URL:

```bash
openclaw skills add https://github.com/permapod/permapod-skills
```

Or clone into your workspace skills directory:

```bash
git clone https://github.com/permapod/permapod-skills.git ~/.openclaw/skills/permapod-skills
cd ~/.openclaw/skills/permapod-skills
yarn install && yarn build
```

### Claude.ai (Web)

1. Download this repo as a ZIP
2. Open Claude.ai > Settings > Capabilities > Skills
3. Click "Upload skill" and select the ZIP
4. Toggle on the "permapod-skills" skill

## Quick Start

Once installed, try asking Claude:

- "What's the current TVL on Permapod?"
- "Show me the lending rates for ZIG"
- "Check the health of wallet zig1abc...xyz"
- "What rewards can I claim on Permapod?"
- "Compare yields across all Permapod markets"
- "Show me the dashboard in JSON"

## Prerequisites

- Node.js 18+
- Yarn or npm
- Network access to Zigchain RPC

## Usage (CLI)

```bash
# Protocol overview
node build/index.js dashboard

# All markets
node build/index.js markets

# Single market deep dive
node build/index.js market ZIG

# Oracle prices
node build/index.js prices

# Wallet position
node build/index.js wallet zig1abc...xyz

# Credit Manager accounts
node build/index.js accounts zig1abc...xyz

# Unclaimed rewards
node build/index.js rewards zig1abc...xyz

# JSON output
node build/index.js dashboard --json

# Testnet mode
node build/index.js dashboard --testnet

# Version
node build/index.js --version
```

### Global Flags

| Flag | Description |
|------|-------------|
| `--testnet`, `-t` | Query testnet instead of mainnet |
| `--json`, `-j` | Output results as JSON |
| `--version`, `-v` | Show version number |
| `--help`, `-h` | Show help message |

## Supported Assets

| Symbol | Description |
|--------|-------------|
| ZIG | Native Zigchain token |
| stZIG | Liquid-staked ZIG |
| USDC | IBC-bridged USDC |

Denom shortcuts are case-insensitive: `ZIG`, `zig`, `Zig` all resolve to `uzig`.

## Environment Variables

Override defaults without changing source code:

| Variable | Default | Description |
|----------|---------|-------------|
| `PERMAPOD_RPC_URL` | `https://public-zigchain-rpc.numia.xyz` | Mainnet RPC endpoint |
| `PERMAPOD_TESTNET_RPC_URL` | `https://public-zigchain-testnet-rpc.numia.xyz` | Testnet RPC endpoint |
| `PERMAPOD_TIMEOUT_MS` | `15000` | Connection timeout (ms) |
| `PERMAPOD_MAX_RETRIES` | `2` | Retry attempts for transient failures |

```bash
# Example: use a custom RPC with longer timeout
PERMAPOD_RPC_URL=https://my-rpc.example.com PERMAPOD_TIMEOUT_MS=30000 node build/index.js dashboard
```

## Development

```bash
# Install dependencies
yarn install

# Build
yarn build

# Run in dev mode (ts-node)
yarn dev

# Run tests
yarn test

# Lint
yarn lint

# Format code
yarn format:fix

# Run all release checks (build + test + lint + drift-check + eval)
make release-check
```

### Project Structure

```
permapod-skills/
├── src/
│   ├── index.ts              # CLI entry point, argument parsing
│   ├── client.ts             # CosmWasm client, retry, pagination
│   ├── config.ts             # Chain config, addresses, constants
│   ├── format.ts             # BigInt-safe formatting, table printer
│   ├── types.ts              # On-chain response type definitions
│   ├── validate.ts           # Address validation, contract guards
│   ├── commands/             # One file per CLI command
│   │   ├── dashboard.ts
│   │   ├── markets.ts
│   │   ├── market.ts
│   │   ├── prices.ts
│   │   ├── supply.ts
│   │   ├── yields.ts
│   │   ├── wallet.ts
│   │   ├── account.ts
│   │   ├── accounts.ts
│   │   ├── rewards.ts
│   │   └── vaults.ts
│   └── __tests__/            # Unit tests
│       ├── format.test.ts
│       └── validate.test.ts
├── references/               # Query specs, contract addresses, architecture
├── skill-evals/              # LLM eval cases
│   ├── run.sh                # Eval case validator
│   └── cases/                # 11 YAML eval cases
├── scripts/                  # Release tooling
│   ├── check-skill-drift.sh  # SKILL.md ↔ .surface sync check
│   └── generate-surface.sh   # Regenerate .surface from CLI
├── .claude-plugin/           # Marketplace metadata + hooks
│   ├── plugin.json
│   ├── marketplace.json
│   └── hooks/
│       ├── hooks.json
│       └── session-start.sh  # Environment validation hook
├── .surface                  # CLI command inventory
├── SKILL.md                  # Skill definition (triggers, invariants, decision tree)
├── Makefile                  # Build + release check targets
├── .eslintrc.json
├── .prettierrc
├── .github/workflows/ci.yml  # CI pipeline (Node 18 + 20)
├── jest.config.js
├── tsconfig.json
└── package.json
```

### Release Checks

Run `make release-check` before any release. It executes five checks in sequence:

1. **Build** — TypeScript compiles cleanly
2. **Test** — All unit tests pass (36 tests)
3. **Lint** — ESLint reports zero errors
4. **Drift check** — SKILL.md documents all commands/flags/denoms in `.surface`
5. **Eval** — All 11 skill eval cases are well-formed and reference valid commands

### Adding a New Command

1. Create `src/commands/<name>.ts` following the existing pattern
2. Wire it into `src/index.ts` (import + switch case)
3. Add the command to `.surface`
4. Document it in `SKILL.md`
5. Create an eval case in `skill-evals/cases/<name>.yml`
6. Run `make release-check` to verify everything is in sync

## Architecture

All queries are **read-only** — no signing, no mnemonic, no wallet keys required. The CLI connects via public RPC and queries CosmWasm smart contract state directly.

Each command follows the same pattern:

1. Get clients (CosmWasm + contract addresses + chain config)
2. Query required contracts (Red Bank, Oracle, Params, Incentives, Credit Manager)
3. Fetch oracle prices for USD value calculations
4. Return structured data (`--json`) or format and print to console

Key design decisions:

- **BigInt-safe math** — On-chain amounts use `BigInt` arithmetic to avoid JavaScript floating-point precision loss on large token supplies
- **Retry with backoff** — All contract queries retry up to `MAX_RETRIES` times with exponential backoff
- **Connection timeout** — RPC connections time out after `CONNECTION_TIMEOUT_MS` to avoid hanging
- **Client caching** — `CosmWasmClient` instances are cached per network to avoid reconnecting
- **Full pagination** — All list queries paginate through results using cursor-based `start_after` patterns
- **Bech32 validation** — Wallet addresses are validated before any query is sent
- **Graceful cleanup** — All clients are disconnected on exit via `finally` block

## License

MIT
