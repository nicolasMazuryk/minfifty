import { IBase, IBar, IOrder } from './index'
import { ORDER_SIDE, ORDER_TYPE, ORDER_STATUS } from './constants'
import { roundToPrecision, average, max, min, logger } from './utils'

// import GlobalStrategy from './strategy-global'

import {
  INITIAL_CAPITAL,
  ORDER_QUANTITY,
  TRADING_FEE,
  BASE_RETRACEMENT_CONFIRMATION,
  BASE_PRECEDING_BARS,
  // NUMBER_OF_LEVELS,
  // LEVEL_STEP,
  LEVEL_STEP_MULTIPLIER,
  EMERGENCY_LEVEL_NUMBER,
  EMERGENCY_TAKE_PROFIT_RETRACEMENT,
  TAKE_PROFIT_BELOW_BASE,
  BASE_BARS_LENGTH_LIMIT,
  LEVERAGE_X,
  MAINTANANCE_MARGIN,
  IGNORE_BASE_ON_TOP_PRECEDING_BARS,
  IGNORE_BASE_ON_TOP_THRESHOLD,
  BARS_UNTIL_BASE_CONFIRMATION_LIMIT,
  IGNORE_TRADING_LEVEL_CLOSE_TO_BASE,
  WARNING_TAKE_PROFIT_BASE_LEVEL,
  WARNING_TAKE_PROFIT_WARNING_LEVEL,
  WARNING_TAKE_PROFIT_PERCENT,
  STOP_LOSS_BASE_BOUNCE_MULTIPLIER,
  // GLOBAL_BASE_ABOVE_BASE_ALLOWED_THRESHOLD,
  FLOAT_BELOW_BASE_ADJUSTMENT_THRESHOLD,
  ORDER_NUMBER_OF_LEVELS,
  ORDER_LEVEL_STEP,
  ORDER_LEVEL_STOP_LOSS,
  ORDER_OPEN_TRADE_WINDOW_BARS,
  ORDER_BREAK_EVEN_CLOSE_TRIGGER,
} from './settings'

// const round = roundToPrecision(TICKER_PRECISION.ETH)
const round = roundToPrecision(2)

export default class Strategy {
  public initialCapital: number = INITIAL_CAPITAL
  // add this.getBarByIndex() method
  // add this.sliceBars() method
  // manage bars offset
  public bars: IBar[] = []
  public bar!: IBar
  public barIndex = -1
  public isNewBase = false
  public newBaseBarIndex = 0
  public bases: IBase[] = []
  public closedBases: IBase[] = []
  public allBases: IBase[] = []
  // public closedInLossBases: IBase[] = []
  public orders: IOrder[] = []
  public closedOrders: IOrder[] = []
  public isRealTime = false
  public current = 0

  // public globalStrategy: GlobalStrategy = new GlobalStrategy()

