// eslint-disable-next-line import/order
import '../alias-runtime'

import Strategy from '@common/strategy'
import { START_PERIOD_TIME, END_PERIOD_TIME } from '@common/strategy/config'
import { MARKET, TICKER } from '@common/strategy/constants'
import { IBar } from '@common/strategy/types'
import { logger, wait } from '@common/strategy/utils'
import { Candle } from 'binance-api-node'

import { MarketData } from '@/models'

import binance from './binance'
import {
  getBacktestBars,
  logStrategyPerformance,
  marketDataToBar,
  syncRemainingBarsUpToDate,
  // validateMarketDataIntegrity,
  wsCandleToMarketData,
} from './helpers'

const strategy = new Strategy()

;(async () => {
  await syncRemainingBarsUpToDate(MARKET.FUTURES, TICKER.ETH)
  logger.info('Synced remaining bars up to date')
  // await validateMarketDataIntegrity(MARKET.FUTURES, TICKER.ETH)

  logger.time('Strategy')

  const bars: IBar[] = await getBacktestBars(
    MARKET.FUTURES,
    TICKER.ETH,
    START_PERIOD_TIME,
    END_PERIOD_TIME,
  )

  for (const bar of bars) {
    await strategy.run(bar)
  }

  logger.timeEnd('Strategy')

  strategy.isRealTime = true

  binance.ws.futuresCandles(TICKER.ETH, '1m', async (candle: Candle) => {
    const marketData = wsCandleToMarketData(MARKET.FUTURES, candle)
    const bar = marketDataToBar(marketData)

    await strategy.run(bar)

    if (bar.isFinal) {
      await MarketData.bulkCreate([marketData])
    }
  })

  strategy.updateStatisticsOnComplete()

  await logStrategyPerformance(strategy)

  // const closedBases = strategy.closedBases.sort((a, b) => a.PNL - b.PNL)
  // const closedInLossBases = strategy.closedInLossBases
  // logger.info(closedInLossBases.length)

  logger.info('Started real-time mode')

  await wait(1000 * 60 * 60 * 24 * 7) // wait for 30 days
})().catch(logger.error)
