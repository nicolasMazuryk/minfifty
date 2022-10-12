// eslint-disable-next-line import/order
import '../alias-runtime'

import binance from '@/external/binance'
// import { MarketData } from '@/models'
import { MARKET, TICKER } from '@/strategy/constants'
import {
  getBacktestBars,
  marketDataToBar,
  logger,
  syncRemainingBarsUpToDate,
  // validateMarketDataIntegrity,
  wait,
  wsCandleToMarketData,
} from '@/strategy/helpers'
import { IBar } from '@/strategy/index'

import Strategy from './strategy'

const START_PERIOD_TIME = '2022-09-01T00:00:00+03:00'
const END_PERIOD_TIME = '2022-09-30T23:00:00+03:00'

const strategy = new Strategy()

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
