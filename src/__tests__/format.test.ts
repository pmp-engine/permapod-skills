import { formatAmount, formatPercent, formatUsd, formatPrice, computeUsdValue, denomLabel } from '../format'

describe('formatAmount', () => {
  it('converts micro amounts to human readable', () => {
    expect(formatAmount('1000000', 'uzig')).toBe('1.00')
  })

  it('handles zero', () => {
    expect(formatAmount('0', 'uzig')).toBe('0.00')
  })

  it('handles empty string', () => {
    expect(formatAmount('', 'uzig')).toBe('0.00')
  })

  it('handles sub-unit amounts', () => {
    expect(formatAmount('500000', 'uzig')).toBe('0.50')
  })

  it('handles large amounts with BigInt precision', () => {
    // 9007199254740993 is 2^53 + 1, which Number cannot represent exactly
    // With precision=6 we see all fractional digits preserved via BigInt
    const result = formatAmount('9007199254740993', 'uzig', 6)
    expect(result).toBe('9,007,199,254.740993')
  })

  it('handles large amounts with default precision', () => {
    const result = formatAmount('9007199254740993', 'uzig')
    expect(result).toBe('9,007,199,254.74')
  })

  it('falls back to 6 decimals for unknown denoms', () => {
    expect(formatAmount('1000000', 'unknown_denom')).toBe('1.00')
  })

  it('respects custom precision', () => {
    expect(formatAmount('1234567', 'uzig', 4)).toBe('1.2345')
  })

  it('handles precision of 0', () => {
    expect(formatAmount('1500000', 'uzig', 0)).toBe('1')
  })
})

describe('formatPercent', () => {
  it('converts decimal to percentage', () => {
    expect(formatPercent('0.05')).toBe('5.00%')
  })

  it('handles zero', () => {
    expect(formatPercent('0')).toBe('0.00%')
  })

  it('handles 100%', () => {
    expect(formatPercent('1')).toBe('100.00%')
  })

  it('respects custom precision', () => {
    expect(formatPercent('0.12345', 4)).toBe('12.3450%')
  })
})

describe('formatUsd', () => {
  it('formats USD values', () => {
    expect(formatUsd(1234.56)).toBe('$1,234.56')
  })

  it('handles zero', () => {
    expect(formatUsd(0)).toBe('$0')
  })

  it('handles large values', () => {
    const result = formatUsd(1000000)
    expect(result).toBe('$1,000,000')
  })
})

describe('formatPrice', () => {
  it('formats oracle prices', () => {
    expect(formatPrice('1.5')).toBe('$1.500000')
  })

  it('respects custom precision', () => {
    expect(formatPrice('1.23456789', 4)).toBe('$1.2346')
  })
})

describe('computeUsdValue', () => {
  it('computes USD value correctly', () => {
    const result = computeUsdValue('1000000', '1.5', 'uzig')
    expect(result).toBeCloseTo(1.5)
  })

  it('handles zero amount', () => {
    expect(computeUsdValue('0', '1.5', 'uzig')).toBe(0)
  })

  it('handles zero price', () => {
    expect(computeUsdValue('1000000', '0', 'uzig')).toBe(0)
  })

  it('handles large amounts with BigInt precision', () => {
    // 9007199254740993 micro = 9007199254.740993 tokens
    const result = computeUsdValue('9007199254740993', '1.0', 'uzig')
    expect(result).toBeCloseTo(9007199254.740993, 0)
  })

  it('falls back for non-integer amount strings', () => {
    // Non-integer strings fall through to Number-based calculation
    const result = computeUsdValue('1.5', '2.0', 'uzig')
    expect(result).toBeCloseTo(0.000003)
  })
})

describe('denomLabel', () => {
  it('returns label for known denoms', () => {
    expect(denomLabel('uzig')).toBe('ZIG')
  })

  it('truncates long IBC denoms', () => {
    const ibcDenom = 'ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4'
    expect(denomLabel(ibcDenom)).toBe('USDC')
  })

  it('truncates unknown long denoms', () => {
    const longDenom = 'ibc/UNKNOWN1234567890ABCDEF'
    const result = denomLabel(longDenom)
    expect(result).toMatch(/^ibc\/\.\.\./)
  })

  it('returns short denoms as-is', () => {
    expect(denomLabel('uatom')).toBe('uatom')
  })
})
