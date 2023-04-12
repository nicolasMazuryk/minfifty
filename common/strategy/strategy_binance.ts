import { IBase, IBar, IOrder } from './types'
import { ORDER_SIDE, ORDER_TYPE, ORDER_STATUS, ORDER_BASE_TYPES } from './constants'
import { roundToPrecision, average, max, min, logger } from './utils'

// import GlobalStrategy from './strategy-global'

import {
  INITIAL_CAPITAL_USDT,
  ORDER_BASE_QUANTITY,
  ORDER_BASE_AMOUNT,
  ORDER_BASE_TYPE,
  TRADING_FEE,
  BASE_RETRACEMENT_CONFIRMATION,
  BASE_PRECEDING_BARS,
  // NUMBER_OF_LEVELS,
  // LEVEL_STEP,
  LEVEL_STEP_MULTIPLIER,
  ORDER_STEP_MULTIPLIER,
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
  ALLOWED_TRADE_THRESHOLD_BOUNCE,
  ALLOWED_TRADE_THRESHOLD_BARS,
  IGNORE_BASE_ON_TOP_PRECEDING_BASES,
  IGNORE_BASE_ON_TOP_PRECEDING_BASES_DIFFERENCE_THRESHOLD,
  IGNORE_BASE_ON_TOP_NUMBER_OF_IGNORED_BASES,
  MAX_SIMULTANEOUS_BROKEN_BASES,
} from './settings'
import { cancelBatchOrders, openBatchOrders } from '../../strategy/src/scripts/binance'
import { uuid } from 'uuidv4'

const round = roundToPrecision(2)
const roundTo3 = roundToPrecision(3)

export default class Strategy {
  public initialCapital: number = INITIAL_CAPITAL_USDT
  public initialCapitalCoin: number = 0
  public bars: IBar[] = []
  public bar!: IBar
  public barIndex: number = -1
  public barIndexOffset: number = 0
  public isNewBar: boolean = true
  public isNewBase: boolean = false
  public isIgnoredBase: boolean = false
  public newBaseBarIndex: number = 0
  public baseRetracementConfirmation: number = BASE_RETRACEMENT_CONFIRMATION
  public bases: IBase[] = []
  public closedBases: IBase[] = []
  public ignoredBases: IBase[] = []
  public allBases: IBase[] = []
  public allBasesCounter: number = 0
  // public closedInLossBases: IBase[] = []
  public orders: IOrder[] = []
  public closedOrders: IOrder[] = []
  public stopLossOrders: IOrder[] = []
  public stopLossHistoryOrders: IOrder[] = []
  public takeProfitOrders: IOrder[] = []
  public takeProfitHistoryOrders: IOrder[] = []
  public buyerIndex: number[][] = []
  public ignoreBuyOrders: boolean = false
  public isRealTime = false
  public isExecuting = false
  public current: number = 0
  public cache: any = {
    openOrders: 0,
    closedOrders: 0,
    lowestPrice: 999999,
  }

  // public globalStrategy: GlobalStrategy = new GlobalStrategy()

  public async run(bar: IBar): Promise<void> {
    this.isExecuting = true
    this.addBar(bar)

    // this.globalStrategy.run(bar)

    // this.logger.time('bar')

    // -- Debug --
    if ([31].includes(this.barIndex)) {
      console.log('debug')
    }

    if (this.barIndex === 0) {
      this.initialCapitalCoin = this.initialCapital / this.bar.open
    }

    this.setBaseBroken()

    // this.calculateBuyerIndex()
    //
    // this.calculateBaseRetracementConfirmation()

    this.findNewBaseBarIndex()

    await this.addNewBase()

    // this.updateFloatingBase()

    await this.ignoreOpenPreorderTradeIfExceedsLimitBarWindow()

    // this.calculateBaseBounceStopLoss()

    // this.updateTakeProfitIgnoreTradingLevelsCloseToBase()

    await this.processBrokenBases()

    await this.executeOrders()

    this.performanceCleanup()

    this.updateStatisticsOnTick()

    // this.logger.timeEnd('bar')
    this.isExecuting = false
  }

  public getBarByBarIndexOffset(barIndex: number): IBar {
    return this.bars[barIndex - this.barIndexOffset]
  }

  public sliceBarsByBarIndexOffset(start: number, end: number): IBar[] {
    return this.bars.slice(start - this.barIndexOffset, end - this.barIndexOffset)
  }

  public calculateBuyerIndex(): void {
    if (this.barIndex < 2) {
      if (this.buyerIndex.length < 2) {
        this.buyerIndex.push([0, 0, 0])
      }
      return
    }

    if (!this.bar.isFinal) return

    const previousBar = this.getBarByBarIndexOffset(this.barIndex - 1)
    const currentBar = this.getBarByBarIndexOffset(this.barIndex)

    const drop = round((previousBar.high / currentBar.low - 1) * 100) || 0.01
    const bounce = round((currentBar.high / previousBar.low - 1) * 100)

    const delta = round(bounce - drop)

    this.buyerIndex.push([drop, bounce, delta])

    const recentBars = this.buyerIndex.slice(
      Math.max(0, this.buyerIndex.length - 1 - ALLOWED_TRADE_THRESHOLD_BARS),
    )

    if (recentBars.some(([drop, bounce, delta]) => bounce >= ALLOWED_TRADE_THRESHOLD_BOUNCE)) {
      this.ignoreBuyOrders = false
    } else {
      this.ignoreBuyOrders = true
    }

    // this.ignoreBuyOrders = !recentBars.some(([drop, bounce, delta]) => bounce >= ALLOWED_TRADE_THRESHOLD_BOUNCE);
  }

