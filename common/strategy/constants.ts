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
  LIMIT = 'LIMIT',
  TAKE_PROFIT = 'TAKE_PROFIT',
  STOP_MARKET = 'STOP_MARKET',
  MARKET = 'MARKET',
}

export const ORDER_TYPE_ID_FIELD = {
  [ORDER_TYPE.LIMIT]: 'limitOrderId',
  [ORDER_TYPE.TAKE_PROFIT]: 'takeProfitOrderId',
  [ORDER_TYPE.STOP_MARKET]: 'stopLimitOrderId',
  [ORDER_TYPE.MARKET]: 'stopLimitOrderId',
}

export const ORDER_TYPE_BINANCE_ORDER_FIELD = {
  [ORDER_TYPE.LIMIT]: 'binanceLimit',
  [ORDER_TYPE.STOP_MARKET]: 'binanceStopLoss',
  [ORDER_TYPE.TAKE_PROFIT]: 'binanceTakeProfit',
}

export const ORDER_BASE_TYPES = {
  COIN: 'COIN',
  USDT: 'USDT',
}

export const ORDER_STATUS = {
  NEW: 'NEW',
  FILLED: 'FILLED',
  CANCELED: 'CANCELED',

  TAKE_PROFIT: 'TAKE_PROFIT',
  STOP_LOSS: 'STOP_LOSS',
  BREAK_EVEN: 'BREAK_EVEN',

  COMPLETED: 'COMPLETED',
  CLOSED: 'CLOSED',
  IGNORED: 'IGNORED',
}
