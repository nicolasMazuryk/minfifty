export const MARKET = {
  SPOT: 'SPOT',
  FUTURES: 'FUTURES',
}

export const TICKER = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
}

export const TICKER_PRECISION = {
  [TICKER.ETH]: 2,
}

export const ORDER_SIDE = {
  BUY: 'BUY',
  SELL: 'SELL',
}

export const ORDER_TYPE = {
  MARKET: 'MARKET',
  LIMIT: 'LIMIT',
}

export const ORDER_STATUS = {
  OPEN: 'OPEN',
  FILLED: 'FILLED',
  COMPLETED: 'COMPLETED',
  CLOSED: 'CLOSED',
  CANCELED: 'CANCELED',
  IGNORED: 'IGNORED',
}
