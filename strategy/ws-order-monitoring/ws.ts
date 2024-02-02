import AWS from 'aws-sdk'
import Binance, { AggregatedTrade } from 'binance-api-node'

AWS.config.update({ region: 'eu-central-1' })

const ddb = new AWS.DynamoDB.DocumentClient()

const API_KEY = '${BINANCE_API_KEY}'
const API_SECRET = '${BINANCE_ACCOUNT20_API_SECRET}'

const binance = Binance({
  apiKey: API_KEY,
  apiSecret: API_SECRET,
})

const logger = {
  // eslint-disable-next-line no-console
  info: (...args: any) => console.log(`[${new Date().toLocaleString('pl-PL')}]`, ...args),
  // eslint-disable-next-line no-console
  error: (...args: any) => console.error(`[${new Date().toLocaleString('pl-PL')}]`, ...args),
  // eslint-disable-next-line no-console
  time: (...args: any) => console.time(...args),
  // eslint-disable-next-line no-console
  timeEnd: (...args: any) => console.timeEnd(...args),
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const retry = async (fn: any, parameters: any, retries = 12, delay = 1000): Promise<any> => {
  try {
    return await fn(parameters)
  } catch (error: any) {
    if ([-1001, -1008, -3007].includes(error?.code)) {
      if (retries <= 0) throw new Error('Retries to place the order was not successful')

      await new Promise((resolve) => setTimeout(resolve, delay))

      return await retry(fn, parameters, retries - 1, delay * 2)
    }

    throw error
  }
}

const generateUUID = () => {
  // 8 characters
  const timestamp = Date.now().toString(36).substring(5, 8)
  const randomString = Math.random().toString(36).substring(3, 8)
  return `${timestamp}${randomString}`
}

const convertEventMessageToOpenOrder = (eventMessage: any) => ({
  avgPrice: eventMessage.averagePrice,
  clientOrderId: eventMessage.clientOrderId,
  closePosition: eventMessage.closePosition,
  executedQty: eventMessage.totalTradeQuantity,
  orderId: eventMessage.orderId,
  origQty: eventMessage.quantity,
  origType: eventMessage.originalOrderType,
  positionSide: eventMessage.positionSide,
  price: eventMessage.price,
  reduceOnly: eventMessage.isReduceOnly,
  side: eventMessage.side,
  status: eventMessage.orderStatus,
  stopPrice: eventMessage.stopPrice,
  symbol: eventMessage.symbol,
  time: eventMessage.orderTime,
  timeInForce: eventMessage.timeInForce,
  type: eventMessage.orderType,
  updateTime: eventMessage.eventTime,
  workingType: eventMessage.workingType,
})

// --------------------

const main = async () => {
  const THRESHOLD_TICKS = 0.005 // 10

  let isProcessingAggregatedTradesEvent = false
  let isProcessingOrderUpdateEvent = false

  let OPEN_ORDERS = await retry(binance.futuresOpenOrders, undefined, 8)

  const openOrdersInterval = setInterval(async () => {
    if (isProcessingOrderUpdateEvent) return

    OPEN_ORDERS = await retry(binance.futuresOpenOrders, undefined, 8)
  }, 3000)

  const futuresAggTradesWebsocketConnection = binance.ws.futuresAggTrades(
    'RUNEUSDT',
    async (trade: AggregatedTrade) => {
      if (isProcessingAggregatedTradesEvent) return
      // !!!!!!!!!!!!!!!!!! Refactor to PROMISE.ALL() - it is often 2 orders (reverse) and second is lagging significantly
      for (const openOrder of OPEN_ORDERS) {
        const currentPrice = Number(trade.price)

        const difference =
          openOrder.side === 'BUY'
            ? currentPrice - Number(openOrder.price)
            : Number(openOrder.price) - currentPrice

        if (difference < THRESHOLD_TICKS) return

        isProcessingAggregatedTradesEvent = true

        const exchange = await retry(binance.futuresExchangeInfo, undefined, 8)
        const { pricePrecision, quantityPrecision } = exchange.symbols.find(
          (item: any) => item.symbol === openOrder.symbol,
        )

        const quantity = (Number(openOrder.origQty) - Number(openOrder.executedQty)).toFixed(
          quantityPrecision,
        )

        const cancelOrder = {
          symbol: openOrder.symbol,
          orderId: openOrder.orderId,
        }

        await retry(binance.futuresCancelOrder, cancelOrder, 8)

        const [signalPrice = openOrder.price, signalQuantity = openOrder.origQty] =
          openOrder.clientOrderId.split(':')

        let [uuid, attempt] = openOrder.clientOrderId.split(':')

        uuid = uuid.length > 9 ? generateUUID() : uuid
        attempt = attempt >= 0 ? attempt : -1

        const newLimitOrder = {
          type: 'LIMIT',
          timeInForce: 'GTC',
          symbol: openOrder.symbol,
          side: openOrder.side.toUpperCase(),
          quantity: quantity,
          priceMatch: 'QUEUE',
          newClientOrderId: `${uuid}:${signalPrice}:${signalQuantity}:${Number(attempt) + 1}`,
        }

        const binanceOrder = await retry(binance.futuresOrder, newLimitOrder, 8)

        const deleteParams = {
          TableName: 'orders',
          Key: {
            orderId: String(openOrder.orderId),
          },
        }

        await ddb.delete(deleteParams).promise()

        const signalDiff =
          binanceOrder.side === 'BUY'
            ? Number(signalPrice) - Number(binanceOrder.price)
            : Number(binanceOrder.price) - Number(signalPrice)
        const actualDiff =
          binanceOrder.side === 'BUY'
            ? Number(currentPrice) - Number(binanceOrder.price)
            : Number(binanceOrder.price) - Number(currentPrice)

        const putParams = {
          TableName: 'orders',
          Item: {
            ...binanceOrder,
            orderId: String(binanceOrder.orderId),
            apiKey: API_KEY,
            threshold: THRESHOLD_TICKS,
            difference: difference.toFixed(pricePrecision),
            signalPrice,
            signalQuantity,
            attempt: Number(attempt) + 1,
            actualPrice: currentPrice,
            actualQuantity: quantity,
            placedPrice: binanceOrder.price,
            placedQuantity: binanceOrder.origQty,
            signalDiff: signalDiff.toFixed(pricePrecision),
            actualDiff: actualDiff.toFixed(pricePrecision),
          },
        }

        await ddb.put(putParams).promise()

        isProcessingAggregatedTradesEvent = false

        console.log(
          `ACTUAL DIFFERENCE [${THRESHOLD_TICKS}]: ${difference.toFixed(pricePrecision)} `,
          ` Details: ${binanceOrder.status} ${binanceOrder.symbol} ${binanceOrder.side} ${binanceOrder.price} ${signalQuantity} - ${binanceOrder.executedQty}`,
        )
      }
    },
  )

  const futuresUserWebsocketConnection = await binance.ws.futuresUser(async (msg) => {
    if (msg.eventType !== 'ORDER_TRADE_UPDATE') return

    if (['EXPIRED', 'PENDING_CANCEL'].includes(msg.orderStatus)) return

    if (['REJECTED'].includes(msg.orderStatus)) {
      logger.error(`UNEXPECTED ORDER STATUS: ${msg.orderStatus}`, msg)
    }

    isProcessingOrderUpdateEvent = true

    if (['NEW'].includes(msg.orderStatus)) {
      OPEN_ORDERS.push(convertEventMessageToOpenOrder(msg))
    }

    if (['PARTIALLY_FILLED'].includes(msg.orderStatus)) {
      const index = OPEN_ORDERS.findIndex((order: any) => order.orderId === msg.orderId)
      if (index !== -1) {
        OPEN_ORDERS.splice(index, 1)
      }

      OPEN_ORDERS.push(convertEventMessageToOpenOrder(msg))
    }

    if (['FILLED', 'CANCELED'].includes(msg.orderStatus)) {
      const index = OPEN_ORDERS.findIndex((order: any) => order.orderId === msg.orderId)
      if (index !== -1) {
        OPEN_ORDERS.splice(index, 1)
      }
    }

    isProcessingOrderUpdateEvent = false

    logger.info(convertEventMessageToOpenOrder(msg))
  })

  logger.info('System is ready to receive events...')

  const gracefulShutdown = async () => {
    futuresAggTradesWebsocketConnection()
    futuresUserWebsocketConnection()

    clearInterval(openOrdersInterval)

    logger.info('Graceful shutdown complete.')
    process.exit(0)
  }

  process.on('SIGINT', gracefulShutdown)
  process.on('SIGTERM', gracefulShutdown)
}

main().catch(logger.error)
