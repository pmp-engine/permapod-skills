import { validateAddress, ensureContractAddress } from '../validate'

describe('validateAddress', () => {
  it('accepts valid user addresses', () => {
    // Shorter user address (zig1 + 38 chars)
    expect(() => validateAddress('zig1jy2amze7fxcmessewv65jq5kupsxae2n96yech')).not.toThrow()
  })

  it('accepts valid contract addresses', () => {
    expect(() =>
      validateAddress('zig1jy2amze7fxcmessewv65jq5kupsxae2n96yech9g8d8rp5vnv74qxlddqk'),
    ).not.toThrow()
  })

  it('rejects empty addresses', () => {
    expect(() => validateAddress('')).toThrow('Address is required')
  })

  it('rejects addresses with wrong prefix', () => {
    expect(() =>
      validateAddress('cosmos1jy2amze7fxcmessewv65jq5kupsxae2n96yech'),
    ).toThrow('expected "zig"')
  })

  it('rejects addresses that are too short', () => {
    expect(() => validateAddress('zig1abc')).toThrow('too short')
  })

  it('rejects addresses with invalid bech32 characters', () => {
    // 'b', 'i', 'o', '1' are not valid bech32 data characters
    expect(() =>
      validateAddress('zig1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'),
    ).toThrow('invalid bech32 characters')
  })

  it('supports custom prefix', () => {
    expect(() =>
      validateAddress('cosmos1jy2amze7fxcmessewv65jq5kupsxae2n96yech', 'cosmos'),
    ).not.toThrow()
  })
})

describe('ensureContractAddress', () => {
  it('passes for non-empty addresses', () => {
    expect(() =>
      ensureContractAddress('zig1abc...', 'RedBank', 'mainnet'),
    ).not.toThrow()
  })

  it('throws for empty addresses', () => {
    expect(() =>
      ensureContractAddress('', 'Params', 'testnet'),
    ).toThrow('not configured for testnet')
  })
})