  public calculateBaseRetracementConfirmation(): void {
    if (this.barIndex < 1) return

    if (!this.bar.isFinal) return

    const recentBars = this.buyerIndex.slice(
      Math.max(0, this.buyerIndex.length - 1 - ALLOWED_TRADE_THRESHOLD_BARS),
    )

    const volatility = Math.max(
      Math.abs(Math.max(...recentBars.map(([drop, bounce]) => drop))),
      Math.max(...recentBars.map(([drop, bounce]) => bounce)),
      0,
    )

    const volatilityStepper = volatility - ((volatility * 100) % 2.5) / 100

    const dynamicVolatilityBaseRetracementConfirmation = volatilityStepper / 2.5 / 100

    this.baseRetracementConfirmation = max([
      BASE_RETRACEMENT_CONFIRMATION,
      dynamicVolatilityBaseRetracementConfirmation,
    ])
  }

  private addBar(bar: IBar): void {
    // backtest
    if (!this.isRealTime) {
      this.bars.push(bar)
      this.barIndex++
    }
    // real time
    if (this.isRealTime) {
      if (!this.isNewBar) {
        this.bars[this.barIndex] = bar
      }
      if (this.isNewBar) {
        this.bars.push(bar)
        this.barIndex++
        this.isNewBar = false
      }
      if (bar.isFinal) {
        this.isNewBar = true
      }
    }

    this.bar = bar
    this.current = this.isRealTime ? this.bar.close : this.bar.low
  }

  private findNewBaseBarIndex(): void {
    this.isNewBase = false
    this.isIgnoredBase = false

    // for (let barIndex = this.barIndex; barIndex >= 0; barIndex--) {
    //   if (barIndex <= this.newBaseBarIndex) return
    //
    //   const high = this.barIndex === barIndex ? this.bar.close : this.bar.high
    //   if (high / this.getBarByBarIndexOffset(barIndex).low >= 1 + BASE_RETRACEMENT_CONFIRMATION) {
    //     const confirmedBarLow = this.getBarByBarIndexOffset(barIndex).low
    //
    //     const precedingBars = this.sliceBarsByBarIndexOffset(Math.max(0, barIndex - BASE_PRECEDING_BARS), barIndex)
    //
    //     if (precedingBars.every(({ low }) => confirmedBarLow <= low)) {
    //       // if (this.ignoreBaseOnTop(barIndex, confirmedBarLow)) continue
    //       // if (this.ignoreBaseExceedingBarsUntilBaseConfirmationLimit(barIndex)) continue
    //
    //       // if (this.ignoreIfBaseIsAboveAllowedGlobalBaseThreshold(confirmedBarLow)) continue
    //
    //       this.newBaseBarIndex = barIndex
    //       this.isNewBase = true
    //
    //       break
    //     }
    //   }
    // }

    if (this.barIndex === 0) return

    const currentBar = this.getBarByBarIndexOffset(this.barIndex)
    const previousBar = this.getBarByBarIndexOffset(this.barIndex - 1)

    if (
      previousBar.close / previousBar.low >= 1 + this.baseRetracementConfirmation ||
      (currentBar.high / previousBar.low >= 1 + this.baseRetracementConfirmation &&
        // ignore cases when order is triggered on the same candle when a base is confirmed
        currentBar.low > previousBar.low)
    ) {
      for (let barIndex = this.barIndex - 1; barIndex >= 0; barIndex--) {
        if (barIndex <= this.newBaseBarIndex) return

        const confirmedBarLow = previousBar.low
        const precedingBars = this.sliceBarsByBarIndexOffset(
          Math.max(0, barIndex - BASE_PRECEDING_BARS),
          barIndex,
        )

        if (precedingBars.every(({ low }) => confirmedBarLow <= low)) {
          // if (this.ignoreBaseOnTopPercent(this.barIndex, confirmedBarLow)) continue

          this.newBaseBarIndex = barIndex
          this.isNewBase = true

          // limit Max Simultaneous Broken Bases
          if (this.bases.filter(base => base.isBroken).length >= MAX_SIMULTANEOUS_BROKEN_BASES) {
            this.isIgnoredBase = true
          }

          // if (
          //   this.ignoreTopBaseAndFollowingBase(confirmedBarLow) ||
          //   this.ignoreBaseOnTopHigherThanPrecedingRange(confirmedBarLow) ||
          //   this.ignoreMultipleTopBases(confirmedBarLow))
          // {
          //   this.isIgnoredBase = true
          // }

          break
        }
      }
    }
  }

  public ignoreBaseOnTopHigherThanPrecedingRange(baseBarLow: number) {
    const precedingBases = this.allBases.slice(
      Math.max(0, this.allBases.length - 1 - IGNORE_BASE_ON_TOP_PRECEDING_BASES),
    )

    const highestPrecedingBase = max(precedingBases.map(base => base.price))

    // return baseBarLow >= highestPrecedingBase
    return (
      baseBarLow >=
      highestPrecedingBase * (1 - IGNORE_BASE_ON_TOP_PRECEDING_BASES_DIFFERENCE_THRESHOLD)
    )
  }

  public ignoreMultipleTopBases(baseBarLow: number) {
    const precedingBases = this.allBases.slice(
      Math.max(0, this.allBases.length - 1 - IGNORE_BASE_ON_TOP_PRECEDING_BASES),
    )

    const highestPrecedingBases = precedingBases
      .sort((a, b) => b.price - a.price)
      .slice(0, IGNORE_BASE_ON_TOP_NUMBER_OF_IGNORED_BASES)

    return highestPrecedingBases.some(base => baseBarLow >= base.price)
  }

