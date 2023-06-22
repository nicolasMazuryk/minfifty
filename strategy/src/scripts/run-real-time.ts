// eslint-disable-next-line import/order
import '../alias-runtime'

import Strategy from '@common/strategy'
import { MARKET, ORDER_STATUS, TICKER } from '@common/strategy/constants'
import { IBar } from '@common/strategy/types'
import { logger, wait } from '@common/strategy/utils'
import { Candle, OrderStatus, OrderUpdate } from 'binance-api-node'

import binance from './binance'
import { marketDataToBar, wsCandleToMarketData } from './helpers'
// import { TRADING_FEE } from '@common/strategy/settings'

const strategy = new Strategy()

const handleOrderUpdate = async (event: OrderUpdate) => {
  for (const order of strategy.orders) {
    if (event.clientOrderId === order.limitOrderId) {
      order.status = event.orderStatus
      order.binanceLimit = event

      if (event.orderStatus === ORDER_STATUS.FILLED) {
        if (order.level === 1) {
          order.base.isBroken = true
          order.base.baseBrokenBarIndex = strategy.barIndex
          order.base.baseBrokenTime = new Date(event.orderTime)
        }

        order.timeOpen = new Date(event.orderTime)
        order.barIndexOpen = strategy.barIndex
        // order.fee = order.amount * TRADING_FEE
        // order.feeCoin = order.fee / order.price

        const isBreakEvenRecalculated = await strategy.calculateBaseBreakEven(order.base)

        if (!isBreakEvenRecalculated) await strategy.openTakeProfitOrders([order])

        await strategy.openStopLossOrders([order])
      }

      if (event.orderStatus === ORDER_STATUS.CANCELED) {
        order.base.orders = order.base.orders.filter(
          (order) => order.status !== ORDER_STATUS.CANCELED,
        )
        strategy.orders = strategy.orders.filter((order) => order.status !== ORDER_STATUS.CANCELED)
      }
      break
    }

    if (event.clientOrderId === order.takeProfitOrderId) {
      order.binanceTakeProfit = event

      if (event.orderStatus === ORDER_STATUS.FILLED) {
        if (order.breakEven > order.takeProfit) {
          order.status = ORDER_STATUS.TAKE_PROFIT
          order.base.isClosedInProfit = true
        }
        if (order.breakEven < order.takeProfit) {
          order.status = ORDER_STATUS.BREAK_EVEN
          order.base.isClosedInBreakEven = true
        }

        order.timeClosed = new Date(event.orderTime)
        order.barIndexClosed = strategy.barIndex
        // order.fee = order.fee + order.quantity * order.takeProfit * TRADING_FEE
        // order.PNL = (order.takeProfit - order.price) * order.quantity - order.fee
        // order.feeCoin = order.fee / order.takeProfit
        // order.PNLCoin = order.PNL / order.takeProfit

        await strategy.cancelBaseOrders(order.base)
        await strategy.cancelStopLossOrders(order.base)
      }
      break
    }

    if (event.clientOrderId === order.stopLimitOrderId) {
      order.binanceStopLoss = event

      if (event.orderStatus === ORDER_STATUS.FILLED) {
        order.status = ORDER_STATUS.STOP_LOSS

        order.timeClosed = new Date(event.orderTime)
        order.barIndexClosed = strategy.barIndex
        // order.fee = order.fee + order.quantity * order.stopLoss * TRADING_FEE
        // order.PNL = (order.stopLoss - order.price) * order.quantity - order.fee
        // order.feeCoin = order.fee / order.stopLoss
        // order.PNLCoin = order.PNL / order.stopLoss

        // needed to display sell order on chart. TODO: refactor
        order.takeProfit = order.stopLoss

        await strategy.cancelTakeProfitOrders(order.base)
        await strategy.cancelBaseOrders(order.base)

        order.base.isClosedInLoss = true
      }
      break
    }
  }
}

// --------------------
const UNPROCESSED_BARS_STACK: IBar[] = []

let isProcessingBarsStack = false
const runUnprocessedBarsStack = async () => {
  isProcessingBarsStack = true
  while (UNPROCESSED_BARS_STACK.length > 0) {
    const bar = UNPROCESSED_BARS_STACK.shift()

    await strategy.run(bar!)
  }
  isProcessingBarsStack = false
}

setInterval(async () => {
  if (isProcessingBarsStack) return
  await runUnprocessedBarsStack()
}, 500)

// --------------------
const UNPROCESSED_ORDER_EVENT_STACK: OrderUpdate[] = []

let isProcessingOrderEventStack = false
const runUnprocessedOrderEventStack = async () => {
  isProcessingOrderEventStack = true
  while (UNPROCESSED_ORDER_EVENT_STACK.length > 0) {
    const event = UNPROCESSED_ORDER_EVENT_STACK.shift()

    await handleOrderUpdate(event!)
  }
  isProcessingOrderEventStack = false
}

setInterval(async () => {
  if (isProcessingOrderEventStack) return
  await runUnprocessedOrderEventStack()
}, 500)
// --------------------
;(async () => {
  strategy.isRealTime = true

  binance.ws.futuresCandles(TICKER.ETH, '1m', async (candle: Candle) => {
    const marketData = wsCandleToMarketData(MARKET.FUTURES, candle)
    const bar = marketDataToBar(marketData)

    UNPROCESSED_BARS_STACK.push(bar)
  })

  binance.ws.futuresUser(async (msg) => {
    if (msg.eventType !== 'ORDER_TRADE_UPDATE') return
    if ([OrderStatus.PARTIALLY_FILLED, OrderStatus.PENDING_CANCEL].includes(msg.orderStatus)) return
    if ([OrderStatus.REJECTED].includes(msg.orderStatus)) {
      logger.error(`UNEXPECTED ORDER STATUS: ${msg.orderStatus}`, msg)
    }

    UNPROCESSED_ORDER_EVENT_STACK.push(msg)

    logger.info(msg)

    // const marketData = wsCandleToMarketData(MARKET.FUTURES, candle)
    // const bar = marketDataToBar(marketData)
    //
    // await strategy.run(bar)
  })

  logger.info('Started real-time mode')

  await wait(1000 * 60 * 60 * 24 * 7) // wait for 7 days
})().catch(logger.error)
