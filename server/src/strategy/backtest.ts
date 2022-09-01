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

const TICKER_PRECISION = {
  [TICKER.ETH]: 2,
}

// Strategy Settings

const INITIAL_CAPITAL = 1000
const ORDER_QUANTITY = 0.05
const TRADING_FEE = 0.04 / 100
//
const BASE_RETRACEMENT_CONFIRMATION = 0.5 / 100
const BASE_PRECEDING_BARS = 10
//
const NUMBER_OF_LEVELS = 5
const EMERGENCY_LEVEL_NUMBER = 2
const EMERGENCY_TAKE_PROFIT_RETRACEMENT = 0 / 100
const TAKE_PROFIT_BELOW_BASE = 0.0 / 100
//
const LEVEL_STEP = 0.5 / 100
const LEVEL_STEP_MULTIPLIER = 1
const BASE_BARS_LENGTH_LIMIT = 0
const LEVERAGE_X = 2
const MAINTANACE_MARGIN = 20 / 100
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

const START_PERIOD_TIME = '2022-08-31T19:05:00+03:00'
const END_PERIOD_TIME = '2022-08-31T20:00:00+03:00'

// error logging function
const logger = {
  // eslint-disable-next-line no-console
  info: (...args: any) => console.log(...args),
  // eslint-disable-next-line no-console
  error: (...args: any) => console.error(...args),
}

const round = (value: number) => Number(value.toFixed(TICKER_PRECISION[TICKER.ETH]))

const median = (arr: any[]) => {
  const mid = Math.floor(arr.length / 2),
    nums = [...arr].sort((a, b) => a - b)
  // eslint-disable-next-line no-negated-condition
  return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
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
  stats: {
    percentDrop: number
    barsLength: number
  }
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
  CLOSED: 'CLOSED',
  CANCELED: 'CANCELED',
}

class Strategy {
  public initialCapital: number = INITIAL_CAPITAL
  public symbol: string = TICKER.ETH
  public orders: IOrder[] = []
  public allBases: IBase[] = []
  public emergencyClosedBases: IBase[] = []

  public get positionAvgPrice() {
    if (!this.openTrades.length) return 0

    return this.openTrades.reduce((acc, order) => acc + order.price, 0) / this.openTrades.length
  }

  public get positionSize() {
    return this.orders.reduce((acc, order) => acc + order.quantity, 0)
  }

  public get equity() {
    return this.initialCapital + this.netProfit
  }

  public get netProfit() {
    return this.orders.reduce((acc, order) => acc + order.PNL, 0)
  }

  public get openProfit() {
    return this.openTrades.reduce((acc, order) => acc + order.PNL, 0)
  }

  public get totalProfit() {
    return this.netProfit + this.openProfit
  }

  public get openTrades() {
    return this.orders.filter((order) => order.status === ORDER_STATUS.FILLED)
  }

  public statistics = {
    maxPositionSize: 0,
    maxOpenTrades: 0,
    maxLiquidationPriceLevel: 0,
    maxDistanceToLiquidationPriceLevelPercent: 100,
    maxSimultaneousBrokenBases: 0,
    maxUnavailableMarginBalance: INITIAL_CAPITAL * LEVERAGE_X,
    maxDrawdownPricePercent: 0,
    maxDrawdownEquityPercent: 0,
  }

