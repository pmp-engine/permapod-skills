export interface ChainConfig {
  chainId: string
  rpcEndpoint: string
  prefix: string
  baseDenom: string
}

export interface ContractAddresses {
  addressProvider: string
  redBank: string
  oracle: string
  params: string
  incentives: string
  health: string
  creditManager: string
  accountNft: string
  rewardsCollector: string
  zapper: string
  astroportIncentives: string
}

export const MAINNET_CONFIG: ChainConfig = {
  chainId: 'zigchain-1',
  rpcEndpoint: process.env.PERMAPOD_RPC_URL || 'https://public-zigchain-rpc.numia.xyz',
  prefix: 'zig',
  baseDenom: 'uzig',
}

export const TESTNET_CONFIG: ChainConfig = {
  chainId: 'zig-test-2',
  rpcEndpoint: process.env.PERMAPOD_TESTNET_RPC_URL || 'https://public-zigchain-testnet-rpc.numia.xyz',
  prefix: 'zig',
  baseDenom: 'uzig',
}

export const MAINNET_ADDRESSES: ContractAddresses = {
  addressProvider: 'zig1jy2amze7fxcmessewv65jq5kupsxae2n96yech9g8d8rp5vnv74qxlddqk',
  redBank: 'zig1s3frrzltqaxvuzffvxg89uuad6nkcyqe3ucvrahynznaek3mhe4s75puyu',
  oracle: 'zig1nr48m8vv6kutnse3scxsg96pxmeyzj8hkn6rf9mstdtmmcn8h2tsm54kmz',
  params: 'zig1ma6e2dgkuu62fc66rn4msrnv89tyws75jpzz5kkk5pn4uf2cat5quevjw0',
  incentives: 'zig17etzyt9qu5dlga2d09ql34rcnkxgtwx544pp9reuqp9fmcp2lkjqdjf754',
  health: 'zig172v7euptv09z2pvj2khntlzel2fq5pcpp9g7lxpc889hvp74mjmsa5ev2p',
  creditManager: 'zig1jul327luptcp9vcl6x4ws9xh6c3seuzsmmzj8n6e6qqgdplrvnzsh4t3ky',
  accountNft: 'zig1kpeynqhd0qlq5v2yg2chja0lcakqkzvmpdl4eq573sdnh6vh7dnspd5zv9',
  rewardsCollector: 'zig1m6rezhkz28d2kk4ge25kcexzc244cses9a4d6jfqln26zqvzk80syqe6ke',
  zapper: 'zig1s36zdllvn4fvxzlq4uvsm42stt5rqz6dqsmy2l3rdu3rqjvc90kqrvw0wj',
  astroportIncentives: 'zig1qv5n95vt3zn9kgqk5py2mr3qjzg9nq95erad6uekpgls54l5tcrqrldwmq',
}

export const TESTNET_ADDRESSES: ContractAddresses = {
  addressProvider: 'zig16z5xh4l8nmy2cmmyr080fx0vydsa90nghxfe33nnqy8hmnsq284sq54ddu',
  redBank: 'zig1fjre5spw40y0yga6w6kxkvpss92fda6pjft7el2gk6p7a6zuravst3250m',
  oracle: 'zig16dra8jx99a5aqrzp758a8mh5qjp8smyeh84d3flc7jqd930kuugq7e00mw',
  params: '',
  incentives: '',
  health: '',
  creditManager: 'zig1aj3vmzgvu6ye5vlccdsn3mdxlyp8u4myp2d8435arps4660wx62s7xz7fg',
  accountNft: '',
  rewardsCollector: '',
  zapper: '',
  astroportIncentives: '',
}

// Known denom labels for human-readable display
export const DENOM_LABELS: Record<string, string> = {
  'uzig': 'ZIG',
  'coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig': 'stZIG',
  'ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4': 'USDC',
  'uusd': 'USD',
  'zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2': 'stZIG (old)',
}

// Decimals per denom (for converting raw amounts to human-readable)
export const DENOM_DECIMALS: Record<string, number> = {
  'uzig': 6,
  'coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig': 6,
  'zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2': 6,
  'ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4': 6,
  'uusd': 6,
}

// Minimum USD value threshold to filter out deprecated/dust assets
export const MIN_USD_VALUE_THRESHOLD = 10

// Max results per page for paginated contract queries (matches contract MAX_LIMIT)
export const DEFAULT_PAGE_LIMIT = 30

// Connection timeout in milliseconds
export const CONNECTION_TIMEOUT_MS = Number(process.env.PERMAPOD_TIMEOUT_MS) || 15_000

// Max retry attempts for transient failures
export const MAX_RETRIES = Number(process.env.PERMAPOD_MAX_RETRIES) || 2
