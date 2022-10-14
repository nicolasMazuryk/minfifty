import { IBar, IMarketData } from '@common/strategy'
import { countMinutes, roundEpochToFullMinute } from '@common/strategy/utils'
import { CandleChartResult, Candle } from 'binance-api-node'
import Sequelize from 'sequelize'

import binance from '@/external/binance'
import { MarketData } from '@/models'

const { Op } = Sequelize

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
      timestamp: {
        [Op.gte]: new Date(startDate).getTime(),
        [Op.lte]: new Date(endDate).getTime(),
      },
    },
    order: [['timestamp', 'ASC']],
    raw: true,
  })

  return marketData.map(marketDataToBar)
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
