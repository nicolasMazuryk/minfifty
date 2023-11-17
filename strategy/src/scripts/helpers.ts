import fs from 'fs'
import path from 'path'

import Strategy from '@common/strategy'
import { ORDER_STATUS, ORDER_TYPE } from '@common/strategy/constants'
import { IBar, IBase, IMarketData } from '@common/strategy/types'
import { countMinutes, logger, roundEpochToFullMinute, sum } from '@common/strategy/utils'
import { Candle, CandleChartResult, OrderSide, OrderUpdate } from 'binance-api-node'
import Sequelize from 'sequelize'

import { MarketData } from '@/models'
import { UNPROCESSED_ORDER_EVENT_STACK } from '@/scripts/run-real-time'

import binance from './binance'

const { Op } = Sequelize

const writeFileAsync = fs.promises.writeFile

const destFolder = path.join(__dirname, './performance')

export const candleToMarketData = (
  market: string,
  ticker: string,
  candle: CandleChartResult,
): IMarketData => {
  const {
    openTime,
    open,
    high,
    low,
    close,
    volume,
    closeTime,
    quoteVolume,
    trades,
    baseAssetVolume,
    quoteAssetVolume,
  } = candle

  return {
    market,
    ticker,
    time: new Date(openTime),
    timestamp: openTime,
    open,
    high,
    low,
    close,
    volume,
    timeClose: new Date(closeTime),
    timestampClose: closeTime,
    quoteAssetVolume: quoteVolume,
    trades,
    takerBuyBaseAssetVolume: baseAssetVolume,
    takerBuyQuoteAssetVolume: quoteAssetVolume,
  }
}

export const wsCandleToMarketData = (market: string, candle: Candle): IMarketData => {
  const {
    symbol,
    startTime,
    closeTime,
    open,
    high,
    low,
    close,
    volume,
    trades,
    quoteVolume,
    buyVolume,
    quoteBuyVolume,
    isFinal,
  } = candle

  return {
    market,
    ticker: symbol,
    time: new Date(startTime),
    timestamp: startTime,
    open,
    high,
    low,
    close,
    volume,
    timeClose: new Date(closeTime),
    timestampClose: closeTime,
    quoteAssetVolume: quoteVolume,
    trades,
    takerBuyBaseAssetVolume: buyVolume,
    takerBuyQuoteAssetVolume: quoteBuyVolume,
    isFinal,
  }
}

export const marketDataToBar = ({
  time,
  open,
  high,
  low,
  close,
  volume,
  isFinal,
}: IMarketData): IBar => ({
  time: new Date(time),
  open: parseFloat(open),
  high: parseFloat(high),
  low: parseFloat(low),
  close: parseFloat(close),
  volume: parseFloat(volume),
  isFinal: isFinal,
})

export const barToWsCandle = ({
  time,
  open,
  high,
  low,
  close,
  volume,
  isFinal,
}: IMarketData): Candle => ({
  eventType: 'kline',
  eventTime: new Date(time).getTime(),
  symbol: 'ETHUSDT',
  startTime: new Date(time).getTime(),
  closeTime: new Date(time).getTime(),
  firstTradeId: 0,
  lastTradeId: 0,
  open: open.toString(),
  high: high.toString(),
  low: low.toString(),
  close: close.toString(),
  volume: volume.toString(),
  trades: 0,
  interval: '1m',
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  isFinal: isFinal,
  quoteVolume: '0',
  buyVolume: '0',
  quoteBuyVolume: '0',
})

export const batchOrderParamsToFutureOrder = (orderParams: any, orderIdCounter: number) => ({
  orderId: orderIdCounter,
  symbol: orderParams.symbol,
  status: 'NEW',
  clientOrderId: orderParams.newClientOrderId,
  price: orderParams.price,
  avgPrice: '0.00000',
  origQty: orderParams.quantity,
  executedQty: '0',
  cumQty: '0',
  cumQuote: '0',
  timeInForce: 'GTC',
  type: orderParams.type,
  reduceOnly: false,
  closePosition: false,
  side: orderParams.side,
  positionSide: 'BOTH',
  // REVIEW
  stopPrice: orderParams.stopPrice === '0' ? orderParams.takeProfit : orderParams.stopPrice,
  workingType: 'CONTRACT_PRICE',
  priceProtect: false,
  origType: orderParams.type,
  updateTime: Date.now(),
})