  public getStatistics(bar: IBar) {
    const availableAccountBalance = round(this.equity - this.positionSize * this.positionAvgPrice)
    const availableMarginBalance = round(
      this.equity * LEVERAGE_X - this.positionSize * this.positionAvgPrice,
    )
    const borrowedAboveEquity = this.positionSize * this.positionAvgPrice - this.equity || 0
    const liquidationPriceLevel =
      (borrowedAboveEquity * (1 + MAINTANACE_MARGIN)) / this.positionSize
    const distanceToLiquidationPriceLevelPercent =
      ((bar.low - liquidationPriceLevel) / bar.low) * 100

    const isNotEnoughFundsToOpenOrder = availableMarginBalance <= 0
    const isLiquidated = bar.low <= liquidationPriceLevel

    const maxEmergencyClosedBases = this.emergencyClosedBases.length

    // --------------------------------------------------------------

    this.statistics.maxPositionSize =
      this.statistics.maxPositionSize < this.positionSize
        ? this.positionSize
        : this.statistics.maxPositionSize

    this.statistics.maxOpenTrades =
      this.statistics.maxOpenTrades < this.openTrades.length
        ? this.openTrades.length
        : this.statistics.maxOpenTrades

    if (
      this.statistics.maxDistanceToLiquidationPriceLevelPercent >
      distanceToLiquidationPriceLevelPercent
    ) {
      this.statistics.maxDistanceToLiquidationPriceLevelPercent =
        distanceToLiquidationPriceLevelPercent
      this.statistics.maxLiquidationPriceLevel = liquidationPriceLevel
    }

    const simultaneousBrokenBases = BASES.filter((base) => base.isBroken).length

    this.statistics.maxSimultaneousBrokenBases =
      this.statistics.maxSimultaneousBrokenBases < simultaneousBrokenBases
        ? simultaneousBrokenBases
        : this.statistics.maxSimultaneousBrokenBases

    this.statistics.maxUnavailableMarginBalance =
      this.statistics.maxUnavailableMarginBalance > availableMarginBalance
        ? availableMarginBalance
        : this.statistics.maxUnavailableMarginBalance

    const currentDrawdownPricePercent = round(
      ((this.positionAvgPrice - bar.low) / this.positionAvgPrice) * 100,
    )
    const curentDrawdownEquityPercent = round(
      (((this.positionAvgPrice - bar.low) * this.positionSize) / this.initialCapital) * 100,
    )

    this.statistics.maxDrawdownPricePercent =
      this.statistics.maxDrawdownPricePercent < currentDrawdownPricePercent
        ? currentDrawdownPricePercent
        : this.statistics.maxDrawdownPricePercent

    this.statistics.maxDrawdownEquityPercent =
      this.statistics.maxDrawdownEquityPercent < curentDrawdownEquityPercent
        ? curentDrawdownEquityPercent
        : this.statistics.maxDrawdownEquityPercent

    // Bases Statistics

    const confirmedBasesTotalNumber = this.allBases.length
    const brokenBases = this.allBases.filter((base) => base.isBroken)
    const brokenBasesTotalNumber = brokenBases.length

    const brokenBaseDropMax = brokenBases.reduce(
      (acc, base) => (acc > base.stats.percentDrop ? acc : base.stats.percentDrop),
      0,
    )
    const brokenBaseDropAvg = brokenBases.length
      ? brokenBases.reduce((acc, base) => acc + base.stats.percentDrop, 0) / brokenBases.length
      : 0

    const brokenBaseDropMedian = median(brokenBases.map((base) => base.stats.percentDrop))

    const brokenBaseBarsMax = brokenBases.reduce(
      (acc, base) => (acc > base.stats.percentDrop ? acc : base.stats.barsLength),
      0,
    )

    const brokenBaseBarsAvg = brokenBases.length
      ? brokenBases.reduce((acc, base) => acc + base.stats.barsLength, 0) / brokenBases.length
      : 0

    const brokenBaseBarsMedian = median(brokenBases.map((base) => base.stats.barsLength))

    return {
      positionBreakEvenPrice: this.positionAvgPrice,
      availableAccountBalance,
      availableMarginBalance,
      borrowedAboveEquity,
      liquidationPriceLevel,
      distanceToLiquidationPriceLevelPercent,
      isNotEnoughFundsToOpenOrder,
      isLiquidated,

      maxEmergencyClosedBases,

      confirmedBasesTotalNumber,
      brokenBasesTotalNumber,
      brokenBaseDropMax,
      brokenBaseDropAvg,
      brokenBaseDropMedian,
      brokenBaseBarsMax,
      brokenBaseBarsAvg,
      brokenBaseBarsMedian,
    }
  }

  public updateBaseStats(base: IBase, bar: IBar, barIndex: number) {
    const percentDrop = round((1 - bar.low / base.price) * 100)
    const barsLength = barIndex - base.barIndex

    base.stats.percentDrop =
      percentDrop > base.stats.percentDrop ? percentDrop : base.stats.percentDrop
    base.stats.barsLength = barsLength > base.stats.barsLength ? barsLength : base.stats.barsLength
  }

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

    logger.info(`strategy.entry: ${id} | ${price}`)

