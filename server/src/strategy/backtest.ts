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

const INITIAL_CAPITAL = 1000
const ORDER_QUANTITY = 0.05
const TRADING_FEE = 0.04 / 100
//
const BASE_RETRACEMENT_CONFIRMATION = 0.5 / 100
const BASE_PRECEDING_BARS = 10
//
const NUMBER_OF_LEVELS = 10
const EMERGENCY_LEVEL_NUMBER = 10
const EMERGENCY_TAKE_PROFIT_RETRACEMENT = 0 / 100
const TAKE_PROFIT_BELOW_BASE = 0.0 / 100
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
  orders: string[]
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

interface IOrder {
  id: string
  symbol: string
  timeOpen: number
  timeClosed: number
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

const ORDER_SIDE = {
  BUY: 'BUY',
  SELL: 'SELL',
}

const ORDER_TYPE = {
  MARKET: 'MARKET',
  LIMIT: 'LIMIT',
}

const ORDER_STATUS = {
  OPEN: 'OPEN',
  FILLED: 'FILLED',
  COMPLETED: 'COMPLETED',
  CANCELED: 'CANCELED',
}

class Strategy {
  public capital: number = INITIAL_CAPITAL
  public symbol: string = TICKER.ETH
  public orders: IOrder[] = []

  // constructor(capital: number) {
  //   this.capital = capital
  // }

  // entry method that adds new order to the orders list
  public entry(id: string, price: number): IOrder {
    const order = {
      id: id,
      symbol: this.symbol,
      timeOpen: 0,
      timeClosed: 0,
      type: ORDER_TYPE.LIMIT,
      side: ORDER_SIDE.BUY,
      price: price,
      quantity: ORDER_QUANTITY,
      amount: ORDER_QUANTITY * price,
      status: ORDER_STATUS.OPEN,
      takeProfit: 0,
      fee: 0,
      PNL: 0,
    }

    this.orders.push(order)

    return order
  }

  public executeEntry(closePrice: number): void {
    this.orders.forEach((order) => {
      if (order.status === ORDER_STATUS.OPEN && closePrice <= order.price) {
        order.timeOpen = Date.now()
        order.status = ORDER_STATUS.FILLED
        order.fee = order.amount * TRADING_FEE
      }
    })
  }

  // exit method that removes order from the orders list
  public exit(fromId: string, takeProfit: number): IOrder | undefined {
    const order = this.orders.find((order) => order.id === fromId)
    if (!order) {
      logger.error(`Cannot EXIT from order ${fromId} . Order not found`)
      return
    }
    order.takeProfit = takeProfit

    return order
  }

  public executeExit(closePrice: number): void {
    this.orders.forEach((order) => {
      if (order.status === ORDER_STATUS.FILLED && closePrice >= order.takeProfit) {
        order.timeClosed = Date.now()
        order.status = ORDER_STATUS.COMPLETED
        order.fee = order.fee + order.quantity * order.takeProfit * TRADING_FEE
        order.PNL = (order.takeProfit - order.price) * order.quantity - order.fee
      }
    })
  }

  public cancel(id: string, closePrice?: number): IOrder | undefined {
    const order = this.orders.find((order) => order.id === id)
    if (!order) {
      logger.error(`Cannot CANCEL order ${id} . Order not found`)
      return
    }

    if (ORDER_STATUS.FILLED && closePrice) {
      order.fee = order.fee + order.quantity * closePrice * TRADING_FEE
      order.PNL = (closePrice - order.price) * order.quantity - order.fee
    }

    order.timeClosed = Date.now()
    order.status = ORDER_STATUS.CANCELED

    return order
  }

  // calculate PNL method that calculates PNL for each order in the orders list
  public calculatePNL(closePrice: number): void {
    this.orders
      .filter((order) => order.status === ORDER_STATUS.FILLED)
      .forEach((order) => {
        order.PNL = (closePrice - order.price) * order.quantity - order.fee
      })
  }

  // calculate capital method that calculates capital for each order in the orders list
  public calculateCapital(): void {
    this.capital = this.orders.reduce((acc, order) => acc + order.PNL, 0)
  }
}

const strategy = new Strategy()

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
      orders: [],
    }

    return newBase
  }
}

const placeLadderOfEntryAndExitLimitOrders = (base: IBase) => {
  for (let i = 1; i <= NUMBER_OF_LEVELS; i++) {
    const level = base.price * (1.0 - LEVEL_STEP * Math.pow(i, LEVEL_STEP_MULTIPLIER))
    base.levels.push(level)

    const orderId = `${base.barIndex} #${i}`

    strategy.entry(orderId, level)
    strategy.exit(orderId, base.price * (1 - TAKE_PROFIT_BELOW_BASE))

    base.orders.push(orderId)
  }
}

const cancelOpenLimitOrders = (base: IBase, closePrice?: number) => {
  for (let i = 0; i < NUMBER_OF_LEVELS; i++) {
    const entryOrderId = base.orders[i]

    if (closePrice) {
      strategy.cancel(entryOrderId, closePrice)
    }

    strategy.cancel(entryOrderId)

    logger.info(entryOrderId)
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

    strategy.executeEntry(bar.close)
    strategy.executeExit(bar.close)

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

        base.orders.forEach((orderId) => strategy.exit(orderId, base.emergencyTakeProfit))
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
        (base.isBroken &&
          (highPrice >= base.emergencyTakeProfit ||
            highPrice >= base.price * (1 - TAKE_PROFIT_BELOW_BASE))) ||
        isBarsLimitExceeded
      ) {
        base.isRespected = true
        // Close Open Limit Orders
        const closePrice =
          highPrice >= base.emergencyTakeProfit
            ? base.emergencyTakeProfit
            : base.price * (1 - TAKE_PROFIT_BELOW_BASE)

        cancelOpenLimitOrders(base, closePrice)
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
