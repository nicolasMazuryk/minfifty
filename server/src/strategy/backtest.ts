// eslint-disable-next-line import/order
import '../alias-runtime'

// import { MarketData } from '@/models'

import { IBar } from '@common/strategy'
import { START_PERIOD_TIME, END_PERIOD_TIME } from '@common/strategy/config'
import { MARKET, TICKER } from '@common/strategy/constants'
import Strategy from '@common/strategy/strategy'
import {
  logger,
  // wait
} from '@common/strategy/utils'

// import binance from '@/external/binance'
import {
  getBacktestBars,
  logStrategyPerformance,
  // marketDataToBar,
  syncRemainingBarsUpToDate,
  // validateMarketDataIntegrity,
  // wsCandleToMarketData,
} from '@/strategy/helpers'

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
    strategy.run(bar)
  }

  logger.timeEnd('Strategy')

  strategy.isRealTime = true

  // binance.ws.futuresCandles(TICKER.ETH, '1m', async (candle) => {
  //   const marketData = wsCandleToMarketData(MARKET.FUTURES, candle)
  //   const bar = marketDataToBar(marketData)
  //
  //   // strategy.run(bar)
  //
  //   logger.info(bar.time)
  //
  //   if (candle.isFinal) {
  //     // await MarketData.bulkCreate([marketData])
  //   }
  // })

  await logStrategyPerformance(strategy)

  const result = strategy.closedBases.sort((a, b) => a.PNL - b.PNL)

  logger.info(result.length)

  logger.info({
    Bars: strategy.barIndex,
    Orders: strategy.closedOrders.length,
    Bases: strategy.closedBases.length,
  })
  logger.info('Started real-time mode')

  // await wait(1000 * 60 * 60 * 24) // wait for 1 day
})().catch(logger.error)