    return order
  }

  public executeEntry(closePrice: number): void {
    this.orders.forEach((order) => {
      if (order.status === ORDER_STATUS.OPEN && closePrice <= order.price) {
        order.timeOpen = Date.now() // TODO: use bar timestemp when backtesting, and Date.now() when forwardtesting
        order.status = ORDER_STATUS.FILLED
        order.fee = order.amount * TRADING_FEE
      }
    })
    logger.info(`strategy.executeEntry: ${closePrice}`)
  }

  // exit method that removes order from the orders list
  public exit(fromId: string, takeProfit: number): IOrder | undefined {
    const order = this.orders.find((order) => order.id === fromId)
    if (!order) {
      logger.error(`Cannot EXIT from order ${fromId} . Order not found`)
      return
    }
    order.takeProfit = takeProfit

    logger.info(`strategy.entry: ${fromId} | ${takeProfit}`)

    return order
  }

  public executeExit(closePrice: number): void {
    this.orders.forEach((order) => {
      if (order.status === ORDER_STATUS.FILLED && closePrice >= order.takeProfit) {
        order.timeClosed = Date.now() // TODO: use bar timestemp when backtesting, and Date.now() when forwardtesting
        order.status = ORDER_STATUS.COMPLETED
        order.fee = order.fee + order.quantity * order.takeProfit * TRADING_FEE
        order.PNL = (order.takeProfit - order.price) * order.quantity - order.fee
      }
    })

    logger.info(`strategy.executeExit: ${closePrice}`)
  }

  public cancel(id: string, closePrice?: number): IOrder | undefined {
    const order = this.orders.find((order) => order.id === id)
    if (!order) {
      logger.error(`Cannot CANCEL order ${id} . Order not found`)
      return
    }
    // TODO: probably this block is redundant as strategy.executeExit is called earlier and status is ORDER_STATUS.COMPLETED at this point
    // but probably this is for Emergency Take Profit
    if (order.status === ORDER_STATUS.FILLED && closePrice) {
      order.timeClosed = Date.now()
      order.status = ORDER_STATUS.CLOSED
      order.fee = order.fee + order.quantity * closePrice * TRADING_FEE
      order.PNL = (closePrice - order.price) * order.quantity - order.fee
    } else {
      // order.timeClosed = Date.now()
      order.status = ORDER_STATUS.CANCELED
    }

    order.timeClosed = Date.now()
    order.status = ORDER_STATUS.CANCELED

    logger.info(`strategy.cancel: ${id} | ${closePrice}`)

    return order
  }

  // calculate PNL method that calculates PNL for each order in the orders list
  public calculatePNL(closePrice: number): void {
    this.orders
      .filter((order) => order.status === ORDER_STATUS.FILLED)
      .forEach((order) => {
        order.PNL = (closePrice - order.price) * order.quantity - order.fee
      })

    logger.info(`strategy.calculatePNL: ${closePrice}`)
  }

  // calculate capital method that calculates capital for each order in the orders list
  public calculateCapital(): void {
    this.initialCapital = this.orders.reduce((acc, order) => acc + order.PNL, 0)

    logger.info(`strategy.calculateCapital: ${this.initialCapital}`)
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

    const precedingBars = bars.slice(Math.max(0, index - BASE_PRECEDING_BARS), index)

    if (precedingBars.length && precedingBars.every(({ low }) => currentLow <= low)) {
      logger.info(`findConfirmedBaseBarIndex: barIndex ${barIndex} | index ${index}`)

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
      stats: {
        percentDrop: 0,
        barsLength: 0,
      },
    }

    logger.info(`getNewBase: confirmedBaseBarIndex ${confirmedBaseBarIndex}`)

    return newBase
  }
}

const placeLadderOfEntryAndExitLimitOrders = (base: IBase) => {
  for (let i = 1; i <= NUMBER_OF_LEVELS; i++) {
    const level = round(base.price * (1.0 - LEVEL_STEP * Math.pow(i, LEVEL_STEP_MULTIPLIER)))
    base.levels.push(level)

    const orderId = `${base.barIndex} #${i}`

    strategy.entry(orderId, level)
    strategy.exit(orderId, round(base.price * (1 - TAKE_PROFIT_BELOW_BASE)))

    base.orders.push(orderId)

    logger.info(`placeLadderOfEntryAndExitLimitOrders: base.barIndex ${base.barIndex}`)
  }
}

const cancelOpenLimitOrders = (base: IBase, closePrice?: number) => {
  for (let i = 0; i < NUMBER_OF_LEVELS; i++) {
    const entryOrderId = base.orders[i]
    // TODO: refactor, no need to pass entryOrderId, get rid of it. Cancel not orders, but cancel the base
    // if (closePrice) {
    //   strategy.cancel(entryOrderId, closePrice)
    // }
    // TODO: once base isRespected -> move both executed and canceled orders to ordersHistory
    strategy.cancel(entryOrderId, closePrice)
  }

  logger.info(
    `placeLadderOfEntryAndExitLimitOrders: base.barIndex ${base.barIndex} | closePrice ${closePrice}`,
  )
}

