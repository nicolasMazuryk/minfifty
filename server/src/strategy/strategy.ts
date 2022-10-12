import { ORDER_SIDE, ORDER_TYPE, ORDER_STATUS } from '@/strategy/constants'
import { roundToPrecision, median, average, max, logger } from '@/strategy/helpers'
import { IBase, IBar, IOrder } from '@/strategy/index'

// const round = roundToPrecision(TICKER_PRECISION.ETH)
const round = roundToPrecision(2)

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
const MAINTANANCE_MARGIN = 20 / 100

export default class Strategy {
  public initialCapital: number = INITIAL_CAPITAL
  public bars: IBar[] = []
  public bar!: IBar
  public barIndex = -1
  public isNewBase = false
  public newBaseBarIndex = 0
  public bases: IBase[] = []
  public allBases: IBase[] = []
  // public closedInLossBases: IBase[] = []
  public orders: IOrder[] = []
  public isRealTime = false
  public current = 0

  public run(bar: IBar): void {
    this.bars.push(bar)
    this.barIndex++
    this.bar = bar
    this.current = this.isRealTime ? this.bar.close : this.bar.low

    // this.logger.time('bar')

    // -- Debug --
    // if (this.barIndex === 440) {
    //   console.log('debug')
    // }

    this.setBaseBroken()

    this.findNewBaseBarIndex()

    this.addNewBase()

    this.processBrokenBases()

    this.executeOrders()

    this.updateStatistics()

    // this.logger.timeEnd('bar')
  }

  private findNewBaseBarIndex(): void {
    this.isNewBase = false

    for (let barIndex = this.barIndex; barIndex >= 0; barIndex--) {
      const high = this.barIndex === barIndex ? this.bar.close : this.bar.high
      if (high / this.bars[barIndex].low >= 1 + BASE_RETRACEMENT_CONFIRMATION) {
        const confirmedBarLow = this.bars[barIndex].low

        const precedingBars = this.bars.slice(Math.max(0, barIndex - BASE_PRECEDING_BARS), barIndex)

        if (precedingBars.every(({ low }) => confirmedBarLow <= low)) {
          if (barIndex <= this.newBaseBarIndex) return

          this.newBaseBarIndex = barIndex
          this.isNewBase = true

          break
        }
      }
    }
  }

