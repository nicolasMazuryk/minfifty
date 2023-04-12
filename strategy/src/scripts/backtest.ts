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

const UNPROCESSED_BARS_STACK: IBar[] = []

let isProcessing = false
const runUnprocessedBarsStack = async () => {
  isProcessing = true
  while (UNPROCESSED_BARS_STACK.length > 0) {
    const bar = UNPROCESSED_BARS_STACK.shift()

    await strategy.run(bar!)
  }
  isProcessing = false
}

;(async () => {
  await syncRemainingBarsUpToDate(MARKET.FUTURES, TICKER.ETH)
  logger.info('Synced remaining bars up to date')
  // await validateMarketDataIntegrity(MARKET.FUTURES, TICKER.ETH)

  logger.time('Strategy')

  const bars: IBar[] = await getBacktestBars(
    MARKET.SPOT,
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

    UNPROCESSED_BARS_STACK.push(bar)

    if (bar.isFinal) {
      await MarketData.bulkCreate([marketData])
    }
  })

  setInterval(async () => {
    if (isProcessing) return
    await runUnprocessedBarsStack()
  }, 1000)

  //
  // binance.ws.futuresUser(async (msg) => {
  //   if (msg.eventType !== 'ORDER_TRADE_UPDATE') return
  //   const event: OrderUpdate = msg
  //
  //   // const marketData = wsCandleToMarketData(MARKET.FUTURES, candle)
  //   // const bar = marketDataToBar(marketData)
  //   //
  //   // await strategy.run(bar)
  // })

  strategy.updateStatisticsOnComplete()

  await logStrategyPerformance(strategy)

  // const closedBases = strategy.closedBases.sort((a, b) => a.PNL - b.PNL)
  // const closedInLossBases = strategy.closedInLossBases
  // logger.info(closedInLossBases.length)

  logger.info('Started real-time mode')

  await wait(1000 * 60 * 60 * 24 * 7) // wait for 7 days
})().catch(logger.error)
