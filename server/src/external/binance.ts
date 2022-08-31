import Binance from 'binance-api-node'
import dotenv from 'dotenv-safe'

// eslint-disable-next-line import/order
import '../alias-runtime'

dotenv.config({ allowEmptyValues: true })

const binance = Binance({
  apiKey: process.env.BINANCE_API_KEY,
  apiSecret: process.env.BINANCE_API_SECRET,
})

export default binance