  public ignoreTopBaseAndFollowingBase(baseBarLow: number) {
    const precedingBases = this.allBases.slice(
      Math.max(0, this.allBases.length - 1 - IGNORE_BASE_ON_TOP_PRECEDING_BASES),
    )

    const highestPrecedingBase = precedingBases.sort((a, b) => b.price - a.price).shift()

    if (!highestPrecedingBase) return

    return (
      // the current base is the top base
      baseBarLow >= highestPrecedingBase.price ||
      // the current base is next after the top base
      highestPrecedingBase.barIndex === this.allBases[this.allBases.length - 1].barIndex
    )
  }

  public ignoreBaseOnTopPercent(baseBarIndex: number, baseBarLow: number) {
    const precedingBars = this.sliceBarsByBarIndexOffset(
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

  public async updateFloatingBase() {
    if (!this.bases[0] || this.bases[0].isBroken) return

    const base = this.bases[0]
    const bars = this.sliceBarsByBarIndexOffset(base.barIndex, this.barIndex + 1)

    const belowBaseNewLowestLow = min(bars.map(bar => bar.low))

    if (belowBaseNewLowestLow >= base.price * (1 - FLOAT_BELOW_BASE_ADJUSTMENT_THRESHOLD)) return

    const barIndex = bars.indexOf(bars.find(bar => bar.low === belowBaseNewLowestLow)!)

    const belowBaseNewBarIndex = base.barIndex + barIndex
    // do not proceed if new "low" is the same as existing "low"
    // if (belowBaseNewBarIndex === base.barIndex) return

    // drop on the same current candle and does not bounce back
    const isDropOnCurrentCandle =
      belowBaseNewBarIndex === this.barIndex && this.bar.close < base.price
    // but only if there was no drop below base.price on the previous candle
    const isDropOnSomeOfPreviousCandles = bars
      .slice(0, bars.length - 2)
      .some(bar => bar.low < base.price)

    if (isDropOnCurrentCandle && !isDropOnSomeOfPreviousCandles) return

    const higherPrice = this.isRealTime ? this.bar.close : this.bar.high

    if (higherPrice >= base.price * (1 - TAKE_PROFIT_BELOW_BASE)) {
      await this.closeBaseOrders(base, base.price * (1 - TAKE_PROFIT_BELOW_BASE))

      // base.price = belowBaseNewLowestLow
      // base.barIndex = belowBaseNewBarIndex
      // base.takeProfit = round(belowBaseNewLowestLow * (1 - TAKE_PROFIT_BELOW_BASE))
      // base.stopLoss = round(belowBaseNewLowestLow * (1 - ORDER_LEVEL_STOP_LOSS))
      // base.levels = []

      // await this.openBaseOrders(base)

      this.bases.shift()
    }
  }

  public async ignoreOpenPreorderTradeIfExceedsLimitBarWindow() {
    if (!this.bases[0] || this.bases[0].isBroken) return

    const base = this.bases[0]

    // const bars = this.sliceBarsByBarIndexOffset(base.barIndex, this.barIndex + 1)
    // const isBaseCracked = bars.some(bar => bar.low < base.price)
    // if (base.barIndex < this.barIndex - ORDER_OPEN_TRADE_WINDOW_BARS && !isBaseCracked) {
    if (base.barIndex <= this.barIndex - ORDER_OPEN_TRADE_WINDOW_BARS) {
      await this.cancelBaseOrders(base)

      this.bases.shift() // just testing / less order triggers / try without it

      // base.isRespected = true
    }
  }

  private setBaseBroken() {
    this.bases
      .filter(base => !base.isBroken)
      .forEach(base => {
        if (this.current <= base.levels[0]) {
          base.isBroken = true
          base.baseBrokenBarIndex = this.barIndex
          base.baseBrokenTime = this.isRealTime ? new Date() : this.bar.time
        }
      })
  }

  private async addNewBase(): Promise<void> {
    if (!this.isNewBase) return

    const basePrice = this.getBarByBarIndexOffset(this.newBaseBarIndex).low

    const base = {
      barIndex: this.newBaseBarIndex,
      price: basePrice,
      baseBrokenTime: null,
      baseBrokenBarIndex: 0,
      isBroken: false,
      isRespected: false,
      isIgnored: this.isIgnoredBase,
      baseBounceTop: 0,
      takeProfit: round(basePrice * (1 - TAKE_PROFIT_BELOW_BASE)),
      breakEven: 999999,
      stopLoss: round(basePrice * (1 - ORDER_LEVEL_STOP_LOSS)),
      warningPriceLow: 999999,
      emergencyTakeProfit: 999999,
      emergencyPriceLow: 999999,
      breakEvenPriceLow: 999999,
      levels: [],
      isClosedInLoss: false,
      isClosedInBreakEven: false,
      PNL: 0,
      stats: {
        percentDrop: 0,
        percentBounce: 0,
        barsLength: 0,
      },
    }

    if (this.bases[0]?.isBroken) {
      this.bases.unshift(base)
    } else {
      this.bases[0] && (await this.cancelBaseOrders(this.bases[0]))
      this.bases[0] = base
    }

    if (!this.isIgnoredBase) {
      await this.openBaseOrders(base)
    } else {
      this.ignoredBases.push(base)
    }

    // Disable to increase performance
    // Enable to analyse and measure all detected bases
    this.allBases.push(base)
  }

  private async openBaseOrders(base: IBase) {
    const orderDetails = {
      baseBarIndex: base.barIndex,
      status: ORDER_STATUS.OPEN,
      timeOpen: null,
      timeClosed: null,
      barIndexOpen: null,
      barIndexClosed: null,
      type: ORDER_TYPE.LIMIT,
      side: ORDER_SIDE.BUY,
      takeProfit: base.takeProfit,
      fee: 0,
      PNL: 0,
      feeCoin: 0,
      PNLCoin: 0,
      originalOrderId: undefined,
      binance: undefined,
    }

    const ordersToBeExecuted = []

    for (let level = 1; level <= ORDER_NUMBER_OF_LEVELS; level++) {
      const price = round(
        base.price * (1 - ORDER_LEVEL_STEP * Math.pow(level, LEVEL_STEP_MULTIPLIER)),
      )

      base.levels.push(price)

      let order = {
        ...orderDetails,
        id: uuid(),
        quantity: 0,
        amount: 0,
        level: level,
        price: price,
        stopLoss: base.stopLoss,
      }

      if (ORDER_BASE_TYPE === ORDER_BASE_TYPES.COIN) {
        const quantity = ORDER_BASE_QUANTITY * Math.pow(ORDER_STEP_MULTIPLIER, level)

        order.quantity = roundTo3(quantity)
        order.amount = round(quantity * price)
      }

      if (ORDER_BASE_TYPE === ORDER_BASE_TYPES.USDT) {
        const quantity = (ORDER_BASE_AMOUNT * Math.pow(ORDER_STEP_MULTIPLIER, level)) / price

        order.quantity = roundTo3(quantity)
        order.amount = round(quantity * price)
      }

      // Trading Rule #3 ignore Trading Levels Close To the Base
      // if (level <= IGNORE_TRADING_LEVEL_CLOSE_TO_BASE) continue

      ordersToBeExecuted.push(order)
    }

    const binanceOrders = await openBatchOrders(ordersToBeExecuted, ORDER_TYPE.LIMIT)

    binanceOrders.forEach(order => this.orders.push(order))
  }

  private async cancelBaseOrders(base: IBase) {
    const ordersToBeExecuted = this.orders
      .filter(order => order.baseBarIndex === base.barIndex)
      .filter(order => order.status === ORDER_STATUS.OPEN)

    await cancelBatchOrders(ordersToBeExecuted)

    this.orders = this.orders.filter(order => order.status !== ORDER_STATUS.CANCELED)
  }

  private async closeBaseOrders(base: IBase, closePrice: number) {
    // if a base is broken and respected on the same candle (long wick.)
    // we need to trigger orders execution before closing this order
    if (this.isBaseBrokenOnCurrentBar(base)) {
      const orders = this.orders.filter(order => order.baseBarIndex === base.barIndex)

      for (const order of orders) {
        if (order.status === ORDER_STATUS.OPEN && this.current <= order.price) {
          order.timeOpen = this.isRealTime ? new Date() : this.bar.time
          order.barIndexOpen = this.barIndex
          order.status = ORDER_STATUS.FILLED
          order.fee = order.amount * TRADING_FEE
          order.feeCoin = order.fee / order.price

          await this.openStopLossOrders([order])
          await this.openTakeProfitOrders([order])
        }
      }
    }

    await this.cancelBaseOrders(base)

    this.orders
      .filter(order => order.baseBarIndex === base.barIndex)
      .filter(order => order.status === ORDER_STATUS.FILLED)
      .forEach(order => {
        order.timeClosed = this.isRealTime ? new Date() : this.bar.time
        order.barIndexClosed = this.barIndex
        order.status = ORDER_STATUS.CLOSED
        order.fee = order.fee + order.quantity * closePrice * TRADING_FEE
        order.PNL = (closePrice - order.price) * order.quantity - order.fee
        order.feeCoin = order.fee / closePrice
        order.PNLCoin = order.PNL / closePrice
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

  private async processBrokenBases() {
    const brokenBases = this.bases.filter(base => base.isBroken)

    for (const base of brokenBases) {
      // this.updateTakeProfitWhenWarningLevelIsReached()

      // this.handleEmergencyTakeProfit(base)

      // this.updateBaseStats(base)

      await this.handleCloseOrdersInBreakEven(base)

      // this.closeNestedBasesInBreakEven(base)

      await this.setBaseRespected(base)
    }
  }

  private async calculateBaseBreakEven(base: IBase) {
    // await this.executeFillOrders()

    const orders = this.orders
      .filter(order => order.baseBarIndex === base.barIndex)
      .filter(order => order.status === ORDER_STATUS.FILLED)

    if (!orders.length) return

    const BREAK_EVEN_TRIGGER = 0.5

    if (ORDER_BASE_TYPE === ORDER_BASE_TYPES.USDT) {
      const minOrderPrice = min(orders.map(order => order.price))
      const maxOrderPrice = max(orders.map(order => order.price))

      base.breakEven =
        round(
          (minOrderPrice + (maxOrderPrice - minOrderPrice) * BREAK_EVEN_TRIGGER) *
            (1 + TRADING_FEE * 2),
        ) || 999999
    }
    // TODO: calculate dynamic BREAK_EVEN_TRIGGER = 0.5 for COIN
    if (ORDER_BASE_TYPE === ORDER_BASE_TYPES.COIN) {
      const totalOrderAmount = round(
        orders.reduce((acc, order) => acc + order.amount * (1 + TRADING_FEE * 2), 0),
      )
      const totalOrderQuantity = orders.reduce((acc, order) => acc + order.quantity, 0)

      base.breakEven = round(totalOrderAmount / totalOrderQuantity) || 999999
    }

    if (LEVEL_STEP_MULTIPLIER > 1) {
      base.breakEven = round(average(orders.map(order => order.price)) * (1 + TRADING_FEE * 2))
    }

    orders.forEach(order => {
      order.takeProfit = base.breakEven
    })

    await this.cancelTakeProfitOrders(base)
    await this.openTakeProfitOrders(orders)

    base.breakEvenPriceLow = this.current
  }

  public async handleCloseOrdersInBreakEven(base: IBase) {
    const breakEvenTriggerLow = base.price * (1 - ORDER_BREAK_EVEN_CLOSE_TRIGGER)
    // TODO: add freeze period 5 sec for breakEven calculation. Use bar.low instead of this.current (because we may miss low because of the freeze period)
    if ((this.current <= breakEvenTriggerLow || base.breakEven < 999999) && this.current < base.breakEvenPriceLow) {
      await this.calculateBaseBreakEven(base)
    }
  }

  public async closeNestedBasesInBreakEven(base: IBase) {
    const NUMBER_OF_NESTED_BROKEN_BASES_TO_CLOSE_IN_BREAK_EVEN = 1
    const brokenBasesToCloseInBreakEven = this.bases
      .filter(base => base.isBroken)
      .slice(0, -NUMBER_OF_NESTED_BROKEN_BASES_TO_CLOSE_IN_BREAK_EVEN)
    const isBaseToBeClosedInBreakEven = brokenBasesToCloseInBreakEven.includes(base)

    if (isBaseToBeClosedInBreakEven || base.breakEven < 999999) {
      await this.calculateBaseBreakEven(base)
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
    const IGNORE_BASE_BOUNCE_CALCULATION_UNTIL_PERCENT = 1
    const percentDrop = round((1 - this.current / base.price) * 100)

    let currentHigh

    if (percentDrop > base.stats.percentDrop) {
      base.stats.percentDrop = percentDrop

      currentHigh = this.bar.close
    } else {
      currentHigh = this.bar.high
    }

    // do not calculate bounce if current candle high is higher than base price
    if (
      base.stats.percentDrop > IGNORE_BASE_BOUNCE_CALCULATION_UNTIL_PERCENT &&
      this.bar.high < base.price
    ) {
      const percentBounce = round(
        ((base.stats.percentDrop - (1 - currentHigh / base.price) * 100) / base.stats.percentDrop) *
          100,
      )
      base.stats.percentBounce = Math.max(base.stats.percentBounce, percentBounce)
    }

    if (base.baseBrokenBarIndex) {
      const barsLength = this.barIndex - base.baseBrokenBarIndex
      base.stats.barsLength = Math.max(base.stats.barsLength, barsLength)
    }
  }

  private async setBaseRespected(base: IBase) {
    const higherPrice =
      this.isBaseBrokenOrEmergencyLevelHitOnCurrentBar(base) || this.isRealTime
        ? this.bar.close
        : this.bar.high

    const lowerPrice = this.current

    const isBarLimitExceeded =
      BASE_BARS_LENGTH_LIMIT && this.barIndex - base.barIndex >= BASE_BARS_LENGTH_LIMIT

    if (lowerPrice <= base.stopLoss) {
      await this.executeFillOrders()
      await this.closeBaseOrders(base, base.stopLoss)
      await this.cancelTakeProfitOrders(base)
      base.isClosedInLoss = true
    } else if (higherPrice >= base.takeProfit) {
      await this.executeFillOrders()
      await this.closeBaseOrders(base, base.takeProfit)
      await this.cancelStopLossOrders(base)
      base.isRespected = true
    } else if (higherPrice >= base.breakEven) {
      await this.executeFillOrders()
      await this.closeBaseOrders(base, base.breakEven)
      await this.cancelStopLossOrders(base)
      base.isClosedInBreakEven = true
    } else if (isBarLimitExceeded) {
      await this.executeFillOrders()
      await this.closeBaseOrders(base, this.bar.close)
    }

    // if (higherPrice >= base.emergencyTakeProfit) {
    //   await this.executeFillOrders()
    //   await this.closeBaseOrders(base, base.emergencyTakeProfit)
    //   base.isClosedInLoss = true
    // }
  }

  private isBaseBrokenOnCurrentBar(base: IBase) {
    if (base === undefined) return

    const isBaseBrokenOnCurrentBar =
      !(this.getBarByBarIndexOffset(this.barIndex - 1).low <= base.levels[0]) &&
      this.bar.low <= base.levels[0]

    return isBaseBrokenOnCurrentBar
  }

  private isBaseBrokenOrEmergencyLevelHitOnCurrentBar(base: IBase) {
    if (base === undefined) return

    const isBaseBrokenOnCurrentBar = this.isBaseBrokenOnCurrentBar(base)

    const breakEvenTriggerLow = base.price * (1 - ORDER_BREAK_EVEN_CLOSE_TRIGGER)

    const isBreakEvenTriggeredOnCurrentBar =
      !(this.getBarByBarIndexOffset(this.barIndex - 1).low <= breakEvenTriggerLow) &&
      this.bar.low <= breakEvenTriggerLow

    const emergencyLevel = base.levels[EMERGENCY_LEVEL_NUMBER - 1]

    const isEmergencyLevelHitOnCurrentBar =
      !(this.getBarByBarIndexOffset(this.barIndex - 1).low <= emergencyLevel) &&
      this.bar.low <= emergencyLevel

    return (
      isBaseBrokenOnCurrentBar ||
      isBreakEvenTriggeredOnCurrentBar ||
      isEmergencyLevelHitOnCurrentBar
    )
  }

  private async executeOrders() {
    const entryPrice = this.current

    if (this.ignoreBuyOrders) {
      this.orders.forEach(order => {
        if (order.status === ORDER_STATUS.OPEN && entryPrice <= order.price) {
          order.status = ORDER_STATUS.IGNORED
        }
      })
    }

    await this.executeFillOrders()

    this.orders.forEach(order => {
      if (order.status === ORDER_STATUS.FILLED && this.current <= order.stopLoss) {
        order.timeClosed = this.isRealTime ? new Date() : this.bar.time
        order.status = ORDER_STATUS.COMPLETED
        order.barIndexClosed = this.barIndex
        order.fee = order.fee + order.quantity * order.stopLoss * TRADING_FEE
        order.PNL = (order.stopLoss - order.price) * order.quantity - order.fee
        order.feeCoin = order.fee / order.stopLoss
        order.PNLCoin = order.PNL / order.stopLoss
        // needed to display sell order on chart. TODO: refactor
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
        order.feeCoin = order.fee / order.takeProfit
        order.PNLCoin = order.PNL / order.takeProfit
      }
    })

    this.executeStopLossOrders()
    this.executeTakeProfitOrders()

    this.bases
      .filter(base => base.isRespected || base.isClosedInBreakEven || base.isClosedInLoss)
      .forEach(base => {
        base.PNL = [...this.orders, ...this.closedOrders]
          .filter(order => order.baseBarIndex === base.barIndex)
          .reduce((acc, order) => acc + order.PNL, 0)
      })

    // this.orders = this.orders.filter((order) => order.status !== ORDER_STATUS.COMPLETED)
  }

  private executeStopLossOrders() {
    this.stopLossOrders.forEach(order => {
      if (order.status === ORDER_STATUS.OPEN && this.current <= order.stopLoss) {
        order.timeClosed = this.isRealTime ? new Date() : this.bar.time
        order.barIndexClosed = this.barIndex
        order.status = ORDER_STATUS.COMPLETED
        order.fee = order.quantity * order.stopLoss * TRADING_FEE
        // order.PNL = (order.stopLoss - order.price) * order.quantity - order.fee
        order.feeCoin = order.fee / order.stopLoss
        // order.PNLCoin = order.PNL / order.stopLoss
        // needed to display sell order on chart. TODO: refactor
        order.takeProfit = order.stopLoss
      }
    })
  }

  private executeTakeProfitOrders() {
    this.takeProfitOrders.forEach(order => {
      if (
        order.status === ORDER_STATUS.OPEN &&
        this.getOrderTakeProfitExitPrice(order) >= order.takeProfit
      ) {
        order.timeClosed = this.isRealTime ? new Date() : this.bar.time
        order.barIndexClosed = this.barIndex
        order.status = ORDER_STATUS.COMPLETED
        order.fee = order.quantity * order.takeProfit * TRADING_FEE
        // order.PNL = (order.takeProfit - order.price) * order.quantity - order.fee
        order.feeCoin = order.fee / order.takeProfit
        // order.PNLCoin = order.PNL / order.takeProfit
      }
    })
  }

  private async executeFillOrders() {
    if (!this.ignoreBuyOrders) {
      for (const order of this.orders) {
        if (order.status === ORDER_STATUS.OPEN && this.current <= order.price) {
          order.timeOpen = this.isRealTime ? new Date() : this.bar.time
          order.barIndexOpen = this.barIndex
          order.status = ORDER_STATUS.FILLED
          order.fee = order.amount * TRADING_FEE
          order.feeCoin = order.fee / order.price

          await this.openStopLossOrders([order])
          await this.openTakeProfitOrders([order])
        }
      }
    }
  }

  private async openStopLossOrders(orders: IOrder[]) {
    const stopLossOrders = orders.map(order => ({
      ...order,
      type: ORDER_TYPE.STOP_MARKET,
      price: order.stopLoss,
      stopLoss: order.stopLoss,
      takeProfit: 999999,

      id: uuid(),
      originalOrderId: order.id,
      side: ORDER_SIDE.SELL,
      status: ORDER_STATUS.OPEN,
      timeOpen: null,
      timeClosed: null,
      barIndexOpen: null,
      barIndexClosed: null,
      fee: 0,
      feeCoin: 0,
      PNL: 0,
      PNLCoin: 0,
    }))

    const binanceOrders = await openBatchOrders(stopLossOrders, ORDER_TYPE.STOP_MARKET)

    this.stopLossOrders.push(...binanceOrders)
  }

  private async cancelStopLossOrders(base: IBase) {
    const stopLossOrders = this.stopLossOrders.filter(order => order.baseBarIndex === base.barIndex)

    await cancelBatchOrders(stopLossOrders)

    this.stopLossOrders = this.stopLossOrders.filter(order => order.baseBarIndex !== base.barIndex)
  }

  private async openTakeProfitOrders(orders: IOrder[]) {
    const takeProfitOrders = orders.map(order => ({
      ...order,
      type: ORDER_TYPE.TAKE_PROFIT,
      price: order.takeProfit,
      takeProfit: order.takeProfit,
      stopLoss: 0,

      id: uuid(),
      originalOrderId: order.id,
      side: ORDER_SIDE.SELL,
      status: ORDER_STATUS.OPEN,
      timeOpen: null,
      timeClosed: null,
      barIndexOpen: null,
      barIndexClosed: null,
      fee: 0,
      feeCoin: 0,
      PNL: 0,
      PNLCoin: 0,
    }))

    const binanceOrders = await openBatchOrders(takeProfitOrders, ORDER_TYPE.TAKE_PROFIT)

    this.takeProfitOrders.push(...binanceOrders)
  }

  private async cancelTakeProfitOrders(base: IBase) {
    const takeProfitOrders = this.takeProfitOrders.filter(
      order => order.baseBarIndex === base.barIndex,
    )

    await cancelBatchOrders(takeProfitOrders)

    this.takeProfitOrders = this.takeProfitOrders.filter(
      order => order.baseBarIndex !== base.barIndex,
    )
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
        [ORDER_STATUS.COMPLETED, ORDER_STATUS.CLOSED, ORDER_STATUS.IGNORED].includes(order.status),
      ),
    )

    this.orders = this.orders.filter(
      order =>
        ![ORDER_STATUS.COMPLETED, ORDER_STATUS.CLOSED, ORDER_STATUS.IGNORED].includes(order.status),
    )

    this.closedBases.push(
      ...this.bases.filter(
        base => base.isRespected || base.isClosedInBreakEven || base.isClosedInLoss,
      ),
    )

    this.bases = this.bases.filter(
      base => !base.isRespected && !base.isClosedInBreakEven && !base.isClosedInLoss,
    )

    const BAR_CLEANUP_INTERVAL = 10000
    const REMAINING_BAR_OFFSET = 5000

    if (this.barIndex > 0 && this.barIndex % BAR_CLEANUP_INTERVAL === 0) {
      this.bars = this.bars.slice(this.bars.length - 1 - REMAINING_BAR_OFFSET)
      this.barIndexOffset = this.barIndex - REMAINING_BAR_OFFSET
    }

    const BAYER_INDEX_CLEANUP_INTERVAL = 100
    const REMAINING_BAYER_INDEX_OFFSET = 50

    if (this.buyerIndex.length > 0 && this.buyerIndex.length % BAYER_INDEX_CLEANUP_INTERVAL === 0) {
      this.buyerIndex = this.buyerIndex.slice(
        this.buyerIndex.length - 1 - REMAINING_BAYER_INDEX_OFFSET,
      )
    }

    const ALL_BASES_CLEANUP_INTERVAL = 50
    const REMAINING_ALL_BASES_OFFSET = 25

    if (this.allBases.length > 0 && this.allBases.length % ALL_BASES_CLEANUP_INTERVAL === 0) {
      this.allBasesCounter = this.allBasesCounter + REMAINING_ALL_BASES_OFFSET
      this.allBases = this.allBases.slice(this.allBases.length - 1 - REMAINING_ALL_BASES_OFFSET)
    }
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
    // return this.closedOrders

    return this.closedOrders.filter(order =>
      [ORDER_STATUS.COMPLETED, ORDER_STATUS.CLOSED].includes(order.status),
    )
  }

  public get ignoredTrades() {
    return this.closedOrders.filter(order => order.status === ORDER_STATUS.IGNORED)
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

  public get ignoredTradesCount() {
    return this.ignoredTrades.length
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

  // ---

  public get buyAndHold() {
    return round(this.initialCapitalCoin * this.current - this.initialCapital)
  }

  public get buyAndHoldPercent() {
    return round(
      ((this.initialCapitalCoin * this.current - this.initialCapital) / this.initialCapital) * 100,
    )
  }

  public get equityCoin() {
    return this.initialCapitalCoin + this.totalProfitCoin
  }

  public get netProfitCoin() {
    return this.closedTrades.reduce((acc, order) => acc + order.PNLCoin, 0)
  }

  public get openProfitCoin() {
    return this.openTrades.reduce(
      (acc, order) =>
        acc + ((this.current - order.price) * order.quantity - order.fee) / this.current,
      0,
    )
  }

  public get totalProfitCoin() {
    return this.netProfitCoin + this.openProfitCoin
  }

  public get availableMarginCoin() {
    return this.equityCoin * LEVERAGE_X - this.positionSize
  }

  public get borrowedCoin() {
    return Math.max(this.positionSize - this.equityCoin, 0)
  }

  public get liquidationPriceCoin() {
    return (
      ((this.borrowedCoin * (1 + MAINTANANCE_MARGIN)) / this.positionSize) * this.positionAvgPrice
    )
  }

  public get toLiquidationPriceCoin() {
    return ((this.current - this.liquidationPriceCoin) / this.current) * 100
  }

  // ---

  public get realTimeStatistics() {
    return {
      'buyAndHold,$': round(this.buyAndHold),
      'buyAndHold,%': round(this.buyAndHoldPercent),
      equity: round(this.equity),
      netProfit: round(this.netProfit),
      openProfit: round(this.openProfit),
      totalProfit: round(this.totalProfit),
      '--------': '--------',
      equityCoin: round(this.equityCoin),
      netProfitCoin: round(this.netProfitCoin),
      openProfitCoin: round(this.openProfitCoin),
      totalProfitCoin: round(this.totalProfitCoin),
      equityCoinConverted: round(this.equityCoin * this.current),
      totalProfitCoinConverted: round(this.totalProfitCoin * this.current),
      '---------': '---------',
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
      ignoredTradesCount: this.ignoredTradesCount,
      winTradesCount: this.winTradesCount,
      lossTradesCount: this.lossTradesCount,
      '----------': '----------',
    }
  }

  public statistics = {
    maxPositionSize: 0,
    maxOpenTrades: 0,
    maxSimultaneousBrokenBases: 0,
    '-----------': '-----------',
    // maxLiquidationPrice: 0,
    maxToLiquidationPrice: 100,
    maxMarginBalanceLow: this.initialCapital * LEVERAGE_X,
    // maxPriceDrawdown: 0,
    // maxEquityDrawdown: 0,
    isNotEnoughFunds: false,
    isLiquidated: false,
    '------------': '------------',
    maxToLiquidationPriceCoin: 100,
    maxMarginBalanceLowCoin: this.initialCapitalCoin * LEVERAGE_X,
    maxMarginBalanceLowCoinConvertedBack: 0,
    isNotEnoughFundsCoin: false,
    isLiquidatedCoin: false,
    '-------------': '-------------',
    allBases: 0,
    allIgnoredBases: 0,
    allIgnoredBrokenBases: 0,
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

    ignoredBasesToAllBases: 0,
    ignoredBrokenBasesToAllBrokenBases: 0,
    basesClosedInBreakEvenToAllBrokenBases: 0,
    basesClosedInLossToAllBrokenBases: 0,
  }
  // TODO: performance
  public updateStatisticsOnTick() {
    const openOrders = this.openTradesCount
    const closedOrders = this.closedTradesCount

    // recalculate liquidation price if the price goes lower
    if (this.current < this.cache.lowestPrice) {
      this.cache.lowestPrice = this.current

      // this.statistics.maxLiquidationPrice = Math.max(
      //   this.statistics.maxLiquidationPrice,
      //   isNaN(this.liquidationPrice) ? 0 : this.liquidationPrice,
      // )
      this.statistics.maxMarginBalanceLow = round(
        Math.min(this.statistics.maxMarginBalanceLow, this.availableMargin),
      )
      this.statistics.maxToLiquidationPrice = round(
        Math.min(
          this.statistics.maxToLiquidationPrice,
          isNaN(this.toLiquidationPrice) ? 100 : this.toLiquidationPrice,
        ),
      )
      this.statistics.isNotEnoughFunds =
        this.statistics.isNotEnoughFunds || this.availableMargin <= 0
      this.statistics.isLiquidated =
        this.statistics.isLiquidated || this.current <= this.liquidationPrice

      this.statistics.maxMarginBalanceLowCoin = round(
        Math.min(this.statistics.maxMarginBalanceLowCoin, this.availableMarginCoin),
      )
      this.statistics.maxMarginBalanceLowCoinConvertedBack = round(
        Math.min(
          this.statistics.maxMarginBalanceLowCoinConvertedBack,
          this.availableMarginCoin * this.current,
        ),
      )
      this.statistics.maxToLiquidationPriceCoin = round(
        Math.min(
          this.statistics.maxToLiquidationPriceCoin,
          isNaN(this.toLiquidationPriceCoin) ? 100 : this.toLiquidationPriceCoin,
        ),
      )
      this.statistics.isNotEnoughFundsCoin =
        this.statistics.isNotEnoughFundsCoin || this.availableMarginCoin <= 0
      this.statistics.isLiquidatedCoin =
        this.statistics.isLiquidatedCoin || this.current <= this.liquidationPriceCoin
      // this.statistics.maxPriceDrawdown = Math.max(
      //   this.statistics.maxPriceDrawdown,
      //   this.priceDrawdown,
      // )
      // this.statistics.maxEquityDrawdown = Math.max(
      //   this.statistics.maxEquityDrawdown,
      //   this.equityDrawdown,
      // )

      this.statistics.maxSimultaneousBrokenBases = Math.max(
        this.statistics.maxSimultaneousBrokenBases,
        this.brokenBasesCount,
      )
    }

    // reset lower price only if open orders or closed orders changed
    if (this.cache.openOrders === openOrders && this.cache.closedOrders === closedOrders) return

    this.cache.openOrders = openOrders
    this.cache.closedOrders = closedOrders
    this.cache.lowestPrice = 999999
    // --------------------------------------------------------------
    // Risk Statistics
    this.statistics.maxPositionSize = round(
      Math.max(this.statistics.maxPositionSize, this.positionSize),
    )
    this.statistics.maxOpenTrades = round(
      Math.max(this.statistics.maxOpenTrades, this.openTradesCount),
    )
  }

  public updateStatisticsOnComplete() {
    // Bases Statistics
    this.statistics.allBases = this.allBasesCount
    this.statistics.allIgnoredBases = this.allIgnoredBasesCount
    this.statistics.allIgnoredBrokenBases = this.allIgnoredBrokenBasesCount
    this.statistics.allBrokenBases = this.allBrokenBasesCount
    this.statistics.closedInBreakEvenBases = this.closedInBreakEvenBasesCount
    this.statistics.closedInLossBases = this.closedInLossBasesCount

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

    this.statistics.ignoredBasesToAllBases = round(
      (this.allIgnoredBasesCount / this.allBasesCounter) * 100,
    )

    this.statistics.ignoredBrokenBasesToAllBrokenBases = round(
      (this.allIgnoredBrokenBasesCount / this.allBrokenBasesCount) * 100,
    )

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
    return this.allBasesCounter + this.allBases.length
  }

  public get allIgnoredBases() {
    return this.ignoredBases
  }

  public get allIgnoredBasesCount() {
    return this.allIgnoredBases.length
  }

  public get allIgnoredBrokenBases() {
    return this.ignoredBases.filter(base => base.isBroken)
  }

  public get allIgnoredBrokenBasesCount() {
    return this.allIgnoredBrokenBases.length
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
