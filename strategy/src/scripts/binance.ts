import * as process from 'process'

import { ORDER_SIDE, ORDER_TYPE, ORDER_TYPE_ID_FIELD, TICKER } from '@common/strategy/constants'
import { IOrder } from '@common/strategy/types'
import {
  chunkArray,
  logger,
  decodeBinanceUrl,
  parseBinanceErrorString,
} from '@common/strategy/utils'
import Binance, { NewFuturesOrder, OrderSide, TimeInForce } from 'binance-api-node'
import dotenv from 'dotenv-safe'

import '../alias-runtime'

import { binanceBacktest } from './binance_backtest'

dotenv.config({ allowEmptyValues: true })

const binanceRealTime = Binance({
  apiKey: process.env.BINANCE_API_KEY,
  apiSecret: process.env.BINANCE_API_SECRET,
  httpBase: process.env.BINANCE_SPOT_API_URL,
  wsBase: process.env.BINANCE_SPOT_WS_URL,
  httpFutures: process.env.BINANCE_FUTURES_API_URL,
  wsFutures: process.env.BINANCE_FUTURES_WS_URL,
})

const getBinance = () => {
  if (process.env.NODE_ENV === 'backtest') return binanceBacktest

  return binanceRealTime
}

const binance = getBinance()

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
      quantity: order.base.quantity.toString(),
      stopPrice: order.stopLoss.toString(),
      newClientOrderId: order.base.stopLimitOrderId,
    }
  }

  if (type === ORDER_TYPE.TAKE_PROFIT) {
    return {
      symbol: TICKER.ETH,
      side: OrderSide.SELL,
      type: ORDER_TYPE.LIMIT,
      timeInForce: TimeInForce.GTC,
      quantity: order.base.quantity.toString(),
      price: order.takeProfit.toString(),
      newClientOrderId: order.base.takeProfitOrderId,
    }
  }
  // in case price is below STOP_MARKET SELL stopPrice - the order will fail. We need to forcefully close the loss using MARKET order
  if (type === ORDER_TYPE.MARKET) {
    return {
      symbol: TICKER.ETH,
      side: OrderSide.SELL,
      type: ORDER_TYPE.MARKET,
      quantity: order.base.quantity.toString(),
      newClientOrderId: order.base.stopLimitOrderId,
    }
  }
}

const getClientOrderIdByType = (order: IOrder, type: ORDER_TYPE) => {
  if (type === ORDER_TYPE.LIMIT) return order.limitOrderId

  if (type === ORDER_TYPE.STOP_MARKET) return order.base.stopLimitOrderId
  if (type === ORDER_TYPE.MARKET) return order.base.stopLimitOrderId

  if (type === ORDER_TYPE.TAKE_PROFIT) return order.base.takeProfitOrderId
}

const handleFailedToPlaceStopMarketOrderBinanceError = async (
  responseItem: any,
  orderRequestParams: any,
  order: IOrder,
) => {
  const errorCode = -2021 // 'Order would immediately trigger.'

  if (responseItem.code !== errorCode) return
  if (orderRequestParams.type === ORDER_TYPE.STOP_MARKET) {
    await openBatchOrders([order], ORDER_TYPE.MARKET)
  }
}

const isOrderTriggered_HandleUnknownOrderSentBinanceError = async (
  responseItem: any,
  // orderRequestParams: any,
  // order: IOrder,
) => {
  const errorCode = -2011 // 'Unknown order sent.'

  if (responseItem.code === errorCode) {
    return true
  }
}

const handleUnableToProcessYourRequestBinanceError = async (
  responseItem: any,
  orderRequestParams: any,
  order: IOrder,
) => {
  const errorCode = -1001 // 'Internal error; unable to process your request. Please try again.'

  if (responseItem.code !== errorCode) return

  let orderType = orderRequestParams.type

  if (orderRequestParams.type === ORDER_TYPE.LIMIT) {
    orderType =
      orderRequestParams.side === ORDER_SIDE.BUY ? ORDER_TYPE.LIMIT : ORDER_TYPE.TAKE_PROFIT
  }

  await openBatchOrders([order], orderType)
}

const handleUnhandledBinanceOpenOrdersError = async (
  error: string,
  requestOrders: IOrder[],
  type: ORDER_TYPE,
) => {
  try {
    const { code, url } = parseBinanceErrorString(error)

    const errorCode = -1001 // 'Internal error; unable to process your request. Please try again.'

    if (code !== errorCode) return

    const batchOrders = decodeBinanceUrl(url, 'batchOrders')

    const orders = batchOrders
      .map(
        (orderRequestParams: any) =>
          requestOrders.find(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            (order) => order[ORDER_TYPE_ID_FIELD[type]] === orderRequestParams.newClientOrderId,
          ) as IOrder,
      )
      .filter((order: IOrder) => !!order)

    await openBatchOrders(orders, type)
  } catch (error: any) {
    logger.error('handleUnhandledBinanceOpenOrdersError:', error)
  }
}

