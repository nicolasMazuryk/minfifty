import { CandleChartResult, Candle } from 'binance-api-node'
import Sequelize from 'sequelize'

import binance from '@/external/binance'
import { MarketData } from '@/models'
import { IBar, IMarketData } from '@/strategy/index'

const { Op } = Sequelize

export const logger = {
  // eslint-disable-next-line no-console
  info: (...args: any) => console.log(...args),
  // eslint-disable-next-line no-console
  error: (...args: any) => console.error(...args),
  // eslint-disable-next-line no-console
  time: (...args: any) => console.time(...args),
  // eslint-disable-next-line no-console
  timeEnd: (...args: any) => console.timeEnd(...args),
}

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const roundToPrecision = (precision: number) => (value: number) =>
  Number(value.toFixed(precision))

export const max = (arr: any[]) => Math.max(...arr, 0)

export const median = (arr: any[]) => {
  const mid = Math.floor(arr.length / 2),
    nums = [...arr].sort((a, b) => a - b)
  // eslint-disable-next-line no-negated-condition
  return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2 || 0
}

export const average = (arr: any[]) => arr.reduce((a, b) => a + b, 0) / arr.length || 0

export const roundEpochToFullMinute = (epoch: number) => {
  const date = new Date(epoch)
  date.setSeconds(0)
  date.setMilliseconds(0)
  return date.getTime()
}

export const candleToMarketData = (
  market: string,
  ticker: string,
  candle: CandleChartResult,
): IMarketData => {
  const {
    openTime,
    open,
    high,
    low,
    close,
    volume,
    closeTime,
    quoteVolume,
    trades,
    baseAssetVolume,
    quoteAssetVolume,
  } = candle

  return {
    market,
    ticker,
    time: new Date(openTime),
    timestamp: openTime,
    open,
    high,
    low,
    close,
    volume,
    timeClose: new Date(closeTime),
    timestampClose: closeTime,
    quoteAssetVolume: quoteVolume,
    trades,
    takerBuyBaseAssetVolume: baseAssetVolume,
    takerBuyQuoteAssetVolume: quoteAssetVolume,
  }
}

export const wsCandleToMarketData = (market: string, candle: Candle): IMarketData => {
  const {
    symbol,
    startTime,
    closeTime,
    open,
    high,
    low,
    close,
    volume,
    trades,
    quoteVolume,
    buyVolume,
    quoteBuyVolume,
  } = candle

  return {
    market,
    ticker: symbol,
    time: new Date(startTime),
    timestamp: startTime,
    open,
    high,
    low,
    close,
    volume,
    timeClose: new Date(closeTime),
    timestampClose: closeTime,
    quoteAssetVolume: quoteVolume,
    trades,
    takerBuyBaseAssetVolume: buyVolume,
    takerBuyQuoteAssetVolume: quoteBuyVolume,
  }
}

export const marketDataToBar = ({ time, open, high, low, close, volume }: IMarketData): IBar => ({
  time,
  open: parseFloat(open),
  high: parseFloat(high),
  low: parseFloat(low),
  close: parseFloat(close),
  volume: parseFloat(volume),
})

export const getBacktestBars = async (
  market: string,
  ticker: string,
  startDate: string,
  endDate: string,
): Promise<IBar[]> => {
  const marketData = await MarketData.findAll({
    where: {
      market,
      ticker,
      time: {
        [Op.between]: [startDate, endDate],
      },
    },
    order: [['timestamp', 'ASC']],
    raw: true,
  })

  return marketData.map(marketDataToBar)
}

// count number of minutes between two datetime strings
export const countMinutes = (start: Date, end: Date) => {
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  return Math.ceil((endTime - startTime) / (1000 * 60))
}

// query the first and the last record in marketData and return the difference in minutes
export const validateMarketDataIntegrity = async (market: string, ticker: string) => {
  const firstRecord = await MarketData.findOne({
    where: {
      market,
      ticker,
    },
    order: [['timestamp', 'ASC']],
    raw: true,
  })
  const lastRecord = await MarketData.findOne({
    where: {
      market,
      ticker,
    },
    order: [['timestamp', 'DESC']],
    raw: true,
  })
  const totalRecords = await MarketData.count({
    where: {
      market,
      ticker,
    },
  })
  if (!firstRecord || !lastRecord) return 0

  const totalMinutes = countMinutes(firstRecord.time, lastRecord.time)

  if (totalMinutes !== totalRecords) {
    throw new Error(
      `MarketData for ${ticker} is not complete. Total minutes: ${totalMinutes}, total records: ${totalRecords}`,
    )
  }
}

export async function syncRemainingBarsUpToDate(market: string, ticker: string) {
  const latestCandle = await MarketData.findOne({
    order: [['timestamp', 'DESC']],
  })
  if (!latestCandle) return

  const startTime = +latestCandle.timestamp
  const endTime = Date.now()
  const interval = 1000 * 60 * 500 // 500 minutes
  for (let i = startTime; i < endTime; i += interval) {
    const start = i + 60 * 1000
    const end = i + interval <= Date.now() ? i + interval : Date.now()

    const endTimestamp = Math.max(startTime, roundEpochToFullMinute(end) - 60 * 1000)

    if (endTimestamp === start) return

    const remainingCandles: CandleChartResult[] = await binance.futuresCandles({
      symbol: ticker,
      interval: '1m',
      startTime: start,
      endTime: endTimestamp,
    })

    const marketData: any[] = remainingCandles.map((candle) =>
      candleToMarketData(market, ticker, candle),
    )
    await MarketData.bulkCreate(marketData)
  }
}
