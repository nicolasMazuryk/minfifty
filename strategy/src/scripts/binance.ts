import * as process from 'process'

import { ORDER_TYPE, ORDER_TYPE_ID_FIELD, TICKER } from '@common/strategy/constants'
import { IOrder } from '@common/strategy/types'
import { chunkArray, logger } from '@common/strategy/utils'
import Binance, { NewFuturesOrder, OrderSide, TimeInForce } from 'binance-api-node'
import dotenv from 'dotenv-safe'

import '../alias-runtime'

import { binanceMocked } from './binance_mock'

dotenv.config({ allowEmptyValues: true })

const binance = Binance({
  apiKey: process.env.BINANCE_API_KEY,
  apiSecret: process.env.BINANCE_API_SECRET,
  httpBase: process.env.BINANCE_SPOT_API_URL,
  wsBase: process.env.BINANCE_SPOT_WS_URL,
  httpFutures: process.env.BINANCE_FUTURES_API_URL,
  wsFutures: process.env.BINANCE_FUTURES_WS_URL,
})

const getBinance = () => {
  if (process.env.NODE_ENV === 'backtest') return binanceMocked

  return binance
}

const OPEN_BATCH_ORDERS_BINANCE_LIMIT = 5
const CANCEL_BATCH_ORDERS_BINANCE_LIMIT = 10

const getOrderOptionsByType = (order: IOrder, type: ORDER_TYPE) => {
  if (type === ORDER_TYPE.LIMIT) {
    return {
      symbol: TICKER.ETH,
      side: OrderSide.BUY,
      type: ORDER_TYPE.LIMIT,
      timeInForce: TimeInForce.GTC,
      quantity: order.quantity.toString(),
      price: order.price.toString(),
      newClientOrderId: order.limitOrderId,
    }
  }

  if (type === ORDER_TYPE.STOP_MARKET) {
    return {
      symbol: TICKER.ETH,
      type: ORDER_TYPE.STOP_MARKET,
      side: OrderSide.SELL,
      quantity: order.quantity.toString(),
      stopPrice: order.stopLoss.toString(),
      // takeProfit: (999999).toString(),
      newClientOrderId: order.stopLimitOrderId,
    }
  }

  if (type === ORDER_TYPE.TAKE_PROFIT) {
    return {
      symbol: TICKER.ETH,
      side: OrderSide.SELL,
      type: ORDER_TYPE.LIMIT,
      timeInForce: TimeInForce.GTC,
      quantity: order.quantity.toString(),
      price: order.takeProfit.toString(),
      newClientOrderId: order.takeProfitOrderId,
    }
  }
  // in case price is below STOP_MARKET SELL stopPrice - the order will fail. We need to forcefully close the loss using MARKET order
  if (type === ORDER_TYPE.MARKET) {
    return {
      symbol: TICKER.ETH,
      side: OrderSide.SELL,
      type: ORDER_TYPE.MARKET,
      quantity: order.quantity.toString(),
      newClientOrderId: order.stopLimitOrderId,
    }
  }
}

const handleFailedToPlaceStopMarketOrderBinanceError = async (
  responseItem: any,
  orderRequestParams: any,
  order: IOrder,
) => {
  const errorCode = -2021 // 'Order would immediately trigger.'

  if (responseItem.code !== errorCode) return responseItem
  if (orderRequestParams.type === ORDER_TYPE.STOP_MARKET) {
    await openBatchOrders([order], ORDER_TYPE.MARKET)
  }
  return responseItem
}

export const handleBinanceError = async (response: any[], request: any[], orders: IOrder[]) =>
  response
    .map(async (responseItem: any, index: number) => {
      // log error, add original orders to logs
      if (responseItem.code) {
        logger.error({
          error: responseItem,
          request: request[index],
          orders: orders[index],
          // log JSON.stringify(this) as well
        })

        await handleFailedToPlaceStopMarketOrderBinanceError(
          responseItem,
          request[index],
          orders[index],
        )
      }

      return responseItem
    })
    .filter(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      (responseItem) => !responseItem.code,
    )

const logBatchOrdersArguments = (action: string, orders: IOrder[], type: ORDER_TYPE) => {
  logger.info(
    action,
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    orders.map((order) => `${type} ${order[ORDER_TYPE_ID_FIELD[type]]}`),
  )
}

export async function openBatchOrders(orders: IOrder[], type: ORDER_TYPE) {
  logBatchOrdersArguments('OPEN', orders, type)

  const binance = getBinance()
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const batchOrders: NewFuturesOrder[] = orders.map((order: IOrder) =>
    getOrderOptionsByType(order, type),
  )

  const chunks = chunkArray(batchOrders, OPEN_BATCH_ORDERS_BINANCE_LIMIT)

  const binanceOrders = await Promise.all(
    chunks.map((chunk) =>
      binance.futuresBatchOrders({
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        batchOrders: JSON.stringify(chunk),
      }),
    ),
  )

  await handleBinanceError(binanceOrders.flat(), chunks.flat(), orders)
}

export async function cancelBatchOrders(orders: IOrder[], type: ORDER_TYPE) {
  logBatchOrdersArguments('CANCEL', orders, type)

  const binance = getBinance()

  const origClientOrderIdList = orders
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    .map((order) => order[ORDER_TYPE_ID_FIELD[type]])
    .filter((id) => Boolean(id))

  const chunks = chunkArray(origClientOrderIdList, CANCEL_BATCH_ORDERS_BINANCE_LIMIT)

  const binanceOrders = await Promise.all(
    chunks.map((chunk) =>
      binance.futuresCancelBatchOrders({
        symbol: TICKER.ETH,
        origClientOrderIdList: JSON.stringify(chunk),
      }),
    ),
  )

  await handleBinanceError(binanceOrders.flat(), chunks.flat(), orders)
}

export default binance
