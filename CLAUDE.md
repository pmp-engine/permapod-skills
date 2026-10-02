# permapod-skills

Read-only CLI + Claude Code skill for querying the Perma Pod protocol on Zigchain.

**Read [AGENTS.md](AGENTS.md) before making changes.** It covers architecture, command patterns, pagination, error handling, testing, and release process.

## Quick reference

```bash
yarn build            # Compile
yarn test             # 36 unit tests
yarn lint             # ESLint (0 errors expected, warnings OK)
make release-check    # Full pipeline: build → test → lint → drift-check → eval
```

## Critical rules

- **Read-only only.** No signing, no keys, no write transactions. Ever.
- **BigInt for amounts.** Always use `formatAmount` / `computeUsdValue` from `format.ts`. Never do `Number(rawAmount) / 10**6` directly.
- **Paginate everything.** Use `paginateAll` (V2 endpoints) or `paginateArray` (array endpoints). Never assume a single `limit` query returns all results.
- **Validate addresses.** Call `validateAddress()` before any wallet-level command.
- **No silent failures.** Log `console.error('Warning: ...')` when a secondary query fails. Never `.catch(() => null)` without a warning.
- **Commands return data.** Every command supports `json` parameter and returns structured data. Do not add console output in json mode.
- **Keep SKILL.md in sync.** After changing commands, flags, or denoms: update `.surface`, update `SKILL.md`, run `make drift-check`.

## Key files

| File | When to read |
|------|-------------|
| [AGENTS.md](AGENTS.md) | Before any code changes |
| [SKILL.md](SKILL.md) | When changing user-facing behavior or triggers |
| [.surface](.surface) | When adding/removing commands or flags |
| [references/query-reference.md](references/query-reference.md) | When writing contract queries |
| [references/contract-addresses.md](references/contract-addresses.md) | When adding contracts |