export const futuresOrderToOrderUpdateEvent = (order: any) => ({
  eventType: 'ORDER_TRADE_UPDATE',
  eventTime: Date.now(),
  transactionTime: order.updateTime,
  symbol: order.symbol,
  clientOrderId: order.clientOrderId,
  side: order.side,
  orderType: order.type,
  timeInForce: order.timeInForce,
  quantity: order.origQty,
  price: order.price,
  averagePrice: order.avgPrice,
  stopPrice: order.stopPrice,
  executionType: order.status,
  orderStatus: order.status,
  orderId: order.orderId,
  lastTradeQuantity: '0',
  totalTradeQuantity: '0',
  priceLastTrade: '0',
  commissionAsset: 'USDT',
  commission: '0',
  orderTime: order.updateTime,
  tradeId: 0,
  bidsNotional: '0',
  asksNotional: '0',
  isMaker: false,
  isReduceOnly: false,
  workingType: 'CONTRACT_PRICE',
  originalOrderType: order.type,
  positionSide: order.positionSide,
  closePosition: false,
  activationPrice: undefined,
  callbackRate: undefined,
  realizedProfit: '0',
})

export const getBacktestBars = async (
  market: string,
  ticker: string,
  startDate: string | Date,
  endDate: string | Date,
): Promise<IBar[]> => {
  const marketData = await MarketData.findAll({
    where: {
      market,
      ticker,
      timestamp: {
        [Op.gte]: new Date(startDate).getTime(),
        [Op.lte]: new Date(endDate).getTime(),
      },
    },
    order: [['timestamp', 'ASC']],
    raw: true,
  })

  return marketData.map(marketDataToBar)
}

// query the first and the last record in marketData and return the difference in minutes
export const validateMarketDataIntegrity = async (market: string, ticker: string) => {
  const firstRecord = await MarketData.findOne({
    where: {
      market,
      ticker,
    },
    order: [['timestamp', 'ASC']],
    raw: true,
  })
  const lastRecord = await MarketData.findOne({
    where: {
      market,
      ticker,
    },
    order: [['timestamp', 'DESC']],
    raw: true,
  })
  const totalRecords = await MarketData.count({
    where: {
      market,
      ticker,
    },
  })
  if (!firstRecord || !lastRecord) return 0

  const totalMinutes = countMinutes(firstRecord.time, lastRecord.time)

  if (totalMinutes !== totalRecords) {
    throw new Error(
      `MarketData for ${ticker} is not complete. Total minutes: ${totalMinutes}, total records: ${totalRecords}`,
    )
  }
}

export async function syncRemainingBarsUpToDate(market: string, ticker: string) {
  const latestCandle = await MarketData.findOne({
    order: [['timestamp', 'DESC']],
  })
  if (!latestCandle) return

  const startTime = +latestCandle.timestamp
  const endTime = Date.now()
  const interval = 1000 * 60 * 500 // 500 minutes
  for (let i = startTime; i < endTime; i += interval) {
    const start = i + 60 * 1000
    const end = i + interval <= Date.now() ? i + interval : Date.now()

    const endTimestamp = Math.max(startTime, roundEpochToFullMinute(end) - 60 * 1000)

    if (endTimestamp <= start) return
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const remainingCandles: CandleChartResult[] = await binance.futuresCandles({
      symbol: ticker,
      interval: '1m',
      startTime: start,
      endTime: endTimestamp,
    })

    const marketData: any[] = remainingCandles.map((candle) =>
      candleToMarketData(market, ticker, candle),
    )
    await MarketData.bulkCreate(marketData)
  }
}

export const logStrategyPerformance = async (strategy: Strategy) => {
  const strategyPerformance = {
    ...strategy.realTimeStatistics,
    ...strategy.statistics,
  }

  if (!fs.existsSync(destFolder)) {
    fs.mkdirSync(destFolder)
  }

  const fileName = `${new Date()
    .toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
    })
    .replace('/', '-')} ${new Date().toLocaleTimeString('en-GB', { hour12: false })}.json`

  const destFile = path.join(destFolder, fileName)

  await writeFileAsync(destFile, JSON.stringify(strategyPerformance, null, 2))

  logger.info(strategyPerformance)
}

