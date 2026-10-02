#!/usr/bin/env node

import { marketsCommand } from './commands/markets'
import { marketCommand } from './commands/market'
import { pricesCommand, priceCommand } from './commands/prices'
import { supplyCommand } from './commands/supply'
import { yieldsCommand } from './commands/yields'
import { walletCommand } from './commands/wallet'
import { accountCommand } from './commands/account'
import { accountsCommand } from './commands/accounts'
import { rewardsCommand } from './commands/rewards'
import { vaultsCommand } from './commands/vaults'
import { dashboardCommand } from './commands/dashboard'
import { DENOM_LABELS } from './config'
import { disconnectAll } from './client'
import { validateAddress } from './validate'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const VERSION: string = require('../package.json').version

type Network = 'mainnet' | 'testnet'

function parseNetwork(args: string[]): Network {
  if (args.includes('--testnet') || args.includes('-t')) return 'testnet'
  return 'mainnet'
}

function printHelp(): void {
  console.log(`
Perma Pod CLI v${VERSION} - Query the lending/borrowing protocol on Zigchain

Usage: permapod <command> [options]

Commands:
  dashboard                    Protocol overview (TVL, rates, utilization)
  markets                      List all active markets with rates and params
  market <denom>               Deep dive on a single market
  prices                       Show oracle prices for all active assets
  price <denom>                Show price for a single asset
  supply                       Total deposits vs caps for all assets
  yields                       Supply/borrow APYs and active incentive emissions
  wallet <address>             Show deposits, debts, health for a wallet
  accounts <address>           List Credit Manager accounts for a wallet
  account <id>                 Show full position for a Credit Manager account
  rewards <address>            Show unclaimed incentive rewards
  vaults                       List vault configurations and utilization

Options:
  --testnet, -t                Query testnet instead of mainnet (default: mainnet)
  --json, -j                   Output results as JSON
  --version, -v                Show version
  --help, -h                   Show this help message

Environment Variables:
  PERMAPOD_RPC_URL             Override mainnet RPC endpoint
  PERMAPOD_TESTNET_RPC_URL     Override testnet RPC endpoint
  PERMAPOD_TIMEOUT_MS          Connection timeout in ms (default: 15000)
  PERMAPOD_MAX_RETRIES         Max retry attempts (default: 2)

Denom shortcuts (use these instead of full denom strings):
${Object.entries(DENOM_LABELS).map(([denom, label]) => `  ${label.padEnd(8)} → ${denom}`).join('\n')}

Examples:
  permapod dashboard
  permapod markets --json
  permapod market ZIG
  permapod wallet zig1abc...xyz
  permapod account 42
  permapod markets --testnet
`)
}

// Resolve denom shortcuts to full denom strings
function resolveDenom(input: string): string {
  // Check if it's a label (case-insensitive)
  const lowerInput = input.toLowerCase()
  for (const [denom, label] of Object.entries(DENOM_LABELS)) {
    if (label.toLowerCase() === lowerInput) return denom
  }
  return input
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const command = args[0]
  const network = parseNetwork(args)
  const json = args.includes('--json') || args.includes('-j')

  // Remove flags from args
  const cleanArgs = args.filter(a => !a.startsWith('-'))

  if (args.includes('--version') || args.includes('-v')) {
    console.log(VERSION)
    return
  }

  if (!command || command === 'help' || args.includes('--help') || args.includes('-h')) {
    printHelp()
    return
  }

  try {
    let result: any

    switch (command) {
      case 'dashboard':
        result = await dashboardCommand(network, json)
        break

      case 'markets':
        result = await marketsCommand(network, json)
        break

      case 'market': {
        const denom = cleanArgs[1]
        if (!denom) {
          console.error('Usage: permapod market <denom>')
          process.exit(1)
        }
        result = await marketCommand(resolveDenom(denom), network, json)
        break
      }

      case 'prices':
        result = await pricesCommand(network, json)
        break

      case 'price': {
        const denom = cleanArgs[1]
        if (!denom) {
          console.error('Usage: permapod price <denom>')
          process.exit(1)
        }
        result = await priceCommand(resolveDenom(denom), network, json)
        break
      }

      case 'supply':
        result = await supplyCommand(network, json)
        break

      case 'yields':
        result = await yieldsCommand(network, json)
        break

      case 'wallet': {
        const address = cleanArgs[1]
        if (!address) {
          console.error('Usage: permapod wallet <address>')
          process.exit(1)
        }
        validateAddress(address)
        result = await walletCommand(address, network, json)
        break
      }

      case 'accounts': {
        const owner = cleanArgs[1]
        if (!owner) {
          console.error('Usage: permapod accounts <address>')
          process.exit(1)
        }
        validateAddress(owner)
        result = await accountsCommand(owner, network, json)
        break
      }

      case 'account': {
        const accountId = cleanArgs[1]
        if (!accountId) {
          console.error('Usage: permapod account <id>')
          process.exit(1)
        }
        result = await accountCommand(accountId, network, json)
        break
      }

      case 'rewards': {
        const address = cleanArgs[1]
        if (!address) {
          console.error('Usage: permapod rewards <address>')
          process.exit(1)
        }
        validateAddress(address)
        result = await rewardsCommand(address, network, json)
        break
      }

      case 'vaults':
        result = await vaultsCommand(network, json)
        break

      default:
        console.error(`Unknown command: ${command}`)
        printHelp()
        process.exit(1)
    }

    if (json && result !== undefined) {
      console.log(JSON.stringify(result, null, 2))
    }
  } catch (error: any) {
    const message = error.message || String(error)
    if (message.includes('No such contract')) {
      console.error(`Error: Contract query failed — the contract may not be deployed on ${network}.`)
    } else {
      console.error(`Error: ${message}`)
    }
    process.exit(1)
  } finally {
    disconnectAll()
  }
}

main()
