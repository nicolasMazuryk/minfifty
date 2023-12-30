// zip -r aws_lambda_binance_limit_to_market_dynamodb.zip .

const AWS = require('aws-sdk')

AWS.config.update({region: 'eu-central-1'})

const ddb = new AWS.DynamoDB.DocumentClient()

const Binance = require('binance-api-node').default

const BINANCE_FUTURES_API_URL = "https://fapi.binance.com"

const retry = async (fn, parameters, retries = 12, delay = 1000) => {
  try {
    return await fn(parameters)
  } catch (error) {
    if (error?.code === -1001) {
      if (retries <= 0) throw new Error('Retries to place the order was not successful')

      await new Promise(resolve => setTimeout(resolve, delay))

      return await retry(fn, parameters, retries - 1, delay * 2)
    }

    throw error
  }
}

// const run = async(event, context) => {

module.exports.handler = async(event, context) => {
  console.log(event)

  const { apiKey, apiSecret, limitPercent = 1 } = event

  const binance = Binance({
    apiKey: apiKey,
    apiSecret: apiSecret,
    httpFutures: BINANCE_FUTURES_API_URL,
    useServerTime: true
  })

  const openOrders = await retry(binance.futuresOpenOrders, undefined, 8)

  for (const limitOrder of openOrders) {
    const prices = await retry(binance.futuresPrices, { symbol: limitOrder.symbol }, 8)
    
    const currentPrice = prices[limitOrder.symbol]

    const difference = Math.abs(Number(currentPrice) / Number(limitOrder.price) - 1) * 100
    
    if (difference < limitPercent) return { statusCode: 200 }

    const exchange = await retry(binance.futuresExchangeInfo, undefined, 8)
    const { quantityPrecision } = exchange.symbols.find(item => item.symbol === limitOrder.symbol)

    const quantity = (Number(limitOrder.origQty) - Number(limitOrder.executedQty)).toFixed(quantityPrecision)

    const marketOrder = {
      type: 'MARKET',
      symbol: limitOrder.symbol,
      side: limitOrder.side,
      quantity: quantity,
    }
  
    const binanceOrder = await retry(binance.futuresOrder, marketOrder, 8)

    const cancelOrder = {
      symbol: limitOrder.symbol,
      orderId: limitOrder.orderId,
    }

    await retry(binance.futuresCancelOrder, cancelOrder, 8)

    const deleteParams = {
      TableName: 'orders',
      Key: {
        orderId: String(limitOrder.orderId),
      }
    }
  
    await ddb.delete(deleteParams).promise()

    const putParams = {
      TableName: 'orders',
      Item: {
        ...binanceOrder,
        orderId: String(binanceOrder.orderId),
        apiKey,
        limitPercent,
        difference,
        price: currentPrice,
        origQty: limitOrder.origQty,
        cumQuote: (limitOrder.origQty * currentPrice).toFixed(2)
      }
    }
  
    await ddb.put(putParams).promise()

    console.log(`ACTUAL DIFFERENCE [${limitPercent}%]: ${(difference).toFixed(2)}% `, ` Details: ${limitOrder.status} ${limitOrder.symbol} ${limitOrder.side} ${limitOrder.price} ${limitOrder.origQty} - ${limitOrder.executedQty}`)
  }

  return { statusCode: 200 }
}


// (async () => {
//   await run({
//     apiKey: '${BINANCE_API_KEY}', // main futures account
//     apiSecret: '${BINANCE_ACCOUNT20_API_SECRET}',
//     limitPercent: 0.5,
//   })
// })()