export const isAllOpenOrdersClosed = (base: IBase, type: ORDER_TYPE) => {
  const orderStatuses =
    type === ORDER_TYPE.TAKE_PROFIT
      ? [ORDER_STATUS.FILLED, ORDER_STATUS.TAKE_PROFIT, ORDER_STATUS.BREAK_EVEN]
      : [ORDER_STATUS.FILLED, ORDER_STATUS.STOP_LOSS]

  const limitOrders = base.orders.filter((order) => orderStatuses.includes(order.status))

  return sum(limitOrders.map((order) => order.quantity)) === base.quantity
}

export const sortUnprocessedEvents = (unprocessedOrderEventStack: OrderUpdate[]) =>
  unprocessedOrderEventStack.sort((a: OrderUpdate, b: OrderUpdate) => {
    if (a.side === 'BUY' && a.orderType === 'LIMIT' && a.orderStatus === 'NEW') return -1
    if (b.side === 'BUY' && b.orderType === 'LIMIT' && b.orderStatus === 'NEW') return 1

    if (a.side === 'BUY' && a.orderType === 'LIMIT' && a.orderStatus === 'FILLED') return -1
    if (b.side === 'BUY' && b.orderType === 'LIMIT' && b.orderStatus === 'FILLED') return 1

    if (a.side === 'SELL' && a.orderType === 'STOP_MARKET' && a.orderStatus === 'NEW') return -1
    if (b.side === 'SELL' && b.orderType === 'STOP_MARKET' && b.orderStatus === 'NEW') return 1

    if (a.side === 'SELL' && a.orderType === 'LIMIT' && a.orderStatus === 'NEW') return -1
    if (b.side === 'SELL' && b.orderType === 'LIMIT' && b.orderStatus === 'NEW') return 1

    if (a.side === 'SELL' && a.orderType === 'MARKET' && a.orderStatus === 'NEW') return -1
    if (b.side === 'SELL' && b.orderType === 'MARKET' && b.orderStatus === 'NEW') return 1

    if (a.side === 'SELL' && a.orderType === 'MARKET' && a.orderStatus === 'FILLED') return -1
    if (b.side === 'SELL' && b.orderType === 'MARKET' && b.orderStatus === 'FILLED') return 1

    if (a.side === 'SELL' && a.orderType === 'LIMIT' && a.orderStatus === 'FILLED') return -1
    if (b.side === 'SELL' && b.orderType === 'LIMIT' && b.orderStatus === 'FILLED') return 1

    if (a.side === 'BUY' && a.orderType === 'LIMIT' && a.orderStatus === 'CANCELED') return -1
    if (b.side === 'BUY' && b.orderType === 'LIMIT' && b.orderStatus === 'CANCELED') return 1

    if (a.side === 'SELL' && a.orderType === 'STOP_MARKET' && a.orderStatus === 'CANCELED')
      return -1
    if (b.side === 'SELL' && b.orderType === 'STOP_MARKET' && b.orderStatus === 'CANCELED') return 1

    if (a.side === 'SELL' && a.orderType === 'LIMIT' && a.orderStatus === 'CANCELED') return -1
    if (b.side === 'SELL' && b.orderType === 'LIMIT' && b.orderStatus === 'CANCELED') return 1

    return Number(b.price) - Number(a.price)

    // return 0
  })

export const isTakeProfitOrderTriggered = (base: IBase) => {
  const sellLimitFilledEventIds = UNPROCESSED_ORDER_EVENT_STACK.filter(
    (event) =>
      event.side === OrderSide.SELL &&
      event.orderType === ORDER_TYPE.LIMIT &&
      event.orderStatus === ORDER_STATUS.FILLED,
  ).map((event) => event.clientOrderId)

  if (!sellLimitFilledEventIds.length) return false

  return sellLimitFilledEventIds.includes(base.takeProfitOrderId)
}

export const isStopLossOrderTriggered = (base: IBase) => {
  const sellMarketFilledEventIds = UNPROCESSED_ORDER_EVENT_STACK.filter(
    (event) =>
      event.side === OrderSide.SELL &&
      event.orderType === ORDER_TYPE.MARKET &&
      event.orderStatus === ORDER_STATUS.FILLED,
  ).map((event) => event.clientOrderId)

  if (!sellMarketFilledEventIds.length) return false

  return sellMarketFilledEventIds.includes(base.stopLimitOrderId)
}
