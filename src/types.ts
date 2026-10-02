// Shared response types from on-chain queries.
// Kept minimal -- only the fields commands actually use.

export interface MarketV2Response {
  denom: string
  collateral_total_amount: string
  debt_total_amount: string
  utilization_rate: string
  borrow_rate: string
  liquidity_rate: string
  reserve_factor: string
  interest_rate_model: InterestRateModel
}

export interface InterestRateModel {
  base: string
  optimal_utilization_rate: string
  slope_1: string
  slope_2: string
}

export interface AssetParams {
  denom: string
  max_loan_to_value: string
  liquidation_threshold: string
  deposit_cap: string
  close_factor: string
  protocol_liquidation_fee: string
  red_bank: RedBankSettings
  credit_manager: CmSettings
  liquidation_bonus: LiquidationBonus
}

export interface RedBankSettings {
  deposit_enabled: boolean
  borrow_enabled: boolean
  withdraw_enabled: boolean
}

export interface CmSettings {
  whitelisted: boolean
  withdraw_enabled: boolean
}

export interface LiquidationBonus {
  max_lb: string
  min_lb: string
  slope: string
  starting_lb: string
}

export interface TotalDepositResponse {
  denom: string
  amount: string
  cap: string
}

export interface UserCollateralResponse {
  denom: string
  amount: string
  amount_scaled: string
  enabled: boolean
}

export interface UserDebtResponse {
  denom: string
  amount: string
  amount_scaled: string
  uncollateralized: boolean
}

export type UserHealthStatus =
  | 'not_borrowing'
  | { borrowing: { max_ltv_hf: string; liq_threshold_hf: string } }

export interface UserPositionResponse {
  total_enabled_collateral: string
  total_collateralized_debt: string
  weighted_max_ltv_collateral: string
  weighted_liquidation_threshold_collateral: string
  health_status: UserHealthStatus
}

export interface ActiveEmission {
  denom: string
  emission_rate: string
}

export interface Coin {
  denom: string
  amount: string
}

export interface Account {
  id: string
  kind: string
}

export interface Positions {
  account_id: string
  account_kind: string
  deposits: Coin[]
  debts: DebtAmount[]
  lends: Coin[]
  vaults: unknown[]
  staked_astro_lps: Coin[]
}

export interface DebtAmount {
  denom: string
  shares: string
  amount: string
}

export interface VaultConfig {
  addr: string
  deposit_cap: Coin
  max_loan_to_value: string
  liquidation_threshold: string
  whitelisted: boolean
}

export interface VaultUtilizationResponse {
  vault: { address: string }
  utilization: Coin
}
