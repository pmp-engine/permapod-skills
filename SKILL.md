---
name: permapod-skills
description: Query the Perma Pod lending/borrowing protocol on Zigchain mainnet. Use when user asks about Zigchain DeFi markets, lending rates, TVL, borrow APY, wallet health, oracle prices, credit accounts, vault utilization, or incentive rewards. Supports dashboard overview, market deep dives, yield comparisons, and wallet position lookups.
license: MIT
compatibility: Requires Node.js 18+ and network access to Zigchain RPC. Works on macOS, Linux, and Windows.
triggers:
  - Perma Pod
  - permapod
  - Zigchain DeFi
  - Zigchain lending
  - Zigchain borrowing
  - ZIG lending rates
  - ZIG borrow rate
  - stZIG rates
  - stZIG APY
  - USDC lending Zigchain
  - USDC borrow Zigchain
  - TVL Zigchain
  - TVL Perma Pod
  - total value locked
  - borrow APY
  - supply APY
  - lending rates
  - borrowing rates
  - market rates
  - protocol overview
  - DeFi dashboard
  - oracle prices
  - token prices Zigchain
  - deposit caps
  - total deposits
  - supply overview
  - yield comparison
  - compare yields
  - incentive emissions
  - vault utilization
  - vault config
  - wallet health
  - health factor
  - liquidation risk
  - my deposits Zigchain
  - my borrows
  - my debts
  - collateral status
  - credit manager
  - credit account
  - account positions
  - unclaimed rewards
  - claim rewards
  - reward balance
  - Red Bank
  - interest rates Zigchain
  - utilization rate
  - risk parameters
  - liquidation threshold
  - max LTV
metadata: {"author":"permapod","version":"1.0.0","openclaw":{"requires":{"bins":["node"]},"os":["darwin","linux","win32"],"emoji":"🏦","homepage":"https://github.com/permapod/permapod-skills"}}
---

# Perma Pod Protocol Query Skill

Read-only access to all public Perma Pod protocol data on Zigchain mainnet including markets, prices, user positions, and protocol-level metrics.

## Agent Invariants

These rules MUST always be followed. They override any other guidance.

1. **Read-only only.** This tool NEVER signs transactions, NEVER sends tokens, NEVER modifies on-chain state. If a user asks to deposit, borrow, withdraw, repay, or claim — explain that this is a read-only query tool and point them to the Perma Pod dApp.

2. **Always validate addresses.** Before running any wallet-level command (`wallet`, `accounts`, `rewards`), verify the address starts with `zig1` and is at least 39 characters. Never pass unvalidated user input to wallet queries.

3. **Use denom shortcuts.** When a user says "ZIG", "stZIG", or "USDC", resolve these to the full denom string before passing to commands. Never ask the user for raw denom strings.

4. **Respect network selection.** If the user says "testnet", always append `--testnet`. Default to mainnet when unspecified.

5. **Warn about testnet gaps.** Many contracts are not deployed on testnet. If a testnet query fails, explain that the contract may not be available on testnet rather than showing a generic error.

6. **Always include USD context.** When displaying amounts, include the USD equivalent when oracle prices are available. Raw token amounts without USD context are not useful for financial decisions.

7. **Health factor interpretation.** When displaying wallet health:
   - Liquidation HF < 1.0 = **LIQUIDATABLE** (warn urgently)
   - Liquidation HF < 1.1 = **HIGH RISK** (warn clearly)
   - Liquidation HF < 1.5 = **Medium risk** (note caution)
   - Liquidation HF >= 1.5 = **Safe**

8. **Filter dust.** Assets with less than $10 USD deposited are automatically filtered. Do not mention filtered assets unless the user specifically asks about them.

9. **Use `--json` for data processing.** When the user wants structured data, comparisons, or when you need to process the output programmatically, use `--json` flag. Use human-readable output when answering conversational questions.

