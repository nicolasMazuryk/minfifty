// eslint-disable-next-line import/order
import '../alias-runtime'

import { Op } from 'sequelize'

// eslint-disable-next-line import/order
import { MarketData } from '@/models'

const MARKET = {
  SPOT: 'SPOT',
  FUTURES: 'FUTURES',
}

const TICKER = {
  BTC: 'BTCUSDT',
  ETH: 'ETHUSDT',
}

// Strategy Settings

// const INITIAL_CAPITAL = 1000
// const ORDER_QUANTITY = 0.05
// const COMMISSION = 0.04 / 100
//
const BASE_RETRACEMENT_CONFIRMATION = 0.5 / 100
const BASE_PRECEDING_BARS = 10
//
const NUMBER_OF_LEVELS = 10
const EMERGENCY_LEVEL_NUMBER = 10
const EMERGENCY_TAKE_PROFIT_RETRACEMENT = 0 / 100
// const TAKE_PROFIT_BELOW_BASE = 0.0 / 100
//
const LEVEL_STEP = 0.5 / 100
const LEVEL_STEP_MULTIPLIER = 1
const BASE_BARS_LENGTH_LIMIT = 0
// const LEVERAGE_X = 2
// const MAINTANACE_MARGIN = 20 / 100
//
// const SHOW_POSITION_BREAKEVEN_PRICE = true
// const SHOW_LIQUIDATION_PRICE = false
//
// const TOP_BASE_IGNORED_THRESHOLD = 2.0 / 100
// const TOP_BASE_IGNORED_PRECEDING_BARS = 30 * 60
//
// const FLAT_BASE_BARS_RANGE_CHECK = 8
// const FLAT_BASE_BOUNCE_THRESHOLD = 0.1 / 100
// const FLAT_BASE_BARS_NUMBER_LIMIT = 4

const START_PERIOD_TIME = '2022-08-01T00:00:00+00:00'
const END_PERIOD_TIME = '2022-08-01T23:59:00+00:00'

// error logging function
const logger = {
  // eslint-disable-next-line no-console
  info: (...args: any) => console.log(...args),
  // eslint-disable-next-line no-console
  error: (...args: any) => console.error(...args),
}

interface IBase {
  barIndex: number
  price: number
  isBroken: boolean
  isRespected: boolean
  breakEven: number
  emergencyTakeProfit: number
  emergencyPriceLow: number
  levels: number[]
  entryOrders: string[]
  exitOrders: string[]
}

