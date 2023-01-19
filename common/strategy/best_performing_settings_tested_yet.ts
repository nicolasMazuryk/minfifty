// Strategy Settings
export const INITIAL_CAPITAL = 1000
export const ORDER_QUANTITY = 0.025
export const TRADING_FEE = 0.02 / 100

export const BASE_RETRACEMENT_CONFIRMATION = 0.5 / 100 // 0.6
export const BASE_PRECEDING_BARS = 10 // 10 // before base

export const NUMBER_OF_LEVELS = 10
export const LEVEL_STEP = 0.5 / 100
export const LEVEL_STEP_MULTIPLIER = 1

export const ORDER_NUMBER_OF_LEVELS = 44 // 4
export const ORDER_LEVEL_STEP = 0.15 / 100 // 0.15
export const ORDER_LEVEL_STOP_LOSS = 7 / 100 // 2
export const ORDER_OPEN_TRADE_WINDOW_BARS = 20 // 20 after base
export const ORDER_BREAK_EVEN_CLOSE_TRIGGER = 1 / 100 // (0.7%) 1%

export const EMERGENCY_LEVEL_NUMBER = 10
export const EMERGENCY_TAKE_PROFIT_RETRACEMENT = 0 / 100
export const TAKE_PROFIT_BELOW_BASE = 0.00 / 100 // 0.01% 0.02% 0.05%
export const BASE_BARS_LENGTH_LIMIT = 0

export const LEVERAGE_X = 2
export const MAINTANANCE_MARGIN = 20 / 100

// Trading Rule #1
// Do not buy high
export const IGNORE_BASE_ON_TOP_PRECEDING_BARS = 24 * 60 // before base
export const IGNORE_BASE_ON_TOP_THRESHOLD = 3 / 100 // 3%

// Trading Rule #2
// Bounce should be rapid, ignore weak bounces
export const BARS_UNTIL_BASE_CONFIRMATION_LIMIT = 5 // 5 // after base

// Trading Rule #3
// Do not buy if the price is too close to the base
export const IGNORE_TRADING_LEVEL_CLOSE_TO_BASE = 1

// Trading Rule #4
// Once warning level is reached, to reduce risk Take Profit is set to 80% from Base (0) or Level_1 (1)
export const WARNING_TAKE_PROFIT_BASE_LEVEL = 0
export const WARNING_TAKE_PROFIT_WARNING_LEVEL = 2
export const WARNING_TAKE_PROFIT_PERCENT = 100 / 100

// Trading Rule #5
// Stop Loss is dynamic and is multiplied on the size of the Base Bounce
export const STOP_LOSS_BASE_BOUNCE_MULTIPLIER = 4

// Trading Rule #6
// Global Base: everywhere near ABOVE the base OR BELOW the base on 1H timeframe you can open the trade on 1m timeframe
export const GLOBAL_BASE_ABOVE_BASE_ALLOWED_THRESHOLD = 0 / 100

// Trading Rule #7
// adjust Base to new swing low if Base was not broken
// and is floating between Base and Level 1 and if it goes more than 0.1% down and come back to the Base Line
export const FLOAT_BELOW_BASE_ADJUSTMENT_THRESHOLD = 0.0001 / 100
