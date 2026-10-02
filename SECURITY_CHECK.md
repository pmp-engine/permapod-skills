# Security Audit Report

**Project:** permapod-skills
**Date:** 2026-04-02
**Scope:** Full codebase — write transactions, key management, input validation, dependencies, network security, code quality
**Result:** PASS (0 critical, 0 high, 5 low warnings)

---

## Audit Methodology

This audit was performed by running four specialized sub-agents in parallel, each responsible for a distinct security domain. The results were then consolidated into this single report.

### Agent 1 — Write Transactions & Key Management

**Why:** The project's #1 invariant is "read-only only." This agent's sole job was to exhaustively prove no write capability exists — no signing clients, no transaction messages, no key handling, no gas config. This is the most critical check for a Web3 query tool because a single signing import could enable fund theft.

**Prompt:** Search for all Cosmos SDK write message types (MsgExecuteContract, MsgSend, MsgDelegate, etc.), signing operations (signAndBroadcast, broadcast, signDirect), signing client imports (SigningStargateClient, SigningCosmWasmClient, DirectSecp256k1HdWallet), key/mnemonic handling (mnemonic, privateKey, seed_phrase, keyring), execute methods on contracts, gas/fee configuration, HTTP POST/PUT/DELETE methods, process.env references that could store secrets, and package.json dependencies for signing-related packages. Verify CosmWasmClient (read-only) is used everywhere.

**Covers sections:** 1 (Read-Only Enforcement), 2 (Private Key & Secret Protection)

### Agent 2 — Input Validation & Injection Attacks

**Why:** Even a read-only tool accepts user input (addresses, denoms, account IDs). This agent checked every input path for injection vectors — command injection, path traversal, prototype pollution, ReDoS — and verified that validation functions are actually applied at every entry point, not just defined.

**Prompt:** Search for command injection (exec, spawn, eval, Function), SQL injection, path traversal (fs operations with user input), prototype pollution (Object.assign with untrusted data), address validation coverage on all commands accepting addresses, denom string sanitization, account ID validation, integer overflow risks, ReDoS-vulnerable regex patterns, `any` type usage masking runtime safety, and error messages leaking sensitive information.

**Covers sections:** 3 (Input Validation & Injection Prevention), 6 (Code Quality & Type Safety)

### Agent 3 — Dependencies & Supply Chain

**Why:** Supply chain attacks are a top Web3 risk vector. A malicious postinstall hook or typosquatted package could silently exfiltrate keys or inject signing code. This agent audited every dependency, checked for install hooks, verified lockfile integrity, and confirmed no signing-capable libraries are in the dependency tree.

**Prompt:** List all runtime and dev dependencies with versions, flag any related to signing/key management/transaction broadcasting, check for network libraries beyond @cosmjs, check for file system write dependencies, check for crypto/encryption dependencies, verify devDependencies are reasonable, check package.json scripts for suspicious hooks (postinstall, preinstall), verify yarn.lock exists with integrity hashes, check for unused dependencies, and review tsconfig.json for strict mode.

**Covers sections:** 4 (Dependency & Supply Chain Security), 7 (CI/CD Security)

### Agent 4 — Network Security & Data Exposure

**Why:** The tool connects to external RPC endpoints and displays blockchain data. This agent verified all connections use HTTPS, checked that error messages don't leak credentials, confirmed no telemetry or data collection exists, and validated that retry/pagination logic can't be abused for resource exhaustion or infinite loops.

**Prompt:** Verify all network connections use HTTPS/WSS, check for data leakage in console.log and error messages, check if RPC endpoint env vars could be tampered to point to malicious nodes, search for hardcoded credentials/API keys/tokens, verify .gitignore excludes secrets, check for committed .env files, review error handling for uncaught exception leaks, check retry/backoff logic for infinite loop potential, check pagination for safety caps, check for CORS/CSP headers, review CI/CD pipeline for security issues, check RPC response validation, search for telemetry/analytics, and verify no wallet addresses are hardcoded for phishing.

**Covers sections:** 5 (Network Security), 8 (File-by-File Assessment)

---

## 1. Read-Only Enforcement

The CLI is strictly read-only. No write transaction capabilities exist anywhere in the codebase.

| Check | Status | Details |
|-------|--------|---------|
| Cosmos SDK write messages | PASS | No `MsgExecuteContract`, `MsgSend`, `MsgDelegate`, or any other write message types |
| Signing operations | PASS | No `signAndBroadcast`, `signDirect`, `signAmino`, or `broadcast` calls |
| Signing client imports | PASS | Only `CosmWasmClient` (read-only) imported — no `SigningCosmWasmClient` or `SigningStargateClient` |
| Key/mnemonic handling | PASS | No `mnemonic`, `privateKey`, `seed_phrase`, `keyring`, or wallet generation code |
| Contract execute methods | PASS | Only `queryContractSmart()` used — no `execute()` or `executeContract()` |
| Gas/fee configuration | PASS | No gas, fee, or transaction cost configuration |
| HTTP write methods | PASS | No direct POST/PUT/DELETE requests — all network via CosmJS read-only client |

