// eslint-disable-next-line import/order
import '../alias-runtime'

// import { MarketData } from '@/models'

import { IBar, IChartIndicator } from '@common/strategy'
import { START_PERIOD_TIME, END_PERIOD_TIME } from '@common/strategy/config'
import { MARKET, TICKER } from '@common/strategy/constants'
import Strategy from '@common/strategy/strategy'
import { logger, wait } from '@common/strategy/utils'

import binance from '@/external/binance'
import { ChartIndicator } from '@/models'
import {
  getBacktestBars,
  marketDataToBar,
  syncRemainingBarsUpToDate,
  // validateMarketDataIntegrity,
  wsCandleToMarketData,
} from '@/strategy/helpers'

const strategy = new Strategy()

const chartIndicatorResults: IChartIndicator[] = []

const saveChartIndicatorData = async (strategy: Strategy) => {
  const result = strategy.barChartVisualisation

  chartIndicatorResults.push(result)

  if (chartIndicatorResults.length % 1000) {
    await ChartIndicator.bulkCreate(chartIndicatorResults)
    chartIndicatorResults.length = 0
  }
}

;(async () => {
  await syncRemainingBarsUpToDate(MARKET.FUTURES, TICKER.ETH)
  logger.info('Synced remaining bars up to date')
  // await validateMarketDataIntegrity(MARKET.FUTURES, TICKER.ETH)

  const bars: IBar[] = await getBacktestBars(
    MARKET.FUTURES,
    TICKER.ETH,
    START_PERIOD_TIME,
    END_PERIOD_TIME,
  )

  logger.time('Strategy')

  for (const bar of bars) {
    strategy.run(bar)

    await saveChartIndicatorData(strategy)
  }

  if (chartIndicatorResults.length) {
    await ChartIndicator.bulkCreate(chartIndicatorResults)
  }

  logger.timeEnd('Strategy')

  strategy.isRealTime = true

  binance.ws.futuresCandles(TICKER.ETH, '1m', async (candle) => {
    const marketData = wsCandleToMarketData(MARKET.FUTURES, candle)
    const bar = marketDataToBar(marketData)

    // strategy.run(bar)

    logger.info(bar.time)

    if (candle.isFinal) {
      // await MarketData.bulkCreate([marketData])
    }
  })

  logger.info('Started real-time mode')

  logger.info(strategy.statistics)
  logger.info(strategy.realTimeStatistics)

  await wait(1000 * 60 * 60 * 24) // wait for 1 day
})().catch(logger.error)