  public run(bar: IBar): void {
    // TODO: update last bar instead of pushing new bar to array in real-time mode
    this.bars.push(bar)
    this.barIndex++
    this.bar = bar
    this.current = this.isRealTime ? this.bar.close : this.bar.low

    // this.globalStrategy.run(bar)

    // this.logger.time('bar')

    // -- Debug --
    if ([811].includes(this.barIndex)) {
      console.log('debug')
    }

    this.setBaseBroken()

    this.findNewBaseBarIndex()

    this.addNewBase()

    this.updateFloatingBase()

    this.ignoreOpenPreorderTradeIfExceedsLimitBarWindow()

    // this.calculateBaseBounceStopLoss()

    this.processBrokenBases()

    this.executeOrders()

    this.performanceCleanup()

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
          // if (this.ignoreBaseOnTop(barIndex, confirmedBarLow)) continue
          // if (this.ignoreBaseExceedingBarsUntilBaseConfirmationLimit(barIndex)) continue

          // if (this.ignoreIfBaseIsAboveAllowedGlobalBaseThreshold(confirmedBarLow)) continue

          this.newBaseBarIndex = barIndex
          this.isNewBase = true

          break
        }
      }
    }
  }

  public ignoreBaseOnTop(baseBarIndex: number, baseBarLow: number) {
    const precedingBars = this.bars.slice(
      Math.max(0, baseBarIndex - IGNORE_BASE_ON_TOP_PRECEDING_BARS),
      baseBarIndex,
    )

    const highestHigh = max(precedingBars.map(bar => bar.high))

    return baseBarLow >= highestHigh * (1 - IGNORE_BASE_ON_TOP_THRESHOLD)
  }

  public ignoreBaseExceedingBarsUntilBaseConfirmationLimit(baseBarIndex: number) {
    return baseBarIndex < this.barIndex - BARS_UNTIL_BASE_CONFIRMATION_LIMIT
  }

  // public ignoreIfBaseIsAboveAllowedGlobalBaseThreshold(baseBarLow: number) {
  //   if (!this.globalStrategy.bases.length) return true
  //
  //   const globalBaseLow = this.globalStrategy.bases[0].price
  //
  //   return baseBarLow > globalBaseLow * (1 + GLOBAL_BASE_ABOVE_BASE_ALLOWED_THRESHOLD)
  // }

  public updateFloatingBase() {
    if (!this.bases[0] || this.bases[0].isBroken) return

    const base = this.bases[0]
    const bars = this.bars.slice(base.barIndex, this.barIndex + 1)

    const belowBaseNewLowestLow = min(bars.map(bar => bar.low))

    if (belowBaseNewLowestLow >= base.price * (1 - FLOAT_BELOW_BASE_ADJUSTMENT_THRESHOLD)) return

    const barIndex = bars.indexOf(bars.find(bar => bar.low === belowBaseNewLowestLow)!)

    const belowBaseNewBarIndex = base.barIndex + barIndex
    // do not proceed if new "low" is the same as existing "low"
    // if (belowBaseNewBarIndex === base.barIndex) return
    // drop on the same current candle and does not bounce back
    if (belowBaseNewBarIndex === this.barIndex && this.bar.close < base.price) return

    const higherPrice = this.isRealTime ? this.bar.close : this.bar.high

    if (higherPrice >= base.price * (1 - TAKE_PROFIT_BELOW_BASE)) {
      this.closeBaseOrders(base, base.price * (1 - TAKE_PROFIT_BELOW_BASE))

      base.price = belowBaseNewLowestLow
      base.barIndex = belowBaseNewBarIndex
      base.takeProfit = round(belowBaseNewLowestLow * (1 - TAKE_PROFIT_BELOW_BASE))
      base.stopLoss = round(belowBaseNewLowestLow * (1 - ORDER_LEVEL_STOP_LOSS))
      base.levels = []

      this.openBaseOrders(base)
    }
  }

  public ignoreOpenPreorderTradeIfExceedsLimitBarWindow() {
    if (!this.bases[0] || this.bases[0].isBroken) return

    const base = this.bases[0]

    const bars = this.bars.slice(base.barIndex, this.barIndex + 1)

    const isBaseCracked = bars.some(bar => bar.low < base.price)

    if (base.barIndex < this.barIndex - ORDER_OPEN_TRADE_WINDOW_BARS && !isBaseCracked) {
      this.cancelBaseOrders(base)

      this.bases.shift() // just testing / less order triggers / try without it

      // base.isRespected = true
    }
  }

  private setBaseBroken() {
    this.bases
      .filter(base => !base.isBroken)
      .forEach(base => {
        base.isBroken = this.current <= base.levels[0]
      })
  }

  private addNewBase(): void {
    if (!this.isNewBase) return

    const basePrice = this.bars[this.newBaseBarIndex].low

    const base = {
      barIndex: this.newBaseBarIndex,
      price: basePrice,
      isBroken: false,
      isRespected: false,
      baseBounceTop: 0,
      takeProfit: round(basePrice * (1 - TAKE_PROFIT_BELOW_BASE)),
      breakEven: 999999,
      stopLoss: round(basePrice * (1 - ORDER_LEVEL_STOP_LOSS)),
      warningPriceLow: 999999,
      emergencyTakeProfit: 999999,
      emergencyPriceLow: 999999,
      levels: [],
      isClosedInLoss: false,
      isClosedInBreakEven: false,
      stats: {
        percentDrop: 0,
        barsLength: 0,
      },
    }

    if (this.bases[0]?.isBroken) {
      this.bases.unshift(base)
    } else {
      this.bases[0] && this.cancelBaseOrders(this.bases[0])
      this.bases[0] = base
    }

    this.openBaseOrders(base)

    // Disable to increase performance
    // Enable to analyse and measure all detected bases
    // this.allBases.push(base)
  }

  private openBaseOrders(base: IBase) {
    const orderDetails = {
      baseBarIndex: base.barIndex,
      status: ORDER_STATUS.OPEN,
      timeOpen: null,
      timeClosed: null,
      barIndexOpen: null,
      barIndexClosed: null,
      type: ORDER_TYPE.LIMIT,
      side: ORDER_SIDE.BUY,
      quantity: ORDER_QUANTITY,
      takeProfit: base.takeProfit,
      fee: 0,
      PNL: 0,
    }

    for (let level = 1; level <= ORDER_NUMBER_OF_LEVELS; level++) {
      const price = round(
        base.price * (1 - ORDER_LEVEL_STEP * Math.pow(level, LEVEL_STEP_MULTIPLIER)),
      )

      const order = {
        ...orderDetails,
        level: level,
        price: price,
        amount: ORDER_QUANTITY * price,
        stopLoss: base.stopLoss,
      }

      base.levels.push(price)

      this.orders.push(order)
    }

    // for (let level = 1; level <= NUMBER_OF_LEVELS; level++) {
    //   const price = round(base.price * (1 - LEVEL_STEP * Math.pow(level, LEVEL_STEP_MULTIPLIER)))
    //
    //   const order = {
    //     ...orderDetails,
    //     level: level,
    //     price: price,
    //     amount: ORDER_QUANTITY * price,
    //     stopLoss: 0,
    //   }
    //
    //   base.levels.push(price)
    //
    //   // // Trading Rule #3 ignore Trading Levels Close To the Base
    //   // if (level <= IGNORE_TRADING_LEVEL_CLOSE_TO_BASE) continue
    //
    //   this.orders.push(order)
    // }
  }

  private cancelBaseOrders(base: IBase) {
    this.orders
      .filter(order => order.baseBarIndex === base.barIndex)
      .filter(order => order.status === ORDER_STATUS.OPEN)
      .forEach(order => {
        order.status = ORDER_STATUS.CANCELED
      })

    this.orders = this.orders.filter(order => order.status !== ORDER_STATUS.CANCELED)
  }

  private closeBaseOrders(base: IBase, closePrice: number) {
    // if base is broken and respected on the same candle (long wick)
    // we need to trigger orders execution before closing this order
    if (this.isBaseBrokenOrEmergencyLevelHitOnCurrentBar(base)) {
      this.orders.forEach(order => {
        if (order.status === ORDER_STATUS.OPEN && this.current <= order.price) {
          order.timeOpen = this.isRealTime ? new Date() : this.bar.time
          order.barIndexOpen = this.barIndex
          order.status = ORDER_STATUS.FILLED
          order.fee = order.amount * TRADING_FEE
        }
      })
    }

    this.cancelBaseOrders(base)

    this.orders
      .filter(order => order.baseBarIndex === base.barIndex)
      .filter(order => order.status === ORDER_STATUS.FILLED)
      .forEach(order => {
        order.timeClosed = this.isRealTime ? new Date() : this.bar.time
        order.barIndexClosed = this.barIndex
        order.status = ORDER_STATUS.CLOSED
        order.fee = order.fee + order.quantity * closePrice * TRADING_FEE
        order.PNL = (closePrice - order.price) * order.quantity - order.fee
        order.takeProfit = closePrice
      })
  }

  public calculateBaseBounceStopLoss() {
    this.bases
      .filter(base => this.bar.high > base.baseBounceTop)
      .forEach(base => {
        base.baseBounceTop = this.bar.high
        base.stopLoss = base.price - (this.bar.high - base.price) * STOP_LOSS_BASE_BOUNCE_MULTIPLIER

        this.orders
          .filter(order => order.baseBarIndex === base.barIndex)
          .forEach(order => {
            order.stopLoss = base.stopLoss
          })
      })
  }

  private processBrokenBases() {
    this.bases
      .filter(base => base.isBroken)
      .forEach(base => {
        // this.calculateBaseBreakEven(base)

        // this.updateTakeProfitIgnoreTradingLevelsCloseToBase()

        // this.updateTakeProfitWhenWarningLevelIsReached()

        this.handleClosePreordersInBreakEven(base)

        // this.handleEmergencyTakeProfit(base)

        // this.updateBaseStats(base)

        this.setBaseRespected(base)
      })
  }

  private calculateBaseBreakEven(base: IBase) {
    const orders = this.orders
      .filter(order => order.baseBarIndex === base.barIndex)
      .filter(order => order.status === ORDER_STATUS.FILLED)

    base.breakEven =
      round(
        (orders.reduce((acc, order) => acc + order.price, 0) / orders.length) *
          (1 + TRADING_FEE * 2),
      ) || 999999
  }

  public handleClosePreordersInBreakEven(base: IBase) {
    const breakEvenTriggerLow = base.price * (1 - ORDER_BREAK_EVEN_CLOSE_TRIGGER)

    if (this.current <= breakEvenTriggerLow) {
      this.calculateBaseBreakEven(base)

      base.takeProfit = base.breakEven

      this.orders
        .filter(order => order.baseBarIndex === base.barIndex)
        .filter(order => order.status === ORDER_STATUS.FILLED)
        .forEach(order => {
          order.takeProfit = base.breakEven
        })
    }
  }

  public handleEmergencyTakeProfit(base: IBase) {
    const emergencyLevel = base.levels[EMERGENCY_LEVEL_NUMBER - 1]

    if (this.current <= emergencyLevel && this.current < base.emergencyPriceLow) {
      base.emergencyPriceLow = this.current

      base.emergencyTakeProfit =
        base.emergencyPriceLow +
        (base.price - base.emergencyPriceLow) * EMERGENCY_TAKE_PROFIT_RETRACEMENT
      // TODO: once the emergency take profit is triggered, the last 10th order is CANCELED, but it should be FILLED first and then CANCELED. Not so suffiicient but still
      this.orders
        .filter(order => order.baseBarIndex === base.barIndex)
        .forEach(order => {
          order.takeProfit = base.emergencyTakeProfit
        })
    }
  }
  // Trading Rule #3 ignore Trading Levels Close To the Base
  public updateTakeProfitIgnoreTradingLevelsCloseToBase() {
    this.bases
      .filter(base => this.current <= base.levels[IGNORE_TRADING_LEVEL_CLOSE_TO_BASE])
      .filter(base => base.takeProfit === round(base.price * (1 - TAKE_PROFIT_BELOW_BASE))) // is default take profit
      .forEach(base => {
        base.takeProfit = base.levels[IGNORE_TRADING_LEVEL_CLOSE_TO_BASE - 1]

        this.orders
          .filter(order => order.baseBarIndex === base.barIndex)
          .forEach(order => {
            order.takeProfit = base.takeProfit
          })
      })
  }

  // Trading Rule #4 warning level is reached
  public updateTakeProfitWhenWarningLevelIsReached() {
    this.bases
      .filter(base => this.current <= base.levels[WARNING_TAKE_PROFIT_WARNING_LEVEL - 1])
      .filter(base => this.current < base.warningPriceLow)
      .forEach(base => {
        const takeProfitBaseLevel =
          WARNING_TAKE_PROFIT_BASE_LEVEL > 0
            ? base.levels[WARNING_TAKE_PROFIT_BASE_LEVEL - 1]
            : round(base.price * (1 - TAKE_PROFIT_BELOW_BASE))

        base.warningPriceLow = this.current

        base.takeProfit =
          base.warningPriceLow +
          (takeProfitBaseLevel - base.warningPriceLow) * WARNING_TAKE_PROFIT_PERCENT

        this.orders
          .filter(order => order.baseBarIndex === base.barIndex)
          .forEach(order => {
            order.takeProfit = base.takeProfit
          })
      })
  }

  public updateBaseStats(base: IBase) {
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

    const lowerPrice = this.current

    const isBarLimitExceeded =
      BASE_BARS_LENGTH_LIMIT && this.barIndex - base.barIndex >= BASE_BARS_LENGTH_LIMIT

    if (
      higherPrice >= base.takeProfit ||
      higherPrice >= base.breakEven ||
      // higherPrice >= base.emergencyTakeProfit ||
      lowerPrice <= base.stopLoss ||
      isBarLimitExceeded
    ) {

      const closePrice =
        higherPrice >= base.takeProfit
          ? base.takeProfit
          : higherPrice >= base.breakEven
          ? base.breakEven
          : // : higherPrice >= base.emergencyTakeProfit
          // ? base.emergencyTakeProfit
          lowerPrice <= base.stopLoss
          ? base.stopLoss
          : this.bar.close

      this.closeBaseOrders(base, closePrice)

      if (higherPrice >= base.takeProfit) {
        base.isRespected = true
      }

      if (higherPrice >= base.breakEven) {
        base.isClosedInBreakEven = true
      }

      if (higherPrice >= base.emergencyTakeProfit || lowerPrice <= base.stopLoss) {
        base.isClosedInLoss = true
      }
    }
  }

  private isBaseBrokenOrEmergencyLevelHitOnCurrentBar(base: IBase) {
    if (base === undefined) return

    const isBaseBrokenOnCurrentBar =
      !(this.bars[this.barIndex - 1].low <= base.levels[0]) && this.bar.low <= base.levels[0]

    const breakEvenTriggerLow = base.price * (1 - ORDER_BREAK_EVEN_CLOSE_TRIGGER)

    const isBreakEvenTriggeredOnCurrentBar =
      !(this.bars[this.barIndex - 1].low <= breakEvenTriggerLow) &&
      this.bar.low <= breakEvenTriggerLow

    const emergencyLevel = base.levels[EMERGENCY_LEVEL_NUMBER - 1]

    const isEmergencyLevelHitOnCurrentBar =
      !(this.bars[this.barIndex - 1].low <= emergencyLevel) && this.bar.low <= emergencyLevel

    return (
      isBaseBrokenOnCurrentBar ||
      isBreakEvenTriggeredOnCurrentBar ||
      isEmergencyLevelHitOnCurrentBar
    )
  }

  private executeOrders() {
    const entryPrice = this.current

    this.orders.forEach(order => {
      if (order.status === ORDER_STATUS.OPEN && entryPrice <= order.price) {
        order.timeOpen = this.isRealTime ? new Date() : this.bar.time
        order.barIndexOpen = this.barIndex
        order.status = ORDER_STATUS.FILLED
        order.fee = order.amount * TRADING_FEE
      }
    })

    this.orders.forEach(order => {
      if (order.status === ORDER_STATUS.FILLED && this.current <= order.stopLoss) {
        order.timeClosed = this.isRealTime ? new Date() : this.bar.time
        order.status = ORDER_STATUS.COMPLETED
        order.barIndexClosed = this.barIndex
        order.fee = order.fee + order.quantity * order.stopLoss * TRADING_FEE
        order.PNL = (order.stopLoss - order.price) * order.quantity - order.fee
        order.takeProfit = order.stopLoss
      }
    })

    this.orders.forEach(order => {
      if (
        order.status === ORDER_STATUS.FILLED &&
        this.getOrderTakeProfitExitPrice(order) >= order.takeProfit
      ) {
        order.timeClosed = this.isRealTime ? new Date() : this.bar.time
        order.barIndexClosed = this.barIndex
        order.status = ORDER_STATUS.COMPLETED
        order.fee = order.fee + order.quantity * order.takeProfit * TRADING_FEE
        order.PNL = (order.takeProfit - order.price) * order.quantity - order.fee
      }
    })

    // this.orders = this.orders.filter((order) => order.status !== ORDER_STATUS.COMPLETED)
  }
  // TODO: refactor this piece of code
  private getOrderTakeProfitExitPrice(order: IOrder) {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const base = this.bases.find(base => base.barIndex === order.baseBarIndex)
    const exitPrice =
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.isBaseBrokenOrEmergencyLevelHitOnCurrentBar(base!) ||
      order.barIndexOpen === this.barIndex ||
      this.isRealTime
        ? this.bar.close
        : this.bar.high

    return exitPrice
  }

  private performanceCleanup() {
    this.closedOrders.push(
      ...this.orders.filter(order =>
        [ORDER_STATUS.COMPLETED, ORDER_STATUS.CLOSED].includes(order.status),
      ),
    )

    this.orders = this.orders.filter(
      order => ![ORDER_STATUS.COMPLETED, ORDER_STATUS.CLOSED].includes(order.status),
    )

    this.closedBases.push(...this.bases.filter(base => base.isRespected || base.isClosedInBreakEven || base.isClosedInLoss))

    this.bases = this.bases.filter(base => !base.isRespected && !base.isClosedInBreakEven && !base.isClosedInLoss)
  }

  public get positionAvgPrice() {
    return average(this.openTrades.map(order => order.price))
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
    return this.orders.filter(order => order.status === ORDER_STATUS.FILLED)
  }

  public get closedTrades() {
    return this.closedOrders

    // return this.closedOrders.filter(order =>
    //   [ORDER_STATUS.COMPLETED, ORDER_STATUS.CLOSED].includes(order.status),
    // )
  }

  public get totalFee() {
    return this.orders.reduce((acc, order) => acc + order.fee, 0)
  }

  public get winTrades() {
    return this.closedTrades.filter(order => order.PNL > 0)
  }

  public get lossTrades() {
    return this.closedTrades.filter(order => order.PNL < 0)
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

  public get realTimeStatistics() {
    return {
      equity: round(this.equity),
      netProfit: round(this.netProfit),
      openProfit: round(this.openProfit),
      totalProfit: round(this.totalProfit),
      // totalFee: this.totalFee,
      // positionSize: this.positionSize,
      // positionAvgPrice: this.positionAvgPrice,
      // availableBalance: this.availableBalance,
      // availableMargin: this.availableMargin,
      // borrowed: this.borrowed,
      // liquidationPrice: this.liquidationPrice,
      // toLiquidationPrice: this.toLiquidationPrice,
      // priceDrawdown: this.priceDrawdown,
      // equityDrawdown: this.equityDrawdown,
      // brokenBasesCount: this.brokenBasesCount,
      grossProfit: round(this.grossProfit),
      grossLoss: round(this.grossLoss),
      profitability: round(this.profitability),

      // openTradesCount: this.openTradesCount,
      closedTradesCount: this.closedTradesCount,
      winTradesCount: this.winTradesCount,
      lossTradesCount: this.lossTradesCount,
    }
  }

  public statistics = {
    maxPositionSize: 0,
    maxOpenTrades: 0,
    // maxLiquidationPrice: 0,
    maxToLiquidationPrice: 100,
    maxMarginBalanceLow: INITIAL_CAPITAL * LEVERAGE_X,
    // maxPriceDrawdown: 0,
    // maxEquityDrawdown: 0,
    isNotEnoughFunds: false,
    isLiquidated: false,
    maxSimultaneousBrokenBases: 0,

    allBases: 0,
    allBrokenBases: 0,
    closedInBreakEvenBases: 0,
    closedInLossBases: 0,

    // baseDropMax: 0,
    // baseDropAvg: 0,
    // baseDropMedian: 0,
    //
    // baseBarsMax: 0,
    // brokenBaseBarsAvg: 0,
    // brokenBaseBarsMedian: 0,

    basesClosedInBreakEvenToAllBrokenBases: 0,
    basesClosedInLossToAllBrokenBases: 0,
  }

  public updateStatistics() {
    // --------------------------------------------------------------
    // Risk Statistics
    this.statistics.maxPositionSize = round(
      Math.max(this.statistics.maxPositionSize, this.positionSize),
    )
    this.statistics.maxOpenTrades = round(
      Math.max(this.statistics.maxOpenTrades, this.openTradesCount),
    )
    // this.statistics.maxLiquidationPrice = Math.max(
    //   this.statistics.maxLiquidationPrice,
    //   isNaN(this.liquidationPrice) ? 0 : this.liquidationPrice,
    // )
    this.statistics.maxToLiquidationPrice = round(
      Math.min(
        this.statistics.maxToLiquidationPrice,
        isNaN(this.toLiquidationPrice) ? 100 : this.toLiquidationPrice,
      ),
    )
    this.statistics.maxMarginBalanceLow = round(
      Math.min(this.statistics.maxMarginBalanceLow, this.availableMargin),
    )
    // this.statistics.maxPriceDrawdown = Math.max(
    //   this.statistics.maxPriceDrawdown,
    //   this.priceDrawdown,
    // )
    // this.statistics.maxEquityDrawdown = Math.max(
    //   this.statistics.maxEquityDrawdown,
    //   this.equityDrawdown,
    // )
    this.statistics.isNotEnoughFunds = this.statistics.isNotEnoughFunds || this.availableMargin <= 0
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
    this.statistics.closedInBreakEvenBases = Math.max(
      this.statistics.closedInBreakEvenBases,
      this.closedInBreakEvenBasesCount,
    )
    this.statistics.closedInLossBases = Math.max(
      this.statistics.closedInLossBases,
      this.closedInLossBasesCount,
    )

    // this.statistics.baseDropMax = max(this.allBrokenBases.map(base => base.stats.percentDrop))
    // this.statistics.baseDropAvg = average(this.allBrokenBases.map(base => base.stats.percentDrop))
    // this.statistics.baseDropMedian = median(this.allBrokenBases.map(base => base.stats.percentDrop))
    //
    // this.statistics.baseBarsMax = max(this.allBrokenBases.map(base => base.stats.barsLength))
    // this.statistics.brokenBaseBarsAvg = average(
    //   this.allBrokenBases.map(base => base.stats.barsLength),
    // )
    // this.statistics.brokenBaseBarsMedian = median(
    //   this.allBrokenBases.map(base => base.stats.barsLength),
    // )

    this.statistics.basesClosedInBreakEvenToAllBrokenBases = round(
      (this.closedInBreakEvenBasesCount / this.allBrokenBasesCount) * 100,
    )

    this.statistics.basesClosedInLossToAllBrokenBases = round(
      (this.closedInLossBasesCount / this.allBrokenBasesCount) * 100,
    )
  }

  // Bases
  public get brokenBases() {
    return this.bases.filter(base => base.isBroken)
  }

  public get brokenBasesCount() {
    return this.brokenBases.length
  }

  public get allBasesCount() {
    return this.allBases.length
  }

  public get allBrokenBases() {
    return this.closedBases.filter(base => base.isBroken)
  }

  public get allBrokenBasesCount() {
    return this.allBrokenBases.length
  }

  public get closedInBreakEvenBases() {
    return this.closedBases.filter(base => base.isClosedInBreakEven)
  }

  public get closedInBreakEvenBasesCount() {
    return this.closedInBreakEvenBases.length
  }

  public get closedInLossBases() {
    return this.closedBases.filter(base => base.isClosedInLoss)
  }

  public get closedInLossBasesCount() {
    return this.closedInLossBases.length
  }

  public get profitability() {
    return round((this.grossProfit / Math.abs(this.grossLoss)) * 100 - 100)
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