### Client verification

```
src/client.ts:1  — import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate'  (read-only)
src/client.ts:75 — client.queryContractSmart(address, queryMsg)                (read-only query)
```

No file in `src/` imports or references any signing client.

---

## 2. Private Key & Secret Protection

| Check | Status | Details |
|-------|--------|---------|
| Hardcoded secrets | PASS | No API keys, passwords, mnemonics, or private keys in source |
| Environment variables | PASS | Only `PERMAPOD_RPC_URL`, `PERMAPOD_TESTNET_RPC_URL`, `PERMAPOD_TIMEOUT_MS`, `PERMAPOD_MAX_RETRIES` — all non-sensitive config |
| `.gitignore` | PASS | `.env`, `node_modules/`, `build/`, `coverage/` properly excluded |
| Committed secrets | PASS | No `.env` files or credential files in the repository |
| Telemetry/analytics | PASS | No tracking, analytics, or external data collection |

---

## 3. Input Validation & Injection Prevention

| Check | Status | Details |
|-------|--------|---------|
| Command injection | PASS | No `exec()`, `spawn()`, `eval()`, `Function()`, or shell execution with user input |
| SQL injection | PASS | No database — all queries via CosmWasm smart contracts |
| Path traversal | PASS | No file system operations with user input |
| Prototype pollution | PASS | No `Object.assign()` or spread with untrusted data |
| ReDoS | PASS | Single regex (`BECH32_CHARSET`) uses safe character class — linear time |
| Address validation | PASS | `validateAddress()` checks prefix, length, bech32 charset — applied to all wallet commands |
| Denom validation | WARN | User-provided denoms not format-validated before contract queries (low risk — invalid denom returns empty result) |
| Account ID validation | WARN | Account IDs not format-validated (low risk — invalid ID returns contract error) |

### Address validation implementation

```
src/validate.ts     — validateAddress() with bech32 prefix, length, charset checks
src/index.ts:152    — wallet command validates address
src/index.ts:163    — accounts command validates address
src/index.ts:184    — rewards command validates address
```

---

## 4. Dependency & Supply Chain Security

| Check | Status | Details |
|-------|--------|---------|
| Runtime dependencies | PASS | Only 2: `@cosmjs/cosmwasm-stargate@0.32.4`, `@cosmjs/stargate@0.32.4` |
| Signing packages | PASS | No `@cosmjs/proto-signing`, `ethers`, `web3`, `bip39`, or key management libraries imported |
| Lockfile integrity | PASS | `yarn.lock` present with SHA-512 integrity hashes for all 449 packages |
| Install hooks | PASS | No `postinstall`, `preinstall`, or `prepare` scripts in `package.json` |
| Unused dependencies | PASS | Both runtime dependencies actively used |
| Dev dependencies | PASS | Standard tooling only: TypeScript, Jest, ESLint, Prettier |
| Dependency pinning | PASS | All versions pinned exactly via `yarn.lock` |

### Runtime dependency inventory

| Package | Version | Purpose | Signing capable? |
|---------|---------|---------|-----------------|
| `@cosmjs/cosmwasm-stargate` | 0.32.4 | CosmWasm smart contract queries | No (read-only client only) |
| `@cosmjs/stargate` | 0.32.4 | Cosmos chain queries | No (read-only client only) |

---

## 5. Network Security

| Check | Status | Details |
|-------|--------|---------|
| Protocol security | PASS | Default RPC endpoints use HTTPS exclusively |
| RPC endpoint override | WARN | `PERMAPOD_RPC_URL` env var not validated for HTTPS — user could set HTTP endpoint |
| Connection timeout | PASS | 15s default via `Promise.race()` — prevents hanging connections |
| Retry logic | PASS | Exponential backoff (1s, 2s, 4s) with max 2 retries — prevents retry storms |
| Pagination safety | PASS | Hard cap at 50 pages + stale cursor detection — prevents infinite loops |
| Data exposure | PASS | No sensitive data in console output or error messages |

### Timeout and retry configuration

```
src/config.ts:89  — CONNECTION_TIMEOUT_MS = 15_000 (configurable)
src/config.ts:92  — MAX_RETRIES = 2 (configurable)
src/client.ts:36  — Exponential backoff: delay = 1000 * 2^attempt
src/client.ts:122 — MAX_PAGES = 50 hard pagination limit
```

---

## 6. Code Quality & Type Safety