10. **Credit accounts require two steps.** To show a user's Credit Manager positions: first run `accounts <address>` to get account IDs, then run `account <id>` for each account. Never guess account IDs.

## Decision Tree

Use this tree to select the correct command based on the user's question:

```
User question
│
├─ About the protocol as a whole?
│  ├─ TVL, total borrows, overall health → dashboard
│  ├─ All markets side by side → markets
│  ├─ Compare APYs/yields → yields
│  └─ Deposit caps and usage → supply
│
├─ About a specific asset?
│  ├─ Full detail (rates, params, IRM) → market <denom>
│  └─ Just the price → price <denom>
│
├─ About all asset prices?
│  └─ → prices
│
├─ About a wallet / address?
│  ├─ Deposits, debts, health factor → wallet <address>
│  ├─ Credit Manager accounts list → accounts <address>
│  ├─ Specific credit account detail → account <id>
│  └─ Unclaimed rewards → rewards <address>
│
├─ About vaults?
│  └─ → vaults
│
└─ Unclear or general?
   └─ Start with → dashboard
```

## Setup

```bash
cd permapod-skills
yarn install && yarn build
```

Run commands with:
```bash
node build/index.js <command> [options]
```

## Commands

### Protocol-Level (no wallet needed)

| Command | Description |
|---------|-------------|
| `dashboard` | Protocol overview: TVL, total borrows, avg APYs |
| `markets` | All active markets with rates, utilization, risk params |
| `market <denom>` | Deep dive on a single market |
| `prices` | Oracle prices for all active assets |
| `price <denom>` | Price for a single asset |
| `supply` | Total deposits vs deposit caps |
| `yields` | Supply/borrow APYs and active incentive emissions |
| `vaults` | Vault configurations and utilization |

### Wallet-Level (requires address)

| Command | Description |
|---------|-------------|
| `wallet <address>` | Deposits, debts, health factor for a Red Bank wallet |
| `accounts <address>` | List Credit Manager accounts owned by a wallet |
| `account <id>` | Full position for a Credit Manager account |
| `rewards <address>` | Unclaimed incentive rewards |

## Output Modes

| Mode | Flag | Use When |
|------|------|----------|
| Human-readable (default) | _(none)_ | Answering conversational questions, showing to user |
| JSON | `--json` or `-j` | Processing data, comparisons, piping to tools |

JSON output returns structured objects with numeric values (not formatted strings). Example:

```bash
node build/index.js dashboard --json
# Returns: { "tvl": 1234567.89, "totalBorrowed": 456789.12, ... }
```

## Denom Shortcuts

Use human-readable names instead of raw denom strings:

| Shortcut | Resolves To |
|----------|-------------|
| `ZIG` | `uzig` |
| `stZIG` | `coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig` |
| `USDC` | `ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4` |

Resolution is case-insensitive. You can also pass raw denom strings directly.

## Global Options

| Flag | Description |
|------|-------------|
| `--testnet`, `-t` | Query testnet instead of mainnet |
| `--json`, `-j` | Output results as JSON |
| `--version`, `-v` | Show CLI version |
| `--help`, `-h` | Show help message |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PERMAPOD_RPC_URL` | `https://public-zigchain-rpc.numia.xyz` | Override mainnet RPC endpoint |
| `PERMAPOD_TESTNET_RPC_URL` | `https://public-zigchain-testnet-rpc.numia.xyz` | Override testnet RPC endpoint |
| `PERMAPOD_TIMEOUT_MS` | `15000` | Connection timeout in milliseconds |
| `PERMAPOD_MAX_RETRIES` | `2` | Max retry attempts for transient failures |

## Instructions

### Step 1: Check Protocol Health

Run `dashboard` to get a quick overview of TVL, total borrows, and weighted average APYs across all markets. This is the best starting point for any protocol-level question.

### Step 2: Explore Markets

