// zip -r aws_lambda_binance_limit_to_market_spot.zip .

const Binance = require('binance-api-node').default

const BINANCE_SPOT_API_URL = "https://api.binance.com"

const getPrecision = (numberStr) => {
  const fullString = numberStr.replace('.', '')
  const index = fullString.indexOf('1')
  return index
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
  console.log(event)

  const { apiKey, apiSecret, limitPercent = 1 } = event

  const binance = Binance({
    apiKey: apiKey,
    apiSecret: apiSecret,
    httpBase: BINANCE_SPOT_API_URL,
    useServerTime: true
  })

  const openOrders = await retry(binance.marginOpenOrders, undefined, 8)

  for (const limitOrder of openOrders) {
    const prices = await retry(binance.prices, { symbol: limitOrder.symbol }, 8)
    
    const currentPrice = prices[limitOrder.symbol]

    const difference = Math.abs(Number(currentPrice) / Number(limitOrder.price) - 1) * 100
    
    if (difference < limitPercent) return { statusCode: 200 }

    const exchange = await retry(binance.exchangeInfo, undefined, 8)
    const { filters } = exchange.symbols.find(item => item.symbol === limitOrder.symbol)

    const { stepSize } = filters.find(item => item.filterType === 'LOT_SIZE')
    const quantityPrecision = getPrecision(stepSize)

    const quantity = (Number(limitOrder.origQty) - Number(limitOrder.executedQty)).toFixed(quantityPrecision)

    const marketOrder = {
      type: 'MARKET',
      isIsolated: false,
      sideEffectType: 'AUTO_BORROW_REPAY',
      symbol: limitOrder.symbol,
      side: limitOrder.side,
      quantity: quantity,
    }
  
    await retry(binance.marginOrder, marketOrder, 8)

    const cancelOrder = {
      symbol: limitOrder.symbol,
      orderId: limitOrder.orderId,
    }

    await retry(binance.marginCancelOrder, cancelOrder, 8)

    console.log(`ACTUAL DIFFERENCE [${limitPercent}%]: ${(difference).toFixed(2)}% `, ` Details: ${limitOrder.status} ${limitOrder.symbol} ${limitOrder.side} ${limitOrder.price} ${limitOrder.origQty} - ${limitOrder.executedQty}`)
  }

  return { statusCode: 200 }
}


// (async () => {
//   await run({
//     apiKey: '${BINANCE_API_KEY}', // main futures account
//     apiSecret: '${BINANCE_ACCOUNT20_API_SECRET}',
//     limitPercent: 0.1,
//   })
// })()

