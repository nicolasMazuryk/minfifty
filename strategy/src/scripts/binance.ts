import Binance, {
  TimeInForce,
  OrderType,
  OrderSide,
  FuturesOrder,
  // WorkingType_LT,
  // NewOrderRespType_LT, PositionSide_LT,
} from 'binance-api-node'
import dotenv from 'dotenv-safe'

// eslint-disable-next-line import/order
import '../alias-runtime'
// eslint-disable-next-line import/order
import { TICKER } from '@common/strategy/constants'

dotenv.config({ allowEmptyValues: true })

const binance = Binance({
  apiKey: process.env.BINANCE_API_KEY,
  apiSecret: process.env.BINANCE_API_SECRET,
  httpBase: process.env.BINANCE_SPOT_API_URL,
  wsBase: process.env.BINANCE_SPOT_WS_URL,
  httpFutures: process.env.BINANCE_FUTURES_API_URL,
  wsFutures: process.env.BINANCE_FUTURES_WS_URL,
})

// function to open a new order on binance futures
export const openNewOrder = async (quantity: number, price: number): Promise<FuturesOrder> => {
  const order = await binance.futuresOrder({
    symbol: TICKER.ETH,
    side: OrderSide.BUY,
    // LIMIT
    type: OrderType.LIMIT,
    timeInForce: TimeInForce.GTC,
    quantity: quantity.toString(),
    price: price.toString(),
    //
    // // MARKET
    // type: OrderType.MARKET,
    // quantity: quantity.toString(),

    // STOP
    // type: 'STOP',
    // quantity: quantity.toString(),
    // price: price.toString(),
    // stopPrice: (price - 3).toString(),

    // TAKE_PROFIT
    // type: 'TAKE_PROFIT',
    // quantity: quantity.toString(),
    // price: (price - 3).toString(),
    // stopPrice: price.toString(),

    // positionSide: PositionSide.LONG,
    // newClientOrderId: uuidv4(),
  })
  return order
}

// export const openMultipleOrders = async (quantity: number, price: number): Promise<FuturesOrder[]> => {
//   const orders = await binance.futuresBatchOrders({
//     batchOrders: [
//       {
//         symbol: TICKER.ETH,
//         side: OrderSide.BUY,
//         // positionSide: PositionSide.LONG,
//         type: OrderType.LIMIT,
//         timeInForce: TimeInForce.GTC,
//         quantity: quantity.toString(),
//         price: price.toString(),
//         // newClientOrderId: uuidv4(),
//       },
//     ],
//   })
//   return orders
// }

// // function to close order by ID on binance futures
export const cancelOrder = async (orderId: number) => {
  const order = await binance.futuresCancelOrder({
    symbol: TICKER.ETH,
    orderId,
  })
  return order
}

export const cancelMultipleOrders = async (orderId: number) => {
  const order = await binance.futuresCancelBatchOrders({
    symbol: TICKER.ETH,
    orderIdList: 'orderId, orderId',
    origClientOrderIdList: 'orderId, orderId',
  })
  return order
}

export default binance
