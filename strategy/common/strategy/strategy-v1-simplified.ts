import { v4 } from 'uuid'

import { cancelBatchOrders, openBatchOrders } from '@/scripts/binance'
import { isTakeProfitOrderTriggered, isStopLossOrderTriggered } from '@/scripts/helpers'

import {
  ORDER_TYPE,
  ORDER_STATUS,
  ORDER_BASE_TYPES,
  // ORDER_TYPE_BINANCE_ORDER_FIELD,
} from './constants'
import {
  INITIAL_CAPITAL_USDT,
  ORDER_BASE_QUANTITY,
  ORDER_BASE_AMOUNT,
  ORDER_BASE_TYPE,
  TRADING_FEE,
  BASE_RETRACEMENT_CONFIRMATION,
  BASE_PRECEDING_BARS,
  LEVEL_STEP_MULTIPLIER,
  ORDER_STEP_MULTIPLIER,
  TAKE_PROFIT_BELOW_BASE,
  LEVERAGE_X,
  MAINTANANCE_MARGIN,
  ORDER_NUMBER_OF_LEVELS,
  ORDER_LEVEL_STEP,
  ORDER_LEVEL_STOP_LOSS,
  ORDER_OPEN_TRADE_WINDOW_BARS,
  ORDER_BREAK_EVEN_CLOSE_TRIGGER,
  MAX_SIMULTANEOUS_BROKEN_BASES,
} from './settings'
import { IBase, IBar, IOrder } from './types'
import { roundToPrecision, average, max, min, sum, logger } from './utils'

const round = roundToPrecision(2)
const roundTo3 = roundToPrecision(3)

export default class Strategy {
  public initialCapital: number = INITIAL_CAPITAL_USDT
  public initialCapitalCoin = 0
  public bars: IBar[] = []
  public bar!: IBar
  public barIndex = -1
  public barIndexOffset = 0
  public isNewBar = true
  public isNewBase = false
  public isIgnoredBase = false
  public newBaseBarIndex = 0
  public baseRetracementConfirmation: number = BASE_RETRACEMENT_CONFIRMATION
  public bases: IBase[] = []
  public closedBases: IBase[] = []
  public ignoredBases: IBase[] = []
  public allBases: IBase[] = []
  public allBasesCounter = 0
  // public closedInLossBases: IBase[] = []
  public orders: IOrder[] = []
  public closedOrders: IOrder[] = []
  public stopLossOrders: IOrder[] = []
  // public stopLossHistoryOrders: IOrder[] = []
  public takeProfitOrders: IOrder[] = []
  // public takeProfitHistoryOrders: IOrder[] = []
  public buyerIndex: number[][] = []
  public ignoreBuyOrders = false
  public isRealTime = false
  public current = 0
  public cache: any = {
    openOrders: 0,
    closedOrders: 0,
    lowestPrice: 999999,
  }

  public async run(bar: IBar): Promise<void> {
    this.addBar(bar)

    if (this.barIndex === 0) {
      this.initialCapitalCoin = this.initialCapital / this.bar.open
    }

    this.findNewBaseBarIndex()

    await this.addNewBase()

    await this.ignoreOpenPreorderTradeIfExceedsLimitBarWindow()

    await this.processBrokenBases()

    this.performanceCleanup()

    this.updateStatisticsOnTick()
  }

  public getBarByBarIndexOffset(barIndex: number): IBar {
    return this.bars[barIndex - this.barIndexOffset]
  }

