import { OrderUpdate } from 'binance-api-node'
import { uuid } from 'uuidv4';

export interface IBase {
  barIndex: number
  price: number
  baseBrokenTime: Date | null
  baseBrokenBarIndex: number
  isBroken: boolean
  isIgnored: boolean
  baseBounceTop: number
  takeProfit: number
  breakEven: number
  stopLoss: number
  warningPriceLow: number
  emergencyTakeProfit: number
  emergencyPriceLow: number
  breakEvenPriceLow: number
  levels: number[] // TODO: remove levels. add EmergencyTriggerPrice instead
  isClosedInProfit: boolean
  isClosedInBreakEven: boolean
  isClosedInLoss: boolean
  PNL: number
  stats: {
    percentDrop: number
    percentBounce: number
    barsLength: number
  },
  orders: IOrder[]
}

export interface IGlobalBase {
  barIndex: number
  price: number
  // isBroken: boolean
  // isClosedInProfit: boolean
  stats: {
    percentDrop: number
    barsLength: number
  }
}

export interface IBar {
  time: Date
  open: number
  high: number
  low: number
  close: number
  volume: number
  isFinal?: boolean
}

export interface IOrder {
  limitOrderId: uuid
  stopLimitOrderId: uuid
  takeProfitOrderId: uuid

  baseBarIndex: number
  level: number
  timeOpen: Date | null
  timeClosed: Date | null
  barIndexOpen: number | null
  barIndexClosed: number | null
  price: number
  quantity: number
  amount: number
  status: string
  takeProfit: number
  breakEven: number
  stopLoss: number
  fee: number
  PNL: number

  feeCoin: number
  PNLCoin: number

  binanceLimit: OrderUpdate | undefined
  binanceTakeProfit: OrderUpdate | undefined
  binanceStopLoss: OrderUpdate | undefined

  base: IBase
}

export interface IMarketData {
  market: string
  ticker: string
  time: Date
  timestamp: number
  open: string
  high: string
  low: string
  close: string
  volume: string
  timeClose: Date
  timestampClose: number
  quoteAssetVolume: string
  trades: number
  takerBuyBaseAssetVolume: string
  takerBuyQuoteAssetVolume: string
  isFinal?: boolean
}

export interface IChartIndicator {
  time: Date
  timestamp: number
  bases: number[]
  brokenBases: number[]
  respectedBases: number[]
  buyOrders: number[]
  sellOrders: number[]
}
