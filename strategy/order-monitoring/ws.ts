import AWS from 'aws-sdk'
import Binance, { AggregatedTrade } from 'binance-api-node'

AWS.config.update({ region: 'eu-central-1' })

const ddb = new AWS.DynamoDB.DocumentClient()

const binance = Binance({
  // apiKey: process.env.BINANCE_API_KEY,
  // apiSecret: process.env.BINANCE_API_SECRET,
  apiKey: '${BINANCE_API_KEY}',
  apiSecret: '${BINANCE_ACCOUNT20_API_SECRET}',
})

const logger = {
  // eslint-disable-next-line no-console
  info: (...args: any) => console.log(...args),
  // eslint-disable-next-line no-console
  error: (...args: any) => console.error(...args),
}

const collectDebugInformation = async () => {
  const openOrders = await binance.futuresOpenOrders({ symbol: 'RUNEUSDT' })
  const accountInfo = await binance.futuresAccountInfo()
  const positionRisk = await binance.futuresPositionRisk({ symbol: 'RUNEUSDT' })
  const allOrders = await binance.futuresAllOrders({ symbol: 'RUNEUSDT', limit: 8 })

  logger.info('Open Orders:')
  logger.info(JSON.stringify(openOrders))
  logger.info('Account Information:')
  logger.info(JSON.stringify(accountInfo))
  logger.info('Position Risk:')
  logger.info(JSON.stringify(positionRisk))
  logger.info('All Orders:')
  logger.info(JSON.stringify(allOrders))
}

const retry = async (fn: any, parameters: any, retries = 12, delay = 1000): Promise<any> => {
  try {
    return await fn(parameters)
  } catch (error: any) {
    if ([-1001, -1008, -3007].includes(error?.code)) {
      if (retries <= 0) throw new Error('Retries to place the order was not successful')

      await new Promise((resolve) => setTimeout(resolve, delay))

      return await retry(fn, parameters, retries - 1, delay * 2)
    }

    await collectDebugInformation()

    throw error
  }
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

const isExitOrder = (order: any) => {
  const [uuid, commentStr] = order.clientOrderId.split(':')

  return ['LX', 'SX'].includes(commentStr) && order.origType === 'LIMIT'
}

const getOpenOrders = async () => {
  const openOrders = await retry(binance.futuresOpenOrders, undefined, 8)

  return openOrders.filter(isExitOrder)
}

// --------------------

const main = async () => {
  // const DIFFERENCE_THRESHOLD_TICKS = process.env.DIFFERENCE_THRESHOLD_TICKS
  const DIFFERENCE_THRESHOLD_TICKS = 0.005 // 10

  let isProcessingAggregatedTradesEvent = false
  let isProcessingOrderUpdateEvent = false

  let OPEN_ORDERS = await getOpenOrders()

  const openOrdersInterval = setInterval(async () => {
    if (isProcessingOrderUpdateEvent) return

    OPEN_ORDERS = await getOpenOrders()
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

        if (difference < DIFFERENCE_THRESHOLD_TICKS) return

        isProcessingAggregatedTradesEvent = true

        // const exchange = await retry(binance.futuresExchangeInfo, undefined, 8)
        // const { pricePrecision, quantityPrecision } = exchange.symbols.find(
        //   (item: any) => item.symbol === openOrder.symbol,
        // )
        const pricePrecision = 4
        const quantityPrecision = 0

        const quantity = (Number(openOrder.origQty) - Number(openOrder.executedQty)).toFixed(
          quantityPrecision,
        )

        const cancelOrder = {
          symbol: openOrder.symbol,
          orderId: openOrder.orderId,
        }

        await retry(binance.futuresCancelOrder, cancelOrder, 8)

        const order = {
          type: 'MARKET',
          symbol: openOrder.symbol,
          side: openOrder.side.toUpperCase(),
          quantity: quantity,
        }

        await retry(binance.futuresOrder, order, 8)

        const missedPercent =
          Math.abs(Number(currentPrice) - Number(openOrder.price)) / Number(openOrder.price)
        const missedAmount =
          (Number(openOrder.origQty) - Number(openOrder.executedQty)) *
          Number(openOrder.price) *
          missedPercent

        const params = {
          TableName: 'orders',
          Item: {
            ...openOrder,
            orderId: String(openOrder.orderId),
            // apiKey: process.env.BINANCE_API_KEY,
            apiKey: '${BINANCE_API_KEY}',
            thresholdTicks: DIFFERENCE_THRESHOLD_TICKS,
            missedPercent: (missedPercent * 100).toFixed(2),
            missedAmount: missedAmount.toFixed(2),
          },
        }

        await ddb.put(params).promise()

        isProcessingAggregatedTradesEvent = false
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
      const order = convertEventMessageToOpenOrder(msg)
      const isExit = isExitOrder(order)

      if (isExit) OPEN_ORDERS.push(order)
    }

    if (['PARTIALLY_FILLED'].includes(msg.orderStatus)) {
      const index = OPEN_ORDERS.findIndex((order: any) => order.orderId === msg.orderId)
      if (index !== -1) {
        OPEN_ORDERS.splice(index, 1)
      }

      const order = convertEventMessageToOpenOrder(msg)
      const isExit = isExitOrder(order)

      if (isExit) OPEN_ORDERS.push(order)
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
