// zip -r aws_lambda_binance_spot.zip .

const Binance = require('binance-api-node').default

const BINANCE_SPOT_API_URL = "https://api.binance.com"

const binance = Binance({
  // apiKey: '${BINANCE_API_KEY}', // main futures account
  // apiSecret: '${BINANCE_ACCOUNT20_API_SECRET}',
  apiKey: process.env.BINANCE_API_KEY,
  apiSecret: process.env.BINANCE_API_SECRET,
  httpBase: BINANCE_SPOT_API_URL,
  useServerTime: true
})

const getPrecision = (numberStr) => {
  const fullString = numberStr.replace('.', '')
  const index = fullString.indexOf('1')
  return index
}

const retry = async (fn, parameters, retries = 12, delay = 1000) => {
  try {
    return await fn(parameters)
  } catch (error) {
    if ([-1001, -3007].includes(error?.code)) {
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

  const exchange = await retry(binance.exchangeInfo, undefined, 8)
  const { filters, quotePrecision } = exchange.symbols.find(item => item.symbol === symbol)

  const { stepSize } = filters.find(item => item.filterType === 'LOT_SIZE')
  const quantityPrecision = getPrecision(stepSize)

  const price = Number(priceStr.replace('p=','')).toFixed(quotePrecision)
  const quantity = Number(quantityStr.replace('q=','')).toFixed(quantityPrecision)

  // const order = {
  //   type: 'LIMIT',
  //   isIsolated: false,
  //   sideEffectType: 'AUTO_BORROW_REPAY',
  //   timeInForce: 'GTC',
  //   symbol: symbol,
  //   side: side.toUpperCase(),
  //   quantity: quantity,
  //   price: price,
  // }

  const order = {
    type: 'MARKET',
    isIsolated: false,
    sideEffectType: 'AUTO_BORROW_REPAY',
    symbol: symbol,
    side: side.toUpperCase(),
    quantity: quantity,
  }

  await retry(binance.marginOrder, order)

  return { statusCode: 200 }
}


// (async () => {
//   await run({ body: 'buy RUNEBTC p=0.0001293 q=5.0001285' })
// })()
