export interface IBase {
  barIndex: number
  price: number
  isBroken: boolean
  isRespected: boolean
  breakEven: number
  emergencyTakeProfit: number
  emergencyPriceLow: number
  levels: number[] // TODO: remove levels. add EmergencyTriggerPrice instead
  stats: {
    percentDrop: number
    barsLength: number
  }
}

export interface IBar {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface IOrder {
  baseBarIndex: number
  level: number
  symbol: string
  timeOpen: string
  timeClosed: string
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
