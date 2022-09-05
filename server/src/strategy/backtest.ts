// eslint-disable-next-line import/order
import '../alias-runtime'

import {
  MARKET,
  TICKER,
  TICKER_PRECISION,
  ORDER_SIDE,
  ORDER_TYPE,
  ORDER_STATUS,
} from '@/strategy/constants'
import { getBacktestBars, roundToPrecision, median, logger } from '@/strategy/helpers'
import { IBase, IBar, IOrder } from '@/strategy/index'

// Strategy Settings
const INITIAL_CAPITAL = 1000
const ORDER_QUANTITY = 0.05
const TRADING_FEE = 0.04 / 100

const BASE_RETRACEMENT_CONFIRMATION = 0.5 / 100
const BASE_PRECEDING_BARS = 10

const NUMBER_OF_LEVELS = 10
const LEVEL_STEP = 0.5 / 100
const LEVEL_STEP_MULTIPLIER = 1

const EMERGENCY_LEVEL_NUMBER = 10
const EMERGENCY_TAKE_PROFIT_RETRACEMENT = 0 / 100
const TAKE_PROFIT_BELOW_BASE = 0.0 / 100
const BASE_BARS_LENGTH_LIMIT = 0

const LEVERAGE_X = 2
const MAINTANACE_MARGIN = 20 / 100

const START_PERIOD_TIME = '2022-08-31T19:05:00+03:00'
const END_PERIOD_TIME = '2022-08-31T20:00:00+03:00'

const round = roundToPrecision(TICKER_PRECISION.ETH)

class Strategy {
  public initialCapital: number = INITIAL_CAPITAL
  public symbol: string = TICKER.ETH
  public bars: IBar[] = []
  public bar!: IBar
  public barIndex = 0
  public isNewBase = false
  public newBaseBarIndex = 0
  public bases: IBase[] = []
  public allBases: IBase[] = []
  public closedInLossBases: IBase[] = []
  public orders: IOrder[] = []
  public isRealTime = false

  public run(bar: IBar): void {
    this.bars.push(bar)
    this.barIndex++
    this.bar = bar

    this.setBaseBroken()

    this.findNewBaseBarIndex()

    this.addNewBase()

    this.processBrokenBases()

    this.executeOrders()
  }

  private findNewBaseBarIndex(): void {
    this.isNewBase = false

    for (let barIndex = this.barIndex; barIndex >= 0; barIndex--) {
      const high = this.barIndex === barIndex ? this.bar.close : this.bar.high
      if (high / this.bars[barIndex].low >= 1 + BASE_RETRACEMENT_CONFIRMATION) {
        const confirmedBarLow = this.bars[barIndex].low

        const precedingBars = this.bars.slice(Math.max(0, barIndex - BASE_PRECEDING_BARS), barIndex)

        if (precedingBars.every(({ low }) => confirmedBarLow <= low)) {
          if (barIndex !== this.newBaseBarIndex) {
            this.newBaseBarIndex = barIndex
            this.isNewBase = true
          }
        }
      }
    }
  }

  private setBaseBroken() {
    this.bases
      .filter((base) => !base.isBroken)
      .forEach((base) => {
        base.isBroken = this.bar.low <= base.levels[0]
      })
  }

