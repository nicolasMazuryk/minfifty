// zip -r aws_lambda_binance_limit.zip .

const AWS = require('aws-sdk')

AWS.config.update({region: 'eu-central-1'})

const ddb = new AWS.DynamoDB.DocumentClient()

const Binance = require('binance-api-node').default

const BINANCE_FUTURES_API_URL = "https://fapi.binance.com"

const binance = Binance({
  // apiKey: '${BINANCE_API_KEY}', // main futures account
  // apiSecret: '${BINANCE_ACCOUNT20_API_SECRET}',
  apiKey: process.env.BINANCE_API_KEY,
  apiSecret: process.env.BINANCE_API_SECRET,
  httpFutures: BINANCE_FUTURES_API_URL,
  useServerTime: true
})

const SLIPPAGE_TICKS = Number(process.env.SLIPPAGE_TICKS) || 0
// const SLIPPAGE_TICKS = 1

const collectDebugInformation = async () => {
  const openOrders = await binance.futuresOpenOrders({ symbol: 'RUNEUSDT' })
  const accountInfo = await binance.futuresAccountInfo()
  const positionRisk = await binance.futuresPositionRisk({ symbol: 'RUNEUSDT' })
  const allOrders = await binance.futuresAllOrders({ symbol: 'RUNEUSDT', limit: 8 })

  console.log('Open Orders:')
  console.log(JSON.stringify(openOrders))
  console.log('Account Information:')
  console.log(JSON.stringify(accountInfo))
  console.log('Position Risk:')
  console.log(JSON.stringify(positionRisk))
  console.log('All Orders:')
  console.log(JSON.stringify(allOrders))
}

const retry = async (fn, parameters, retries = 12, delay = 1000) => {
  try {
    return await fn(parameters)
  } catch (error) {
    if ([-1001, -1008, -3007].includes(error?.code)) {
      if (retries <= 0) throw new Error('Retries to place the order was not successful')

      await new Promise(resolve => setTimeout(resolve, delay))

      return await retry(fn, parameters, retries - 1, delay * 2)
    }

    await collectDebugInformation()

    throw error
  }
}

const generateUUID = () => {
  // 8 characters
  const timestamp = Date.now().toString(36).substring(5, 8)
  const randomString = Math.random().toString(36).substring(3, 8)
  return `${timestamp}${randomString}`
}

// const run = async(event, context) => {

module.exports.handler = async(event, context) => {
  console.log(event.body)

  const [side, symbol, priceStr, quantityStr, commentStr] = event.body.split(' ')

  // const exchange = await retry(binance.futuresExchangeInfo, undefined, 8)
  // const { pricePrecision, quantityPrecision } = exchange.symbols.find(item => item.symbol === symbol)

  const pricePrecision = 4
  const quantityPrecision = 0

  const price = Number(priceStr.replace('p=','')).toFixed(pricePrecision)
  const quantity = Number(quantityStr.replace('q=','')).toFixed(quantityPrecision)

  const isEntry = commentStr === 'LONG' || commentStr === 'SHORT'
  const isExit = commentStr === 'LX' || commentStr === 'SX'

  const slippageOffsetTicks = parseFloat(`0.${'0'.repeat(pricePrecision - 2)}1`) * SLIPPAGE_TICKS
  const slippageOffset = side.toUpperCase() === 'BUY' ? -slippageOffsetTicks : slippageOffsetTicks
  const slippageOffsetPrice = (Number(price) + slippageOffset).toFixed(pricePrecision)

  if (isEntry) {
    const order = {
      type: 'LIMIT',
      timeInForce: 'GTC',
      symbol: symbol,
      side: side.toUpperCase(),
      price: slippageOffsetPrice,
      quantity: quantity,
    }

    await retry(binance.futuresOrder, order)
  }

  if (isExit) {
    const openOrders = await retry(binance.futuresOpenOrders, undefined, 8)
    const openOrdersSide = commentStr === 'LX' ? 'BUY' : 'SELL'
    const unExecutedOrders = openOrders.filter(openOrder => openOrder.side === openOrdersSide && openOrder.origType === 'LIMIT')

    if (unExecutedOrders.length > 1) throw new Error ('Multiple unExecuted Open Orders: ', JSON.stringify(openOrders))

    if (unExecutedOrders.length === 1) {
      const openOrder = unExecutedOrders[0]

      if (Number(openOrder.executedQty) > 0) {
        const order = {
          type: 'LIMIT',
          timeInForce: 'GTC',
          symbol: symbol,
          side: side.toUpperCase(),
          price: slippageOffsetPrice,
          quantity: openOrder.executedQty,
          newClientOrderId: `${generateUUID()}:${commentStr}`,
        }
    
        await retry(binance.futuresOrder, order)
      }

      const cancelOrder = {
        symbol: openOrder.symbol,
        orderId: openOrder.orderId,
      }

      await retry(binance.futuresCancelOrder, cancelOrder, 8)

      const missedPercent = Math.abs(Number(price) - Number(openOrder.price)) / Number(openOrder.price)
      const missedAmount = (Number(openOrder.origQty) - Number(openOrder.executedQty)) * Number(openOrder.price) * missedPercent

      const params = {
        TableName: 'orders',
        Item: {
          ...openOrder,
          orderId: String(openOrder.orderId),
          apiKey: process.env.BINANCE_API_KEY,
          // apiKey: '${BINANCE_API_KEY}',
          exitPrice: price,
          exitQuantity: quantity,
          slippageTicks: SLIPPAGE_TICKS,
          missedPercent: (missedPercent * 100).toFixed(2),
          missedAmount: missedAmount.toFixed(2)
        }
      }
    
      await ddb.put(params).promise()
    }

    if (unExecutedOrders.length === 0) {
      const order = {
        type: 'LIMIT',
        timeInForce: 'GTC',
        symbol: symbol,
        side: side.toUpperCase(),
        price: slippageOffsetPrice,
        quantity: quantity,
        newClientOrderId: `${generateUUID()}:${commentStr}`,
      }
  
      await retry(binance.futuresOrder, order)
    }
  }

  return { statusCode: 200 }
}


// (async () => {
//   await run({ body: 'sell RUNEUSDT p=4.392 q=112.988 LX' })
// })()