const handleUnhandledBinanceCancelOrdersError = async (
  error: string,
  requestOrders: IOrder[],
  type: ORDER_TYPE,
) => {
  try {
    const { code, url } = parseBinanceErrorString(error)

    const errorCode = -1001 // 'Internal error; unable to process your request. Please try again.'

    if (code !== errorCode) return

    const origClientOrderIdList = decodeBinanceUrl(url, 'origClientOrderIdList')

    const orders = origClientOrderIdList
      .map(
        (clientOrderId: any) =>
          requestOrders.find(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            (order) => order[ORDER_TYPE_ID_FIELD[type]] === clientOrderId,
          ) as IOrder,
      )
      .filter((order: IOrder) => !!order)

    await openBatchOrders(orders, type)
  } catch (error: any) {
    logger.error('handleUnhandledBinanceCancelOrdersError:', error)
  }
}

export const handleBinanceError = async (response: any[], request: any[], orders: IOrder[]) => {
  for (const [index, responseItem] of response.entries()) {
    // log error, add original orders to logs
    if (responseItem.code) {
      if (![-2021].includes(responseItem.code)) {
        logger.error({
          error: responseItem,
          request: request[index],
          // order: orders[index],
          // log JSON.stringify(this) as well
        })
      }

      await handleFailedToPlaceStopMarketOrderBinanceError(
        responseItem,
        request[index],
        orders[index],
      )

      await handleUnableToProcessYourRequestBinanceError(
        responseItem,
        request[index],
        orders[index],
      )

      const isOrderTriggered = await isOrderTriggered_HandleUnknownOrderSentBinanceError(
        responseItem,
      )

      return isOrderTriggered
    }
  }
}

const logOpenBinanceOrdersParams = (batchOrders: NewFuturesOrder[]) => {
  batchOrders.forEach((order) =>
    logger.info(`REQUEST OPEN: ${order.side} ${order.type} ${order.newClientOrderId}`),
  )
  logger.info(`------------------------------------------------------------------`)
}

const logCancelBinanceOrdersParams = (orders: IOrder[], type: ORDER_TYPE) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const batchOrders: NewFuturesOrder[] = orders.map((order: IOrder) =>
    getOrderOptionsByType(order, type),
  )

  batchOrders.forEach((order) =>
    logger.info(`REQUEST CANCEL: ${order.side} ${order.type} ${order.newClientOrderId}`),
  )
  logger.info(`------------------------------------------------------------------`)
}

export async function openBatchOrders(orders: IOrder[], type: ORDER_TYPE) {
  if (!orders.length) return

  const binance = getBinance()
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const batchOrders: NewFuturesOrder[] = orders.map((order: IOrder) =>
    getOrderOptionsByType(order, type),
  )

  logOpenBinanceOrdersParams(batchOrders)

  const chunks = chunkArray(batchOrders, OPEN_BATCH_ORDERS_BINANCE_LIMIT)

  try {
    const binanceOrders = await Promise.all(
      chunks.map((chunk) =>
        binance.futuresBatchOrders({
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          batchOrders: JSON.stringify(chunk),
          recvWindow: 10000,
        }),
      ),
    )

    return await handleBinanceError(binanceOrders.flat(), chunks.flat(), orders)
  } catch (error: any) {
    logger.error(error)
    await handleUnhandledBinanceOpenOrdersError(error, orders, type)
  }
}

export async function cancelBatchOrders(orders: IOrder[], type: ORDER_TYPE) {
  if (!orders.length) return false

  const binance = getBinance()

  const origClientOrderIdList = orders
    .map((order) => getClientOrderIdByType(order, type))
    .filter((id) => Boolean(id))

  logCancelBinanceOrdersParams(orders, type)

  const chunks = chunkArray(origClientOrderIdList, CANCEL_BATCH_ORDERS_BINANCE_LIMIT)

  try {
    const binanceOrders = await Promise.all(
      chunks.map((chunk) =>
        binance.futuresCancelBatchOrders({
          symbol: TICKER.ETH,
          origClientOrderIdList: JSON.stringify(chunk),
          recvWindow: 10000,
        }),
      ),
    )

    return await handleBinanceError(binanceOrders.flat(), chunks.flat(), orders)
  } catch (error: any) {
    logger.error(error)
    await handleUnhandledBinanceCancelOrdersError(error, orders, type)
  }
}

export default binance
