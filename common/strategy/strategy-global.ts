import { IGlobalBase, IBar } from './index'
import { roundToPrecision, max, min, getHourlyTime, logger } from './utils'

import {
  BASE_RETRACEMENT_CONFIRMATION,
  BASE_PRECEDING_BARS,
  IGNORE_BASE_ON_TOP_PRECEDING_BARS,
  IGNORE_BASE_ON_TOP_THRESHOLD,
  BARS_UNTIL_BASE_CONFIRMATION_LIMIT,
} from './settings-global'

// const round = roundToPrecision(TICKER_PRECISION.ETH)
const round = roundToPrecision(2)

export default class GlobalStrategy {
  public bars: IBar[] = []
  public bar!: IBar
  public barIndex = -1
  public isNewBase = false
  public newBaseBarIndex = 0
  public bases: IGlobalBase[] = []
  public allBases: IGlobalBase[] = []
  public isRealTime = false
  public current = 0

  public run(bar: IBar): void {
    if (bar.time.getMinutes() === 0 && this.bar !== undefined) {
      this.bars.push({ ...this.bar })
      this.barIndex++
    }

    this.bar = this.getHourlyBar(bar)
    this.current = this.isRealTime ? this.bar.close : this.bar.low

    // this.logger.time('bar')

    // -- Debug --
    // if (this.barIndex === 440) {
    //   console.log('debug')
    // }

    // this.setBaseBroken()

    this.findNewBaseBarIndex()

    this.addNewBase()

    // this.calculateBaseBounceStopLoss()

    // this.processBrokenBases()

    // this.logger.timeEnd('bar')
  }

  public getHourlyBar(bar: IBar) {
    const isFirstBar = bar.time.getMinutes() === 0

    if (this.bar === undefined || isFirstBar) return { ...bar, time: getHourlyTime(bar.time) }

    return {
      time: getHourlyTime(bar.time),
      open: this.bar.open,
      high: max([bar.high, this.bar.high]),
      low: min([bar.low, this.bar.low]),
      close: bar.close,
      volume: this.bar.volume + bar.volume,
    }
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

  // private setBaseBroken() {
  //   this.bases
  //     .filter(base => !base.isBroken)
  //     .forEach(base => {
  //       base.isBroken = this.current <= base.levels[0]
  //     })
  // }

  private addNewBase(): void {
    if (!this.isNewBase) return

    const basePrice = this.bars[this.newBaseBarIndex].low

    const base = {
      barIndex: this.newBaseBarIndex,
      price: basePrice,
      // isBroken: false,
      // isRespected: false,
      stats: {
        percentDrop: 0,
        barsLength: 0,
      },
    }

    // if (this.bases[0]?.isBroken) {
    //   this.bases.unshift(base)
    // } else {
    //   this.bases[0] = base
    // }

    this.bases[0] = base

    this.allBases.push(base)
  }

  // private processBrokenBases() {
  //   this.bases
  //     .filter(base => base.isBroken)
  //     .forEach(base => {
  //       // this.updateBaseStats(base)
  //
  //       this.setBaseRespected(base)
  //     })
  //
  //   this.bases = this.bases.filter(base => !base.isRespected)
  // }

  public updateBaseStats(base: IGlobalBase) {
    const percentDrop = round((1 - this.current / base.price) * 100)
    const barsLength = this.barIndex - base.barIndex

    base.stats.percentDrop = Math.max(base.stats.percentDrop, percentDrop)
    // TODO: calculation of barsLength should start once BaseBroken. Currently starting bar is a BaseConfirmed
    base.stats.barsLength = Math.max(base.stats.barsLength, barsLength)
  }

  // private setBaseRespected(base: IGlobalBase) {
  //   const higherPrice = this.isRealTime ? this.bar.close : this.bar.high
  //
  //   const lowerPrice = this.current
  //
  //   const isBarLimitExceeded =
  //     BASE_BARS_LENGTH_LIMIT && this.barIndex - base.barIndex >= BASE_BARS_LENGTH_LIMIT
  //
  //   if (
  //     higherPrice >= base.takeProfit ||
  //     higherPrice >= base.emergencyTakeProfit ||
  //     lowerPrice <= base.stopLoss ||
  //     isBarLimitExceeded
  //   ) {
  //     base.isRespected = true
  //
  //     const closePrice =
  //       higherPrice >= base.takeProfit
  //         ? base.takeProfit
  //         : higherPrice >= base.emergencyTakeProfit
  //         ? base.emergencyTakeProfit
  //         : lowerPrice <= base.stopLoss
  //         ? base.stopLoss
  //         : this.bar.close
  //
  //     this.closeBaseOrders(base, closePrice)
  //
  //     if (higherPrice >= base.emergencyTakeProfit || lowerPrice <= base.stopLoss) {
  //       base.isClosedInLoss = true
  //     }
  //   }
  // }

  // Bases
  // public get brokenBases() {
  //   return this.bases.filter(base => base.isBroken)
  // }

  // public get brokenBasesCount() {
  //   return this.brokenBases.length
  // }

  public get allBasesCount() {
    return this.allBases.length
  }

  // public get allBrokenBases() {
  //   return this.allBases.filter(base => base.isBroken)
  // }

  // public get allBrokenBasesCount() {
  //   return this.allBrokenBases.length
  // }

  public statistics = {
    allBases: 0,
    // allBrokenBases: 0,
    // maxSimultaneousBrokenBases: 0,

    // baseDropMax: 0,
    // baseDropAvg: 0,
    // baseDropMedian: 0,
    //
    // baseBarsMax: 0,
    // brokenBaseBarsAvg: 0,
    // brokenBaseBarsMedian: 0,
  }

  public updateStatistics() {
    // Bases Statistics
    this.statistics.allBases = Math.max(this.statistics.allBases, this.allBasesCount)
    // this.statistics.allBrokenBases = Math.max(
    //   this.statistics.allBrokenBases,
    //   this.allBrokenBasesCount,
    // )

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
