import { DENOM_LABELS, DENOM_DECIMALS } from './config'

// Convert a denom to its human-readable label
export function denomLabel(denom: string): string {
  return DENOM_LABELS[denom] || truncateDenom(denom)
}

// Truncate long IBC/factory denoms for display
function truncateDenom(denom: string): string {
  if (denom.length <= 16) return denom
  if (denom.startsWith('ibc/')) return `ibc/...${denom.slice(-6)}`
  if (denom.startsWith('coin.')) return `coin/...${denom.slice(-8)}`
  return `${denom.slice(0, 8)}...${denom.slice(-6)}`
}

// Convert raw micro-amount string to human-readable with decimals (BigInt-safe)
export function formatAmount(raw: string, denom: string, precision: number = 2): string {
  const decimals = DENOM_DECIMALS[denom] ?? 6
  try {
    const rawBig = BigInt(raw || '0')
    const isNeg = rawBig < 0n
    const abs = isNeg ? -rawBig : rawBig
    const divisor = BigInt(10 ** decimals)
    const whole = abs / divisor
    const frac = abs % divisor
    const fracStr = frac.toString().padStart(decimals, '0').slice(0, precision)
    const wholeStr = Number(whole).toLocaleString('en-US')
    const sign = isNeg ? '-' : ''
    return precision > 0 ? `${sign}${wholeStr}.${fracStr}` : `${sign}${wholeStr}`
  } catch {
    // Fallback for non-integer strings
    const num = Number(raw) / Math.pow(10, decimals)
    if (isNaN(num)) return '0.' + '0'.repeat(precision)
    return num.toLocaleString('en-US', { minimumFractionDigits: precision, maximumFractionDigits: precision })
  }
}

// Convert Decimal string (0-1 range) to percentage string
export function formatPercent(decimal: string, precision: number = 2): string {
  const pct = Number(decimal) * 100
  return `${pct.toFixed(precision)}%`
}

// Format a number as a USD string
export function formatUsd(value: number, precision: number = 2): string {
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: precision })}`
}

// Format oracle price
export function formatPrice(priceStr: string, precision: number = 6): string {
  const price = Number(priceStr)
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: precision, maximumFractionDigits: precision })}`
}

// Simple table printer - column-aligned output
export function printTable(headers: string[], rows: string[][]): void {
  const colCount = headers.length
  const colWidths = headers.map((h, i) => {
    const maxDataWidth = rows.reduce((max, row) => {
      const cell = i < row.length ? (row[i] || '') : ''
      return Math.max(max, cell.length)
    }, 0)
    return Math.max(h.length, maxDataWidth) + 2
  })

  const headerLine = headers.map((h, i) => h.padEnd(colWidths[i])).join('')
  const separator = colWidths.map(w => '-'.repeat(w)).join('')

  console.log('')
  console.log(headerLine)
  console.log(separator)
  rows.forEach(row => {
    const line = Array.from({ length: colCount }, (_, i) => {
      const cell = i < row.length ? (row[i] || '') : ''
      return cell.padEnd(colWidths[i])
    }).join('')
    console.log(line)
  })
  console.log('')
}

// Print a key-value section
export function printSection(title: string, entries: [string, string][]): void {
  console.log(`\n--- ${title} ---`)
  const maxKeyLen = entries.reduce((max, [k]) => Math.max(max, k.length), 0)
  entries.forEach(([key, value]) => {
    console.log(`  ${key.padEnd(maxKeyLen + 2)} ${value}`)
  })
}

// Compute USD value of an amount given price and denom decimals (BigInt-safe)
export function computeUsdValue(amount: string, price: string, denom: string): number {
  const decimals = DENOM_DECIMALS[denom] ?? 6
  try {
    const amountBig = BigInt(amount || '0')
    const isNeg = amountBig < 0n
    const abs = isNeg ? -amountBig : amountBig
    const divisor = BigInt(10 ** decimals)
    const whole = Number(abs / divisor)
    const frac = Number(abs % divisor) / (10 ** decimals)
    const humanAmount = whole + frac
    return (isNeg ? -humanAmount : humanAmount) * Number(price)
  } catch {
    const amountNum = Number(amount) / Math.pow(10, decimals)
    return amountNum * Number(price)
  }
}
