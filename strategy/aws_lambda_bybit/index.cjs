// zip -r aws_lambda_bybit.zip .

const { RestClientV5 } = require('bybit-api')

const getPrecision = str => str.split('.').length === 1 ? 0 : str.split('.')[1].length;

module.exports.handler = async(event, context) => {
  console.log(event.body)

  const bybit = new RestClientV5({
    key: process.env.BYBIT_API_KEY,
    secret: process.env.BYBIT_API_SECRET,
    testnet: false,
  })

  const [side, symbol, priceStr, quantityStr] = event.body.split(' ')

  const instrumentInfo = await bybit.getInstrumentsInfo({
    category: 'linear',
    symbol: symbol,
    baseCoin: 'USDT',
  })

  const { priceFilter, lotSizeFilter } = instrumentInfo.result.list[0]

  const pricePrecision = getPrecision(priceFilter.tickSize)
  const quantityPrecision = getPrecision(lotSizeFilter.qtyStep)

  const price = Number(priceStr.replace('p=','')).toFixed(pricePrecision)
  const quantity = Number(quantityStr.replace('q=','')).toFixed(quantityPrecision)

  const order = {
    category: 'linear',
    orderType: 'Limit',
    timeInForce: 'GTC',
    symbol: symbol,
    side: side.charAt(0).toUpperCase() + side.slice(1),
    qty: quantity,
    price: price,
  }

  await bybit.submitOrder(order)

  return { statusCode: 200 }
}
