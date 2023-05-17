// zip -r aws_lambda_binance.zip .

const Binance = require('binance-api-node').default

const BINANCE_FUTURES_API_URL = "https://fapi.binance.com"

const binance = Binance({
  apiKey: process.env.BINANCE_API_KEY,
  apiSecret: process.env.BINANCE_API_SECRET,
  httpFutures: BINANCE_FUTURES_API_URL,
  useServerTime: true
})

module.exports.handler = async(event, context) => {
  console.log(event.body)

  let order

  try {
    const [side, symbol, priceStr, quantityStr] = event.body.split(' ')

    const exchange = await binance.futuresExchangeInfo()
    const { pricePrecision, quantityPrecision } = exchange.symbols.find(item => item.symbol === symbol)

    const price = Number(priceStr.replace('p=','')).toFixed(pricePrecision)
    const quantity = Number(quantityStr.replace('q=','')).toFixed(quantityPrecision)

    order = {
      type: 'LIMIT',
      timeInForce: 'GTC',
      symbol: symbol,
      side: side.toUpperCase(),
      quantity: quantity,
      price: price,
    }

    await binance.futuresOrder(order)

    return { statusCode: 200 }
  } catch (error) {
    console.error(error)

    if (error?.code === -1001) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      await binance.futuresOrder(order)
    }

    return { statusCode: 500, error: error }
  }
}
