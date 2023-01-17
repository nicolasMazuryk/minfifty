// Higher Timeframe Settings
export const BASE_RETRACEMENT_CONFIRMATION = 5 / 100
export const BASE_PRECEDING_BARS = 4

// Trading Rule #1
// Do not buy high
export const IGNORE_BASE_ON_TOP_PRECEDING_BARS = 30 * 60
export const IGNORE_BASE_ON_TOP_THRESHOLD = 3 / 100

// Trading Rule #2
// Bounce should be rapid, ignore weak bounces
export const BARS_UNTIL_BASE_CONFIRMATION_LIMIT = 5 // 5