const calculateBaseBreakEven = (base: IBase) => {
  const orders = strategy.orders
    .filter((order) => base.orders.includes(order.id))
    .filter((order) =>
      [ORDER_STATUS.FILLED, ORDER_STATUS.COMPLETED, ORDER_STATUS.CLOSED].includes(order.status),
    )

  base.breakEven = round(orders.reduce((acc, order) => acc + order.price, 0) / orders.length)

  logger.info(`calculateBreakEven: base.barIndex ${base.barIndex}`)
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
    order: [['timestamp', 'ASC']],
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

  logger.info(
    `getBacktestBars: market ${market} | ticker ${ticker} | startDate ${startDate} | endDate ${endDate}`,
  )

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

    logger.info(`Main: barIndex ${barIndex} | confirmedBaseBarIndex ${confirmedBaseBarIndex}`)

    strategy.executeEntry(bar.low) // TODO: low or close ???
    strategy.executeExit(bar.high) // TODO: high or close ???

    // Manage existing Broken Bases and the last Confirmed Base
    let baseIndex = 0

    while (baseIndex < BASES.length) {
      const base = BASES[baseIndex]
      const levelOne = base.levels[0]
      const emergencyLevel = base.levels[EMERGENCY_LEVEL_NUMBER - 1]

      const wasBaseBrokenOnPreviousBar = base.isBroken
      const wasEmergencyTakeProfitOnPreviousBar = base.emergencyPriceLow < 999999

      logger.info(`Main: BASES index ${baseIndex} | base.barIndex ${base.barIndex}`)

      // Set Broken Base
      if (!base.isBroken && bar.low <= levelOne) {
        base.isBroken = true
      }

      calculateBaseBreakEven(base)

      // Calculate and Place Emergency Take Profit
      if (bar.low <= emergencyLevel && bar.low < base.emergencyPriceLow) {
        base.emergencyPriceLow = bar.low

        base.emergencyTakeProfit =
          bar.low + (base.price - bar.low) * EMERGENCY_TAKE_PROFIT_RETRACEMENT

        base.orders.forEach((orderId) => strategy.exit(orderId, base.emergencyTakeProfit))
      }

      if (base.isBroken) strategy.updateBaseStats(base, bar, barIndex)

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

        if (highPrice >= base.emergencyTakeProfit) {
          strategy.emergencyClosedBases.push(base)
        }

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

      logger.info(`Add the FIRST New Confirmed Base: newBase.barIndex ${newBase?.barIndex}`)

      if (newBase) {
        placeLadderOfEntryAndExitLimitOrders(newBase)
        BASES.unshift(newBase)

        // TODO: temporary solution to keep track of ALL bases
        strategy.allBases.push(newBase)
      }
    }

    // Add either ANOTHER NEW Confirmed Base or REPLACE an existing Confirmed Base
    if (BASES.length > 0 && confirmedBaseBarIndex && confirmedBaseBarIndex > BASES[0].barIndex) {
      const newBase = getNewBase(bars, confirmedBaseBarIndex)

      if (newBase) {
        // Base Broken -> Add new Base
        if (BASES[0].isBroken) {
          BASES.unshift(newBase)

          // TODO: temporary solution to keep track of ALL bases
          strategy.allBases.push(newBase)

          logger.info(`Add ANOTHER New Confirmed Base: newBase.barIndex ${newBase?.barIndex}`)
        } else {
          // Close Open Limit Orders
          cancelOpenLimitOrders(BASES[0])
          // Replace to a new Base
          BASES[0] = newBase

          // TODO: temporary solution to keep track of ALL bases
          strategy.allBases.push(newBase)

          logger.info(`REPLACE existing Confirmed Base: newBase.barIndex ${newBase?.barIndex}`)
        }
        placeLadderOfEntryAndExitLimitOrders(newBase)
      }
    }
  }
})().catch(logger.error)

// TODO: when architect refactoring - write down on paper dependency components and blocks and then order them properly

// TODO: refactor: strategy.run(bar), this.barIndex, this.barstate.isLast etc
// TODO: define the list of properties (and store outside "strategy class") that should persist between bars calls
//  and define list of properties that refreshes on each bar call (and store inside "strategy class"): this.barIndex etc