| Check | Status | Details |
|-------|--------|---------|
| TypeScript strict mode | PASS | `"strict": true` in `tsconfig.json` — enables all strict checks |
| ESLint | PASS | Configured with `@typescript-eslint/recommended` rules |
| `any` type usage | WARN | 5 instances — used defensively in error handling and command result types |
| Integer overflow | PASS | `BigInt` used for all on-chain amount arithmetic — avoids `Number.MAX_SAFE_INTEGER` issues |
| Error handling | PASS | Global try/catch in CLI entry point, graceful error messages, `disconnectAll()` in `finally` block |
| RPC response validation | WARN | Type assertions (`as T`) without runtime schema validation — malicious RPC could return unexpected shapes |

### BigInt safety

```
src/format.ts:20  — formatAmount() uses BigInt for raw amount conversion
src/format.ts:95  — computeUsdValue() uses BigInt for USD calculations
```

---

## 7. CI/CD Security

| Check | Status | Details |
|-------|--------|---------|
| Workflow security | PASS | Standard `actions/checkout@v4` + `actions/setup-node@v4` — no secret exposure |
| Frozen lockfile | PASS | CI uses `yarn install --frozen-lockfile` — prevents dependency mutation |
| Test matrix | PASS | Tests on Node.js 18 + 20 |
| No force push | PASS | No `--force` or destructive git operations in CI |

---

## 8. File-by-File Assessment

| File | Verdict | Notes |
|------|---------|-------|
| `src/index.ts` | PASS | CLI entry — argument parsing, command routing, error handling |
| `src/client.ts` | PASS | Read-only `CosmWasmClient`, retry, pagination with safety caps |
| `src/config.ts` | PASS | Public RPC endpoints, contract addresses, non-sensitive constants |
| `src/types.ts` | PASS | TypeScript interfaces for query responses only |
| `src/format.ts` | PASS | BigInt-safe formatting utilities |
| `src/validate.ts` | PASS | Bech32 address validation |
| `src/commands/dashboard.ts` | PASS | Read-only protocol stats query |
| `src/commands/markets.ts` | PASS | Read-only market listing query |
| `src/commands/market.ts` | PASS | Read-only single market query |
| `src/commands/prices.ts` | PASS | Read-only price query |
| `src/commands/supply.ts` | PASS | Read-only supply/deposit query |
| `src/commands/yields.ts` | PASS | Read-only yield query |
| `src/commands/wallet.ts` | PASS | Read-only wallet position query |
| `src/commands/accounts.ts` | PASS | Read-only account listing query |
| `src/commands/account.ts` | PASS | Read-only account position query |
| `src/commands/rewards.ts` | PASS | Read-only reward balance query |
| `src/commands/vaults.ts` | PASS | Read-only vault config query |
| `src/__tests__/format.test.ts` | PASS | Unit tests for formatting |
| `src/__tests__/validate.test.ts` | PASS | Unit tests for address validation |

---

## 9. Warnings Summary

Five low-severity warnings were identified. None are exploitable — they represent hardening opportunities.

| # | Category | Severity | File | Description |
|---|----------|----------|------|-------------|
| W1 | Input validation | LOW | `src/commands/market.ts` | User-provided denom strings not format-validated before contract query |
| W2 | Input validation | LOW | `src/index.ts` | Account IDs not format-validated before contract query |
| W3 | Network | LOW | `src/config.ts` | `PERMAPOD_RPC_URL` env var not validated for HTTPS protocol |
| W4 | Type safety | LOW | Multiple files | 5 uses of `any` type (error handlers + command returns) |
| W5 | Data integrity | LOW | Command files | RPC responses type-asserted without runtime schema validation |

---

## 10. Compliance Checklist

- [x] No write transaction message types
- [x] No signing or broadcasting operations
- [x] No signing client imports
- [x] No key/mnemonic/seed handling
- [x] No execute methods on contracts
- [x] No gas/fee configuration
- [x] No hardcoded secrets or credentials
- [x] No file system write operations
- [x] No command injection vectors
- [x] No telemetry or data collection
- [x] Address validation on all wallet commands
- [x] BigInt arithmetic for on-chain amounts
- [x] Connection timeout protection
- [x] Retry with exponential backoff
- [x] Pagination safety caps
- [x] TypeScript strict mode enabled
- [x] Lockfile with integrity hashes
- [x] No install hook scripts
- [x] `.env` excluded from version control

---

## Conclusion

**Rating: PASS**

The permapod-skills CLI is a secure, read-only query tool with no capability to sign transactions, manage keys, or modify on-chain state. The codebase uses only `CosmWasmClient` (read-only), validates user input at system boundaries, and has minimal dependencies with pinned versions. All five warnings are low-severity hardening suggestions, not exploitable vulnerabilities.
