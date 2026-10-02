const BECH32_CHARSET = /^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]+$/

/**
 * Validate a bech32 address format for the given prefix.
 */
export function validateAddress(address: string, prefix: string = 'zig'): void {
  if (!address) {
    throw new Error('Address is required')
  }
  const sep = address.indexOf('1')
  if (sep < 1) {
    throw new Error('Invalid address: missing bech32 separator')
  }
  const hrp = address.slice(0, sep)
  const data = address.slice(sep + 1)
  if (hrp !== prefix) {
    throw new Error(`Invalid address prefix: expected "${prefix}", got "${hrp}"`)
  }
  if (data.length < 38) {
    throw new Error(`Invalid address: data part too short (${data.length} chars, need >= 38)`)
  }
  if (!BECH32_CHARSET.test(data)) {
    throw new Error('Invalid address: contains invalid bech32 characters')
  }
}

/**
 * Ensure a contract address is configured (non-empty) for the given network.
 */
export function ensureContractAddress(address: string, contractName: string, network: string): void {
  if (!address) {
    throw new Error(
      `${contractName} contract is not configured for ${network}. This command is unavailable on ${network}.`
    )
  }
}
