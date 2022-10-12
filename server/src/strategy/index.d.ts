export interface IBase {
  barIndex: number
  price: number
  isBroken: boolean
  isRespected: boolean
  breakEven: number
  emergencyTakeProfit: number
  emergencyPriceLow: number
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