interface IBar {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

const BASES: IBase[] = []

// find in bars array the first bar where high divided on low is more or equal than BASE_RETRACEMENT_CONFIRMATION
function findConfirmedBaseBarIndex(bars: IBar[], barIndex: number): number | null {
  let offset = 0

  for (let index = barIndex; index >= 0; index--) {
    const high = barIndex === index ? bars[barIndex].close : bars[barIndex].high
    if (high / bars[index].low >= 1 + BASE_RETRACEMENT_CONFIRMATION) {
      offset = index
      break
    }
  }

  for (let index = offset; index >= 0; index--) {
    const currentLow = bars[index].low

    const precedingBars = bars.slice(index - BASE_PRECEDING_BARS, index)

    if (precedingBars.every(({ low }) => currentLow <= low)) {
      return index
    }
  }

  return null
}

const getNewBase = (bars: IBar[], confirmedBaseBarIndex: number | null) => {
  if (confirmedBaseBarIndex && !BASES.some(({ barIndex }) => barIndex === confirmedBaseBarIndex)) {
    const newBase = {
      barIndex: confirmedBaseBarIndex,
      price: bars[confirmedBaseBarIndex].low,
      isBroken: false,
      isRespected: false,
      breakEven: 0,
      emergencyTakeProfit: 999999,
      emergencyPriceLow: 999999,
      levels: [],
      entryOrders: [],
      exitOrders: [],
    }

    return newBase
  }
}

const placeLadderOfEntryAndExitLimitOrders = (base: IBase) => {
  for (let i = 1; i <= NUMBER_OF_LEVELS; i++) {
    const level = base.price * (1.0 - LEVEL_STEP * Math.pow(i, LEVEL_STEP_MULTIPLIER))
    base.levels.push(level)

    const entryOrderId = `Entry ${base.barIndex} #${i}`
    const exitOrderId = `Exit ${base.barIndex} #${i}`
    // TODO: implement strategy.entry/order/exit order management backtesting solution
    // strategy.entry(entryOrderID, strategy.long, limit=limitOrderPriceLevel, comment=entryOrderID)
    // strategy.exit(exitOrderID, from_entry=entryOrderID, limit=confirmedBasePriceLow * (1 - tp_below_base), comment=exitOrderID)

    base.entryOrders.push(entryOrderId)
    base.exitOrders.push(exitOrderId)
  }
}

const cancelOpenLimitOrders = (base: IBase, closeEntryOrdersWithOpenPosition = false) => {
  for (let i = 0; i < NUMBER_OF_LEVELS; i++) {
    const entryOrderId = base.entryOrders[i]
    const exitOrderId = base.exitOrders[i]

    if (closeEntryOrdersWithOpenPosition) {
      // TODO: implement strategy.entry/order/exit order management backtesting solution
      // strategy.close(entryOrderID, comment=entryOrderID)
    }

    // TODO: implement strategy.cancel order management backtesting solution
    // strategy.cancel(exitOrderID)
    // strategy.cancel(entryOrderID)

    logger.info(entryOrderId, exitOrderId)
  }
}

async function getBacktestBars(
  market: string,
  ticker: string,
  startDate: string,
  endDate: string,
): Promise<IBar[]> {
  const startDatePeriod = new Date(startDate)
  const endDatePeriod = new Date(endDate)
  const marketData = await MarketData.findAll({
    where: {
      market,
      ticker,
      time: {
        [Op.between]: [startDatePeriod, endDatePeriod],
      },
    },
    raw: true,
  })
  const bars: IBar[] = marketData.map(({ time, open, high, low, close, volume }) => ({
    time,
    open: parseFloat(open),
    high: parseFloat(high),
    low: parseFloat(low),
    close: parseFloat(close),
    volume: parseFloat(volume),
  }))

  return bars
}

;(async () => {
  const bars: IBar[] = await getBacktestBars(
    MARKET.FUTURES,
    TICKER.ETH,
    START_PERIOD_TIME,
    END_PERIOD_TIME,
  )

  for (let barIndex = 0; barIndex < bars.length; barIndex++) {
    const bar = bars[barIndex]
    const confirmedBaseBarIndex = findConfirmedBaseBarIndex(bars, barIndex)

    logger.info(`ConfirmedBaseBarIndex`, confirmedBaseBarIndex)

    // Manage existing Broken Bases and the last Confirmed Base
    let baseIndex = 0

    while (baseIndex < BASES.length) {
      const base = BASES[baseIndex]
      const levelOne = base.levels[0]
      const emergencyLevel = base.levels[EMERGENCY_LEVEL_NUMBER - 1]

      const wasBaseBrokenOnPreviousBar = base.isBroken
      const wasEmergencyTakeProfitOnPreviousBar = base.emergencyPriceLow < 999999

      // Set Broken Base
      if (bar.low <= levelOne) {
        base.isBroken = true
      }

      // Calculate and Place Emergency Take Profit
      if (bar.low <= emergencyLevel && bar.low < base.emergencyPriceLow) {
        base.emergencyPriceLow = bar.low

        base.emergencyTakeProfit =
          bar.low + (base.price - bar.low) * EMERGENCY_TAKE_PROFIT_RETRACEMENT

        // for i = 1 to number_of_levels
        //                 string entryOrderID = "Entry " + str.tostring(baseBarIndex) + " #" + str.tostring(i)
        //                 string exitOrderID = "Exit " + str.tostring(baseBarIndex) + " #" + str.tostring(i)
        //
        //                 strategy.exit(exitOrderID, from_entry=entryOrderID, limit=emergencyTakeProfitPriceLevel, comment=exitOrderID)

        // TODO: implement strategy.exit order management backtesting solution
      }

      // Set Respected Base
      const highPrice =
        (!wasBaseBrokenOnPreviousBar && base.isBroken) ||
        (!wasEmergencyTakeProfitOnPreviousBar && base.emergencyPriceLow < 999999)
          ? bar.close
          : bar.high

      // Close orders if base exceeds BASE_BARS_LENGTH_LIMIT
      const isBarsLimitExceeded =
        BASE_BARS_LENGTH_LIMIT > 0 &&
        base.isBroken &&
        barIndex - base.barIndex >= BASE_BARS_LENGTH_LIMIT

      if (
        (base.isBroken && (highPrice >= base.emergencyTakeProfit || highPrice >= base.price)) ||
        isBarsLimitExceeded
      ) {
        base.isRespected = true
        // Close Open Limit Orders
        cancelOpenLimitOrders(base, true)
        // Remove Respected Base
        BASES.splice(baseIndex, 1)
      } else {
        baseIndex++
      }
    }

    // Add the FIRST New Confirmed Base
    if (confirmedBaseBarIndex && confirmedBaseBarIndex > 0 && BASES.length === 0) {
      const newBase = getNewBase(bars, confirmedBaseBarIndex)
      if (newBase) {
        placeLadderOfEntryAndExitLimitOrders(newBase)
        BASES.unshift(newBase)
      }
    }

    // Add either ANOTHER NEW Confirmed Base or REPLACE an existing Confirmed Base
    if (BASES.length > 0 && confirmedBaseBarIndex && confirmedBaseBarIndex > BASES[0].barIndex) {
      const newBase = getNewBase(bars, confirmedBaseBarIndex)
      if (newBase) {
        // Base Broken -> Add new Base
        if (BASES[0].isBroken) {
          BASES.unshift(newBase)
        } else {
          // Close Open Limit Orders
          cancelOpenLimitOrders(BASES[0])
          // Replace to a new Base
          BASES[0] = newBase
        }
        placeLadderOfEntryAndExitLimitOrders(newBase)
      }
    }
  }
})().catch(logger.error)