  public sliceBarsByBarIndexOffset(start: number, end: number): IBar[] {
    return this.bars.slice(start - this.barIndexOffset, end - this.barIndexOffset)
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
          this.newBaseBarIndex = barIndex
          this.isNewBase = true

          // limit Max Simultaneous Broken Bases
          if (this.bases.filter((base) => base.isBroken).length >= MAX_SIMULTANEOUS_BROKEN_BASES) {
            this.isIgnoredBase = true
          }

          break
        }
      }
    }
  }

  public async ignoreOpenPreorderTradeIfExceedsLimitBarWindow() {
    if (!this.bases[0] || this.bases[0].isBroken) return

    const base = this.bases[0]

    if (base.barIndex <= this.barIndex - ORDER_OPEN_TRADE_WINDOW_BARS) {
      await this.cancelBaseOrders(base)

      this.bases.shift() // just testing / less order triggers / try without it
    }
  }

  private async addNewBase(): Promise<void> {
    if (!this.isNewBase) return

    const basePrice = this.getBarByBarIndexOffset(this.newBaseBarIndex).low

    const base = {
      barIndex: this.newBaseBarIndex,
      price: basePrice,
      quantity: 0,
      amount: 0,
      baseBrokenTime: null,
      baseBrokenBarIndex: 0,
      isBroken: false,
      isClosedInProfit: false,
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
      orders: [],

      takeProfitOrderId: v4(),
      stopLimitOrderId: v4(),

      binanceTakeProfit: undefined,
      binanceStopLoss: undefined,
    }

    if (this.bases[0]?.isBroken) {
      this.bases.unshift(base)
    } else {
      if (this.bases[0]) {
        await this.cancelBaseOrders(this.bases[0])
      }
      this.bases[0] = base
    }

    if (this.isIgnoredBase) {
      this.ignoredBases.push(base)
    } else {
      await this.openBaseOrders(base)
    }

    // Disable to increase performance
    // Enable to analyse and measure all detected bases
    // this.allBases.push(base)
  }

  private async openBaseOrders(base: IBase) {
    const orderDetails = {
      baseBarIndex: base.barIndex,
      status: ORDER_STATUS.NEW,
      timeOpen: null,
      timeClosed: null,
      barIndexOpen: null,
      barIndexClosed: null,
      takeProfit: base.takeProfit,
      breakEven: 999999,
      stopLoss: base.stopLoss,
      fee: 0,
      PNL: 0,
      feeCoin: 0,
      PNLCoin: 0,

      limitOrderId: undefined,
      binanceLimit: undefined,

      base: base,
    }

    for (let level = 1; level <= ORDER_NUMBER_OF_LEVELS; level++) {
      const price = round(
        base.price * (1 - ORDER_LEVEL_STEP * Math.pow(level, LEVEL_STEP_MULTIPLIER)),
      )

      base.levels.push(price)

      const order = {
        ...orderDetails,
        limitOrderId: v4(),
        quantity: 0,
        amount: 0,
        level: level,
        price: price,
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

      base.orders.push(order)
      this.orders.push(order)
    }

    await openBatchOrders(base.orders, ORDER_TYPE.LIMIT)
  }

  public async cancelBaseOrders(base: IBase) {
    const ordersToBeExecuted = base.orders.filter((order) => order.status === ORDER_STATUS.NEW)

    // set status to CANCELED before binance call, so it is not sent multiple times to binance. That removes error 'Unknown order sent.'
    ordersToBeExecuted.forEach((order) => (order.status = ORDER_STATUS.CANCELED))

    await cancelBatchOrders(ordersToBeExecuted, ORDER_TYPE.LIMIT)
  }

  private async processBrokenBases() {
    // const brokenBases = this.bases.filter(base => base.isBroken)
    //
    // for (const base of brokenBases) {
    //   await this.calculateBaseBreakEven(base)
    //
    //   // await this.setBaseRespected(base)
    // }

    this.bases
      .filter((base) => base.isClosedInProfit || base.isClosedInBreakEven || base.isClosedInLoss)
      .forEach((base) => {
        // base.PNL = [...this.orders, ...this.closedOrders]
        //   .filter(order => order.baseBarIndex === base.barIndex)
        //   .reduce((acc, order) => acc + order.PNL, 0)
        base.PNL = base.orders.reduce((acc, order) => acc + order.PNL, 0)
      })
  }

  public async calculateBaseBreakEven(base: IBase) {
    const currentBreakEven = base.breakEven

    const breakEvenTriggerPrice = base.price * (1 - ORDER_BREAK_EVEN_CLOSE_TRIGGER)

    const orders = base.orders.filter((order) => order.status === ORDER_STATUS.FILLED)
    const minExecutedOrderPrice = min(orders.map((order) => order.price))

    if (minExecutedOrderPrice > breakEvenTriggerPrice) return

    // --------------------------------------------
    // trigger cancel and reopen of TakeProfit orders only once:
    // when all regular TakeProfit orders have been placed on binance with status NEW

    // const binanceOrderFieldName = ORDER_TYPE_BINANCE_ORDER_FIELD[ORDER_TYPE.TAKE_PROFIT]

    // const ordersToBeExecuted = base.orders.filter(
    //   (order) =>
    //     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //     // @ts-ignore
    //     order[binanceOrderFieldName] &&
    //     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //     // @ts-ignore
    //     order[binanceOrderFieldName].orderStatus === ORDER_STATUS.NEW,
    // )

    if (sum(orders.map((order) => order.quantity)) !== base.quantity) return
    // --------------------------------------------
    // do not recalculate breakEven if at least one SELL LIMIT order in UNPROCESSED_ORDER_EVENT_STACK is triggered
    if (isTakeProfitOrderTriggered(base) || isStopLossOrderTriggered(base)) return
    // --------------------------------------------

    const BREAK_EVEN_TRIGGER = 0.5

    if (ORDER_BASE_TYPE === ORDER_BASE_TYPES.USDT) {
      const minOrderPrice = min(orders.map((order) => order.price))
      const maxOrderPrice = max(orders.map((order) => order.price))

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
      base.breakEven = round(average(orders.map((order) => order.price)) * (1 + TRADING_FEE * 2))
    }

    orders.forEach((order) => {
      order.breakEven = base.breakEven
      order.takeProfit = base.breakEven
    })

    if (currentBreakEven === base.breakEven) return

    await this.cancelTakeProfitOrder(orders[0])
    await this.openTakeProfitOrder(orders[0])
  }

  public async openStopLossOrder(order: IOrder) {
    const orderType = isStopLossOrderTriggered(order.base)
      ? ORDER_TYPE.MARKET
      : ORDER_TYPE.STOP_MARKET

    await openBatchOrders([order], orderType)
  }

  public async cancelStopLossOrder(order: IOrder) {
    await cancelBatchOrders([order], ORDER_TYPE.STOP_MARKET)
  }

  public async openTakeProfitOrder(order: IOrder) {
    await openBatchOrders([order], ORDER_TYPE.TAKE_PROFIT)
  }

  public async cancelTakeProfitOrder(order: IOrder) {
    return cancelBatchOrders([order], ORDER_TYPE.TAKE_PROFIT)
  }

  private performanceCleanup() {
    this.closedOrders.push(
      ...this.orders.filter((order) =>
        [ORDER_STATUS.COMPLETED, ORDER_STATUS.CLOSED, ORDER_STATUS.IGNORED].includes(order.status),
      ),
    )

    this.orders = this.orders.filter(
      (order) =>
        ![ORDER_STATUS.COMPLETED, ORDER_STATUS.CLOSED, ORDER_STATUS.IGNORED].includes(order.status),
    )

    this.closedBases.push(
      ...this.bases.filter(
        (base) => base.isClosedInProfit || base.isClosedInBreakEven || base.isClosedInLoss,
      ),
    )

    this.bases = this.bases.filter(
      (base) => !base.isClosedInProfit && !base.isClosedInBreakEven && !base.isClosedInLoss,
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
    // return this.closedOrders

    return this.closedOrders.filter((order) =>
      [ORDER_STATUS.COMPLETED, ORDER_STATUS.CLOSED].includes(order.status),
    )
  }

  public get ignoredTrades() {
    return this.closedOrders.filter((order) => order.status === ORDER_STATUS.IGNORED)
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
    return this.bases.filter((base) => base.isBroken)
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
    return this.ignoredBases.filter((base) => base.isBroken)
  }

  public get allIgnoredBrokenBasesCount() {
    return this.allIgnoredBrokenBases.length
  }

  public get allBrokenBases() {
    return this.closedBases.filter((base) => base.isBroken)
  }

  public get allBrokenBasesCount() {
    return this.allBrokenBases.length
  }

  public get closedInBreakEvenBases() {
    return this.closedBases.filter((base) => base.isClosedInBreakEven)
  }

  public get closedInBreakEvenBasesCount() {
    return this.closedInBreakEvenBases.length
  }

  public get closedInLossBases() {
    return this.closedBases.filter((base) => base.isClosedInLoss)
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
