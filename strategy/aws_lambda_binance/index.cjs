// zip -r aws_lambda_binance.zip .

const Binance = require('binance-api-node').default

const BINANCE_FUTURES_API_URL = "https://fapi.binance.com"

const binance = Binance({
  apiKey: process.env.BINANCE_API_KEY,
  apiSecret: process.env.BINANCE_API_SECRET,
  httpFutures: BINANCE_FUTURES_API_URL,
  useServerTime: true
})

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

module.exports.handler = async(event, context) => {
  console.log(event.body)

  const [side, symbol, priceStr, quantityStr] = event.body.split(' ')

  const exchange = await binance.futuresExchangeInfo()
  const { pricePrecision, quantityPrecision } = exchange.symbols.find(item => item.symbol === symbol)

  const price = Number(priceStr.replace('p=','')).toFixed(pricePrecision)
  const quantity = Number(quantityStr.replace('q=','')).toFixed(quantityPrecision)

  const order = {
    type: 'LIMIT',
    timeInForce: 'GTC',
    symbol: symbol,
    side: side.toUpperCase(),
    quantity: quantity,
    price: price,
  }

  await retry(binance.futuresOrder, order)

  return { statusCode: 200 }
}
