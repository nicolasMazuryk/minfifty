import { FuturesOrder } from 'binance-api-node'

let orderIdCounter = 0

export const binanceMocked = {
  futuresBatchOrders: async function ({
    batchOrders,
  }: {
    batchOrders: any
  }): Promise<FuturesOrder[]> {
    orderIdCounter++

    return JSON.parse(batchOrders).map((order: any) => ({
      orderId: orderIdCounter,
      symbol: 'ETHUSDT',
      status: 'NEW',
      clientOrderId: order.newClientOrderId,
      price: order.price,
      avgPrice: '0.00000',
      origQty: order.quantity,
      executedQty: '0',
      cumQty: '0',
      cumQuote: '0',
      timeInForce: 'GTC',
      type: order.type,
      reduceOnly: false,
      closePosition: false,
      side: order.side,
      positionSide: 'BOTH',
      stopPrice: order.stopPrice === '0' ? order.takeProfit : order.stopPrice,
      workingType: 'CONTRACT_PRICE',
      priceProtect: false,
      origType: order.type,
      updateTime: 1680883959441,
    }))
  },

  futuresCancelBatchOrders: async function ({
    symbol,
    origClientOrderIdList,
  }: any): Promise<FuturesOrder[]> {
    return JSON.parse(origClientOrderIdList).map((orderId: any) => ({
      clientOrderId: orderId,
      cumQty: '0',
      cumQuote: '0',
      executedQty: '0',
      orderId: 1032635004,
      origQty: '0.005',
      price: '1000.00',
      reduceOnly: false,
      side: 'BUY',
      positionSide: 'BOTH',
      status: 'CANCELED',
      stopPrice: '0',
      symbol: symbol,
      timeInForce: 'GTC',
      type: 'LIMIT',
      updateTime: 1680884595844,
      avgPrice: '0.00000',
      workingType: 'CONTRACT_PRICE',
      origType: 'LIMIT',
      closePosition: false,
      priceProtect: false,
    }))
  },
}