  private setBaseBroken() {
    this.bases
      .filter((base) => !base.isBroken)
      .forEach((base) => {
        base.isBroken = this.current <= base.levels[0]
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
      isClosedInLoss: false,
      stats: {
        percentDrop: 0,
        barsLength: 0,
      },
    }

    if (this.bases[0]?.isBroken) {
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
        status: ORDER_STATUS.OPEN,
        timeOpen: null,
        timeClosed: null,
        type: ORDER_TYPE.LIMIT,
        side: ORDER_SIDE.BUY,
        price: price,
        quantity: ORDER_QUANTITY,
        amount: ORDER_QUANTITY * price,
        takeProfit: takeProfit,
        fee: 0,
        PNL: 0,
      }

      base.levels.push(price)

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

    this.orders = this.orders.filter((order) => order.status !== ORDER_STATUS.CANCELED)
  }

  private closeBaseOrders(base: IBase, closePrice: number) {
    this.cancelBaseOrders(base)

    this.orders
      .filter((order) => order.baseBarIndex === base.barIndex)
      .filter((order) => order.status === ORDER_STATUS.FILLED)
      .forEach((order) => {
        order.timeClosed = this.isRealTime ? new Date() : this.bar.time
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
    base.breakEven = round(orders.reduce((acc, order) => acc + order.price, 0) / orders.length) || 0
  }

  private handleEmergencyTakeProfit(base: IBase) {
    const emergencyLevel = base.levels[EMERGENCY_LEVEL_NUMBER - 1]

    if (this.current <= emergencyLevel && this.current < base.emergencyPriceLow) {
      base.emergencyPriceLow = this.current

      base.emergencyTakeProfit =
        this.current + (base.price - this.current) * EMERGENCY_TAKE_PROFIT_RETRACEMENT
      // TODO: once the emergency take profit is triggered, the last 10th order is CANCELED, but it should be FILLED first and then CANCELED. Not so suffiicient but still
      this.orders
        .filter((order) => order.baseBarIndex === base.barIndex)
        .forEach((order) => {
          order.takeProfit = base.emergencyTakeProfit
        })
    }
  }

  private updateBaseStats(base: IBase) {
    const percentDrop = round((1 - this.current / base.price) * 100)
    const barsLength = this.barIndex - base.barIndex

    base.stats.percentDrop = Math.max(base.stats.percentDrop, percentDrop)
    // TODO: calculation of barsLength should start once BaseBroken. Currently starting bar is a BaseConfirmed
    base.stats.barsLength = Math.max(base.stats.barsLength, barsLength)
  }

  private setBaseRespected(base: IBase) {
    const higherPrice =
      this.isBaseBrokenOrEmergencyLevelHitOnCurrentBar(base) || this.isRealTime
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

      if (higherPrice >= base.emergencyTakeProfit) {
        base.isClosedInLoss = true
      }
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
    const entryPrice = this.current

    this.orders.forEach((order) => {
      if (order.status === ORDER_STATUS.OPEN && entryPrice <= order.price) {
        order.timeOpen = this.isRealTime ? new Date() : this.bar.time
        order.status = ORDER_STATUS.FILLED
        order.fee = order.amount * TRADING_FEE
      }
    })

    this.orders.forEach((order) => {
      if (
        order.status === ORDER_STATUS.FILLED &&
        this.getOrderExitPrice(order) >= order.takeProfit
      ) {
        order.timeClosed = this.isRealTime ? new Date() : this.bar.time
        order.status = ORDER_STATUS.COMPLETED
        order.fee = order.fee + order.quantity * order.takeProfit * TRADING_FEE
        order.PNL = (order.takeProfit - order.price) * order.quantity - order.fee
      }
    })

    // this.orders = this.orders.filter((order) => order.status !== ORDER_STATUS.COMPLETED)
  }
  // TODO: refactor this piece of code
  private getOrderExitPrice(order: IOrder) {
    const base = this.bases.find((base) => base.barIndex === order.baseBarIndex)
    const exitPrice =
      this.isBaseBrokenOrEmergencyLevelHitOnCurrentBar(base!) || this.isRealTime
        ? this.bar.close
        : this.bar.high

    return exitPrice
  }

  public get positionAvgPrice() {
    return average(this.openTrades.map((order) => order.price))
  }

  public get positionSize() {
    return this.openTrades.reduce((acc, order) => acc + order.quantity, 0)
  }

  public get equity() {
    return this.initialCapital + this.totalProfit
  }

  public get netProfit() {
    return this.closedTrades.reduce((acc, order) => acc + order.PNL, 0)
  }

  public get openProfit() {
    return this.openTrades.reduce(
      (acc, order) => acc + ((this.current - order.price) * order.quantity - order.fee),
      0,
    )
  }

  public get totalProfit() {
    return this.netProfit + this.openProfit
  }

  public get openTrades() {
    return this.orders.filter((order) => order.status === ORDER_STATUS.FILLED)
  }

  public get closedTrades() {
    return this.orders.filter((order) =>
      [ORDER_STATUS.COMPLETED, ORDER_STATUS.CLOSED].includes(order.status),
    )
  }

  public get totalFee() {
    return this.orders.reduce((acc, order) => acc + order.fee, 0)
  }

  public get winTrades() {
    return this.closedTrades.filter((order) => order.PNL > 0)
  }

  public get lossTrades() {
    return this.closedTrades.filter((order) => order.PNL < 0)
  }

  public get grossProfit() {
    return this.winTrades.reduce((acc, order) => acc + order.PNL, 0)
  }

  public get grossLoss() {
    return this.lossTrades.reduce((acc, order) => acc + order.PNL, 0)
  }

  public get openTradesCount() {
    return this.openTrades.length
  }

  public get closedTradesCount() {
    return this.closedTrades.length
  }

  public get winTradesCount() {
    return this.winTrades.length
  }

  public get lossTradesCount() {
    return this.lossTrades.length
  }

  public get availableBalance() {
    return this.equity - this.positionSize * this.positionAvgPrice
  }

  public get availableMargin() {
    return this.equity * LEVERAGE_X - this.positionSize * this.positionAvgPrice
  }

  public get borrowed() {
    return Math.max(this.positionSize * this.positionAvgPrice - this.equity, 0)
  }

  public get liquidationPrice() {
    return (this.borrowed * (1 + MAINTANANCE_MARGIN)) / this.positionSize
  }

  public get toLiquidationPrice() {
    return ((this.current - this.liquidationPrice) / this.current) * 100
  }

  public get priceDrawdown() {
    if (this.positionAvgPrice === 0) return 0
    return ((this.positionAvgPrice - this.current) / this.positionAvgPrice) * 100
  }

  public get equityDrawdown() {
    return (((this.positionAvgPrice - this.current) * this.positionSize) / this.equity) * 100 // instead of this.equity we can use this.initialCapital
  }

  // Bases
  public get brokenBases() {
    return this.bases.filter((base) => base.isBroken)
  }

  public get brokenBasesCount() {
    return this.brokenBases.length
  }

  public get allBasesCount() {
    return this.allBases.length
  }

  public get allBrokenBases() {
    return this.allBases.filter((base) => base.isBroken)
  }

  public get allBrokenBasesCount() {
    return this.allBrokenBases.length
  }

  public get closedInLossBases() {
    return this.allBases.filter((base) => base.isClosedInLoss)
  }

  public get closedInLossBasesCount() {
    return this.closedInLossBases.length
  }

  public get realTimeStatistics() {
    return {
      equity: this.equity,
      netProfit: this.netProfit,
      openProfit: this.openProfit,
      totalProfit: this.totalProfit,
      totalFee: this.totalFee,
      positionSize: this.positionSize,
      positionAvgPrice: this.positionAvgPrice,
      availableBalance: this.availableBalance,
      availableMargin: this.availableMargin,
      borrowed: this.borrowed,
      liquidationPrice: this.liquidationPrice,
      toLiquidationPrice: this.toLiquidationPrice,
      priceDrawdown: this.priceDrawdown,
      equityDrawdown: this.equityDrawdown,
      brokenBasesCount: this.brokenBasesCount,
      grossProfit: this.grossProfit,
      grossLoss: this.grossLoss,
      openTradesCount: this.openTradesCount,
      closedTradesCount: this.closedTradesCount,
      winTradesCount: this.winTradesCount,
      lossTradesCount: this.lossTradesCount,
    }
  }

  public statistics = {
    maxPositionSize: 0,
    maxOpenTrades: 0,
    maxLiquidationPrice: 0,
    maxToLiquidationPrice: 100,
    maxMarginBalanceLow: INITIAL_CAPITAL * LEVERAGE_X,
    maxPriceDrawdown: 0,
    maxEquityDrawdown: 0,
    isNotEnoughFunds: false,
    isLiquidated: false,

    allBases: 0,
    allBrokenBases: 0,
    maxSimultaneousBrokenBases: 0,
    closedInLossBases: 0,

    baseDropMax: 0,
    baseDropAvg: 0,
    baseDropMedian: 0,

    baseBarsMax: 0,
    brokenBaseBarsAvg: 0,
    brokenBaseBarsMedian: 0,
  }

  public updateStatistics() {
    // --------------------------------------------------------------
    // Risk Statistics
    this.statistics.maxPositionSize = Math.max(this.statistics.maxPositionSize, this.positionSize)
    this.statistics.maxOpenTrades = Math.max(this.statistics.maxOpenTrades, this.openTradesCount)
    this.statistics.maxLiquidationPrice = Math.max(
      this.statistics.maxLiquidationPrice,
      isNaN(this.liquidationPrice) ? 0 : this.liquidationPrice,
    )
    this.statistics.maxToLiquidationPrice = Math.min(
      this.statistics.maxToLiquidationPrice,
      isNaN(this.toLiquidationPrice) ? 100 : this.toLiquidationPrice,
    )
    this.statistics.maxMarginBalanceLow = Math.min(
      this.statistics.maxMarginBalanceLow,
      this.availableMargin,
    )
    this.statistics.maxPriceDrawdown = Math.max(
      this.statistics.maxPriceDrawdown,
      this.priceDrawdown,
    )
    this.statistics.maxEquityDrawdown = Math.max(
      this.statistics.maxEquityDrawdown,
      this.equityDrawdown,
    )
    this.statistics.isNotEnoughFunds =
      this.statistics.isNotEnoughFunds || this.availableBalance <= 0
    this.statistics.isLiquidated =
      this.statistics.isLiquidated || this.current <= this.liquidationPrice

    // Bases Statistics
    this.statistics.allBases = Math.max(this.statistics.allBases, this.allBasesCount)
    this.statistics.allBrokenBases = Math.max(
      this.statistics.allBrokenBases,
      this.allBrokenBasesCount,
    )
    this.statistics.maxSimultaneousBrokenBases = Math.max(
      this.statistics.maxSimultaneousBrokenBases,
      this.brokenBasesCount,
    )
    this.statistics.closedInLossBases = Math.max(
      this.statistics.closedInLossBases,
      this.closedInLossBasesCount,
    )

    this.statistics.baseDropMax = max(this.allBrokenBases.map((base) => base.stats.percentDrop))
    this.statistics.baseDropAvg = average(this.allBrokenBases.map((base) => base.stats.percentDrop))
    this.statistics.baseDropMedian = median(
      this.allBrokenBases.map((base) => base.stats.percentDrop),
    )

    this.statistics.baseBarsMax = max(this.allBrokenBases.map((base) => base.stats.barsLength))
    this.statistics.brokenBaseBarsAvg = average(
      this.allBrokenBases.map((base) => base.stats.barsLength),
    )
    this.statistics.brokenBaseBarsMedian = median(
      this.allBrokenBases.map((base) => base.stats.barsLength),
    )
  }

  public logger = {
    time: (label: string) => {
      if ([1, 1000, 10000, 20000, 30000, 40000].includes(this.barIndex)) {
        logger.time(`$${this.barIndex} ${label}`)
      }
    },
    timeEnd: (label: string) => {
      if ([1, 1000, 10000, 20000, 30000, 40000].includes(this.barIndex)) {
        logger.timeEnd(`$${this.barIndex} ${label}`)
      }
    },
  }
}

// TODO: when architect refactoring - write down on paper dependency components and blocks and then order them properly

// TODO: implement strategy alerts: strategy.alert()

// TODO: implement strategy risk: strategy.risk.max_drawdown()
// TODO: implement strategy risk: strategy.risk.max_intraday_loss()
// TODO: implement strategy risk: strategy.risk.max_position_size()

// TODO: implement ta: ta.atr()
// TODO: implement ta: ta.change()
// TODO: implement ta: ta.highest()
// TODO: implement ta: ta.lowest()
// TODO: implement ta: ta.range()
// TODO: implement ta: ta.sma()
// TODO: implement ta: ta.ema()

// TODO: statistics: each base performance statistics
