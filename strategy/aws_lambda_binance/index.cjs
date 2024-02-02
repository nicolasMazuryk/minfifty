// zip -r aws_lambda_binance_bbo.zip .

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

const generateUUID = () => { // 8 characters
  const timestamp = Date.now().toString(36).substring(5,8)
  const randomString = Math.random().toString(36).substring(3, 8)
  return `${timestamp}${randomString}`
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

    throw error
  }
}

// const run = async(event, context) => {

module.exports.handler = async(event, context) => {
  console.log(event.body)

  const [side, symbol, priceStr, quantityStr] = event.body.split(' ')

  const exchange = await retry(binance.futuresExchangeInfo, undefined, 8)
  const { pricePrecision, quantityPrecision } = exchange.symbols.find(item => item.symbol === symbol)

  const price = Number(priceStr.replace('p=','')).toFixed(pricePrecision)
  const quantity = Number(quantityStr.replace('q=','')).toFixed(quantityPrecision)

  const order = {
    type: 'LIMIT',
    timeInForce: 'GTC',
    symbol: symbol,
    side: side.toUpperCase(),
    quantity: quantity,
    priceMatch: 'QUEUE',
    newClientOrderId: `${generateUUID()}:${price}:${quantity}:${0}`
  }

  // const order = {
  //   type: 'MARKET',
  //   symbol: symbol,
  //   side: side.toUpperCase(),
  //   quantity: quantity,
  // }

  const binanceOrder = await retry(binance.futuresOrder, order)

  const signalDiff = binanceOrder.side === 'BUY' ? Number(price) - Number(binanceOrder.price) : Number(binanceOrder.price) - Number(price)

  const params = {
    TableName: 'orders',
    Item: {
      ...binanceOrder,
      orderId: String(binanceOrder.orderId),
      apiKey: process.env.BINANCE_API_KEY,
      // apiKey: '${BINANCE_API_KEY}',
      signalPrice: price,
      signalQuantity: quantity,
      attempt: 0,
      placedPrice: binanceOrder.price,
      placedQuantity: binanceOrder.origQty,
      signalDiff: signalDiff.toFixed(pricePrecision),
    }
  }

  await ddb.put(params).promise()

  return { statusCode: 200 }
}


// (async () => {
//   await run({ body: 'sell RUNEUSDT p=4.095 q=5' })
// })()