Run `markets` to see all active markets with supply/borrow rates, utilization, and risk parameters. For a deep dive on a specific asset, run `market <denom>` (e.g., `market ZIG`).

### Step 3: Look Up Wallet Positions

Run `wallet <address>` to see a user's deposits, debts, and health factor. If the user has Credit Manager accounts, use `accounts <address>` to list them, then `account <id>` for full position details of each.

### Step 4: Check Yields and Rewards

Run `yields` to compare supply/borrow APYs and active incentive emissions across markets. Use `rewards <address>` to check unclaimed incentive rewards for a wallet.

### Step 5: Monitor Vaults

Run `vaults` to see all vault configurations, deposit caps, and utilization levels.

## Examples

### Example 1: "What's the current state of the Perma Pod protocol?"

Run `dashboard`. Returns TVL, total borrowed, weighted supply/borrow APYs, and per-asset breakdown.

### Example 2: "What are the lending rates for ZIG?"

Run `market ZIG`. Returns supply APY, borrow APY, utilization, interest rate model parameters, risk parameters, and deposit cap usage.

### Example 3: "Is wallet zig1abc...xyz healthy?"

Run `wallet zig1abc...xyz`. Returns all deposits (with enabled/disabled status), all debts, max LTV health factor, liquidation health factor, and risk level assessment.

### Example 4: "What rewards can zig1abc...xyz claim?"

Run `rewards zig1abc...xyz`. Returns all unclaimed incentive rewards with token amounts and USD values.

### Example 5: "Compare yields across all markets"

Run `yields`. Returns a table of supply/borrow APYs for all active markets, plus any active incentive emissions.

### Example 6: "Show me the ZIG price"

Run `price ZIG`. Returns the current oracle price in USD.

### Example 7: "What are the Credit Manager positions for zig1abc...xyz?"

First run `accounts zig1abc...xyz` to get account IDs. Then for each account ID, run `account <id>` to see deposits, lends, debts, and vault positions.

### Example 8: "Show me all data in JSON"

Run any command with `--json`:
```bash
node build/index.js dashboard --json
node build/index.js wallet zig1abc...xyz --json
node build/index.js market ZIG --json
```

### Example 9: "Check testnet markets"

Run `markets --testnet`. Note: some contracts may not be deployed on testnet.

### Example 10: "What's the deposit cap usage for stZIG?"

Run `market stZIG`. The output includes a "Total Deposit" section showing deposited amount, cap, and percentage used.

## Common Issues

### RPC Connection Failed

If you see "timed out" or connection errors:
1. Check network connectivity
2. The public RPC `https://public-zigchain-rpc.numia.xyz` may be temporarily down
3. Set `PERMAPOD_RPC_URL` to an alternative RPC endpoint
4. Increase timeout with `PERMAPOD_TIMEOUT_MS=30000`

### Empty Results

If a command returns no data:
- `markets` / `dashboard`: The RPC may be unresponsive. Retry.
- `wallet <address>`: The address has no deposits or debts in Red Bank.
- `accounts <address>`: The address has no Credit Manager accounts.
- Assets with less than $10 USD deposited are automatically filtered out.

### Invalid Address

If you see "Invalid address":
- Addresses must start with `zig1`
- Must contain only valid bech32 characters
- User addresses are ~39 chars, contract addresses are ~59+ chars

### Invalid Denom

If you see "Market not found" or similar:
- Use the shortcuts: `ZIG`, `stZIG`, `USDC` (case-insensitive)
- Or pass the full denom string (e.g., `uzig`)

### Testnet Queries

Some testnet contract addresses are not yet configured. If a testnet query fails with "not configured", that contract is not deployed on testnet.

## References

Before writing custom queries, consult `references/query-reference.md` for:
- Full Red Bank, Oracle, Params, Incentives, and Credit Manager query messages
- Pagination patterns
- Response formats

For chain configuration and contract addresses, see `references/contract-addresses.md`.

For architecture details, see `references/architecture.md`.
