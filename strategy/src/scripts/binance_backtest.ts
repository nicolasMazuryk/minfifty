import { END_PERIOD_TIME, START_PERIOD_TIME } from '@common/strategy/config'
import { MARKET, ORDER_SIDE, ORDER_STATUS, ORDER_TYPE, TICKER } from '@common/strategy/constants'
import { IBar } from '@common/strategy/types'
import { logger, waitUntilArrayIsEmpty } from '@common/strategy/utils'

import {
  batchOrderParamsToFutureOrder,
  futuresOrderToOrderUpdateEvent,
  getBacktestBars,
  logStrategyPerformance,
  syncRemainingBarsUpToDate,
} from '@/scripts/helpers'
import { UNPROCESSED_ORDER_EVENT_STACK } from '@/scripts/run-real-time'

let orderIdCounter = 0

let BINANCE_OPEN_ORDERS: any = []

// let CANDLE_UPDATE_CALLBACK: any = () => {}
// eslint-disable-next-line @typescript-eslint/no-empty-function
let ORDER_UPDATE_CALLBACK: any = () => {}

const executeOrders = (bar: IBar) => {
  for (const order of BINANCE_OPEN_ORDERS) {
    if (order.side === ORDER_SIDE.BUY) {
      if (order.type === ORDER_TYPE.LIMIT) {
        if (bar.low <= Number(order.price)) {
          order.status = ORDER_STATUS.FILLED

          const event = futuresOrderToOrderUpdateEvent(order)
          ORDER_UPDATE_CALLBACK(event)
        }
      }
    }

    if (order.side === ORDER_SIDE.SELL) {
      if (order.type === ORDER_TYPE.STOP_MARKET) {
        if (bar.low <= Number(order.stopPrice)) {
          order.status = ORDER_STATUS.FILLED

          const event = futuresOrderToOrderUpdateEvent(order)
          ORDER_UPDATE_CALLBACK(event)
        }
      }

      if (order.type === ORDER_TYPE.MARKET) {
        order.status = ORDER_STATUS.FILLED
        order.price = bar.open.toString()

        const event = futuresOrderToOrderUpdateEvent(order)
        ORDER_UPDATE_CALLBACK(event)
      }

      if (order.type === ORDER_TYPE.LIMIT) {
        if (bar.high >= Number(order.price)) {
          order.status = ORDER_STATUS.FILLED

          const event = futuresOrderToOrderUpdateEvent(order)
          ORDER_UPDATE_CALLBACK(event)
        }
      }
    }
  }

  BINANCE_OPEN_ORDERS = BINANCE_OPEN_ORDERS.filter(
    (order: any) => order.status !== ORDER_STATUS.NEW,
  )
}

export const binanceBacktest = {
  run: async (strategy: any) => {
    await syncRemainingBarsUpToDate(MARKET.FUTURES, TICKER.ETH)
    logger.info('Synced remaining bars up to date')
    // await validateMarketDataIntegrity(MARKET.FUTURES, TICKER.ETH)

    logger.time('Strategy')

    const bars: IBar[] = await getBacktestBars(
      MARKET.SPOT,
      TICKER.ETH,
      START_PERIOD_TIME,
      END_PERIOD_TIME,
    )

    for (const bar of bars) {
      // CANDLE_UPDATE_CALLBACK(bar)
      await strategy.run(bar)

      executeOrders(bar)

      await waitUntilArrayIsEmpty(UNPROCESSED_ORDER_EVENT_STACK.length)
    }

    strategy.updateStatisticsOnComplete()

    await logStrategyPerformance(strategy)

    logger.timeEnd('Strategy')
  },

  futuresBatchOrders: async function ({ batchOrders }: { batchOrders: any }) {
    for (const orderParams of JSON.parse(batchOrders)) {
      orderIdCounter++

      const order = batchOrderParamsToFutureOrder(orderParams, orderIdCounter)

      BINANCE_OPEN_ORDERS.push(order)

      const event = futuresOrderToOrderUpdateEvent(order)
      ORDER_UPDATE_CALLBACK(event)
    }
  },

  futuresCancelBatchOrders: async function ({ symbol, origClientOrderIdList }: any) {
    for (const clientOrderId of JSON.parse(origClientOrderIdList)) {
      const order = BINANCE_OPEN_ORDERS.find((order: any) => order.clientOrderId === clientOrderId)

      order.status = ORDER_STATUS.CANCELED

      const event = futuresOrderToOrderUpdateEvent(order)
      ORDER_UPDATE_CALLBACK(event)
    }
  },

  ws: {
    futuresCandles: (ticker: string, period: string, callback: any) => {
      // CANDLE_UPDATE_CALLBACK = callback
    },
    futuresUser: (callback: any) => {
      ORDER_UPDATE_CALLBACK = callback
    },
  },
}
