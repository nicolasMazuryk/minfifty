export interface IBase {
  barIndex: number
  price: number
  isBroken: boolean
  isRespected: boolean
  breakEven: number
  baseBounceTop: number
  takeProfit: number
  warningPriceLow: number
  emergencyTakeProfit: number
  emergencyPriceLow: number
  stopLoss: number
  levels: number[] // TODO: remove levels. add EmergencyTriggerPrice instead
  isClosedInLoss: boolean
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
}

export interface IOrder {
  baseBarIndex: number
  level: number
  timeOpen: Date | null
  timeClosed: Date | null
  type: string
  side: string
  price: number
  quantity: number
  amount: number
  status: string
  takeProfit: number
  stopLoss: number
  fee: number
  PNL: number
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
