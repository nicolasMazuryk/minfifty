export const MARKET = {
  SPOT: 'SPOT',
  FUTURES: 'FUTURES',
}

export const TICKER = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
}

export const TICKER_PRECISION = {
  [TICKER.ETH]: 3,
}

export const ORDER_SIDE = {
  BUY: 'BUY',
  SELL: 'SELL',
}

export const enum ORDER_TYPE {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT',
  STOP_MARKET = 'STOP_MARKET',
  TAKE_PROFIT = 'TAKE_PROFIT',
}

export const ORDER_BASE_TYPES = {
  COIN: 'COIN',
  USDT: 'USDT',
}

export const ORDER_STATUS = {
  OPEN: 'OPEN',
  FILLED: 'FILLED',
  COMPLETED: 'COMPLETED',
  CLOSED: 'CLOSED',
  CANCELED: 'CANCELED',
  IGNORED: 'IGNORED',
}