  private addNewBase(): void {
    if (!this.isNewBase) return

    const base = {
      barIndex: this.newBaseBarIndex,
      price: this.bars[this.newBaseBarIndex].low,
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

    if (this.bases[0].isBroken) {
      this.bases.unshift(base)
    } else {
      this.cancelBaseOrders(this.bases[0])
      this.bases[0] = base
    }

    this.openBaseOrders(base)

    this.allBases.push(base)
  }

  private openBaseOrders(base: IBase) {
    for (let level = 1; level <= NUMBER_OF_LEVELS; level++) {
      const price = round(base.price * (1.0 - LEVEL_STEP * Math.pow(level, LEVEL_STEP_MULTIPLIER)))
      const takeProfit = round(base.price * (1 - TAKE_PROFIT_BELOW_BASE))

      const order = {
        baseBarIndex: base.barIndex,
        level: level,
        symbol: this.symbol,
        timeOpen: '',
        timeClosed: '',
        type: ORDER_TYPE.LIMIT,
        side: ORDER_SIDE.BUY,
        price: price,
        quantity: ORDER_QUANTITY,
        amount: ORDER_QUANTITY * price,
        status: ORDER_STATUS.OPEN,
        takeProfit: takeProfit,
        fee: 0,
        PNL: 0,
      }

      this.orders.push(order)
    }
  }

  private cancelBaseOrders(base: IBase) {
    this.orders
      .filter((order) => order.baseBarIndex === base.barIndex)
      .filter((order) => order.status === ORDER_STATUS.OPEN)
      .forEach((order) => {
        order.status = ORDER_STATUS.CANCELED
      })
  }

  private closeBaseOrders(base: IBase, closePrice: number) {
    this.cancelBaseOrders(base)

    this.orders
      .filter((order) => order.baseBarIndex === base.barIndex)
      .filter((order) => order.status === ORDER_STATUS.FILLED)
      .forEach((order) => {
        order.timeClosed = this.bar.time // or Date.now()
        order.status = ORDER_STATUS.CLOSED
        order.fee = order.fee + order.quantity * closePrice * TRADING_FEE
        order.PNL = (closePrice - order.price) * order.quantity - order.fee
      })
  }

  private processBrokenBases() {
    this.bases
      .filter((base) => base.isBroken)
      .forEach((base) => {
        this.calculateBaseBreakEven(base)

        this.handleEmergencyTakeProfit(base)

        this.updateBaseStats(base)

        this.setBaseRespected(base)
      })

    this.bases = this.bases.filter((base) => !base.isRespected)
  }

  private calculateBaseBreakEven(base: IBase) {
    const orders = this.orders
      .filter((order) => order.baseBarIndex === base.barIndex)
      .filter((order) =>
        [ORDER_STATUS.FILLED, ORDER_STATUS.COMPLETED, ORDER_STATUS.CLOSED].includes(order.status),
      )
    // TODO: include fees in calculation
    base.breakEven = round(orders.reduce((acc, order) => acc + order.price, 0) / orders.length)
  }

  private handleEmergencyTakeProfit(base: IBase) {
    const emergencyLevel = base.levels[EMERGENCY_LEVEL_NUMBER - 1]

    if (this.bar.low <= emergencyLevel && this.bar.low < base.emergencyPriceLow) {
      base.emergencyPriceLow = this.bar.low

      base.emergencyTakeProfit =
        this.bar.low + (base.price - this.bar.low) * EMERGENCY_TAKE_PROFIT_RETRACEMENT

      this.orders
        .filter((order) => order.baseBarIndex === base.barIndex)
        .forEach((order) => {
          order.takeProfit = base.emergencyTakeProfit
        })
    }
  }

  private updateBaseStats(base: IBase) {
    const percentDrop = round((1 - this.bar.low / base.price) * 100)
    const barsLength = this.barIndex - base.barIndex

    base.stats.percentDrop = Math.max(base.stats.percentDrop, percentDrop)
    base.stats.barsLength = Math.max(base.stats.barsLength, barsLength)
  }

  private setBaseRespected(base: IBase) {
    const higherPrice = this.isBaseBrokenOrEmergencyLevelHitOnCurrentBar(base)
      ? this.bar.close
      : this.bar.high

    const regularTakeProfit = base.price * (1 - TAKE_PROFIT_BELOW_BASE)

    const isBarLimitExceeded =
      BASE_BARS_LENGTH_LIMIT && this.barIndex - base.barIndex >= BASE_BARS_LENGTH_LIMIT

    if (
      higherPrice >= regularTakeProfit ||
      higherPrice >= base.emergencyTakeProfit ||
      isBarLimitExceeded
    ) {
      base.isRespected = true

      const closePrice =
        higherPrice >= regularTakeProfit ? regularTakeProfit : base.emergencyTakeProfit

      this.closeBaseOrders(base, closePrice)

      if (higherPrice >= base.emergencyTakeProfit) this.closedInLossBases.push(base)
    }
  }

  private isBaseBrokenOrEmergencyLevelHitOnCurrentBar(base: IBase) {
    const isBaseBrokenOnCurrentBar =
      !(this.bars[this.barIndex - 1].low <= base.levels[0]) && base.isBroken

    const emergencyLevel = base.levels[EMERGENCY_LEVEL_NUMBER - 1]

    const isEmergencyLevelHitOnCurrentBar =
      !(this.bars[this.barIndex - 1].low <= emergencyLevel) && base.emergencyPriceLow < 999999

    return isBaseBrokenOnCurrentBar || isEmergencyLevelHitOnCurrentBar
  }

  private executeOrders() {
    const entryPrice = this.bar.low
    const exitPrice = this.bar.high

    this.orders.forEach((order) => {
      if (order.status === ORDER_STATUS.OPEN && entryPrice <= order.price) {
        order.timeOpen = this.bar.time // or Date.now()
        order.status = ORDER_STATUS.FILLED
        order.fee = order.amount * TRADING_FEE
      }
    })

    this.orders.forEach((order) => {
      if (order.status === ORDER_STATUS.FILLED && exitPrice >= order.takeProfit) {
        order.timeClosed = this.bar.time // or Date.now()
        order.status = ORDER_STATUS.COMPLETED
        order.fee = order.fee + order.quantity * order.takeProfit * TRADING_FEE
        order.PNL = (order.takeProfit - order.price) * order.quantity - order.fee
      }
    })

    this.orders = this.orders.filter((order) => order.status !== ORDER_STATUS.CANCELED)
  }

  public get positionAvgPrice() {
    // if (!this.openTrades.length) return 0

    return this.openTrades.reduce((acc, order) => acc + order.price, 0) / this.openTrades.length
  }

  public get positionSize() {
    return this.openTrades.reduce((acc, order) => acc + order.quantity, 0)
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

    const maxEmergencyClosedBases = this.closedInLossBases.length

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

    const simultaneousBrokenBases = this.bases.filter((base) => base.isBroken).length

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

  public calculatePNL(closePrice: number): void {
    this.orders
      .filter((order) => order.status === ORDER_STATUS.FILLED)
      .forEach((order) => {
        order.PNL = (closePrice - order.price) * order.quantity - order.fee
      })
  }

  public calculateCapital(): void {
    this.initialCapital = this.orders.reduce((acc, order) => acc + order.PNL, 0)
  }
}

const strategy = new Strategy()

;(async () => {
  const bars: IBar[] = await getBacktestBars(
    MARKET.FUTURES,
    TICKER.ETH,
    START_PERIOD_TIME,
    END_PERIOD_TIME,
  )

  for (const bar of bars) {
    await strategy.run(bar)
  }

  // TODO: implement binance websocket api to get real-time data once historical bars are over
  // also sync latest remaining data before
  strategy.isRealTime = true
})().catch(logger.error)

// TODO: when architect refactoring - write down on paper dependency components and blocks and then order them properly
