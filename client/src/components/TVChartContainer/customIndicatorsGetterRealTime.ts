import { ORDER_STATUS } from '@common/strategy/constants'
import Strategy from '@common/strategy/strategy'

import {
  CustomIndicator,
  // PineJS,
} from '../../charting_library'

// import { logger } from './strategy/helpers'

const strategy = new Strategy()

const createPlots = (linePlots: number, shapePlots: number) => {
  const plots = []
  for (let i = 0; i < linePlots + shapePlots; i++) {
    plots.push({
      id: `plot_${i}`,
      type: i < linePlots ? 'line' : 'shapes',
    })
  }
  return plots
}

const createPlotStyles = (linePlots: number, shapePlotsBuy: number, shapePlotsSell: number) => {
  const styles = {}

  const lineStyle = {
    visible: true,
    plottype: 6, // circle
    color: '#003387',
    linestyle: 0,
    linewidth: 2,
    trackPrice: false,
  }

  const shapeStyle = {
    visible: true,
    location: 'Absolute',
    size: 'tiny',
  }

  const shapeStyleBuy = {
    ...shapeStyle,
    plottype: 'shape_label_up',
    color: '#060acf',
    textColor: '#060acf',
    text: 'Buy',
  }

  const shapeStyleSell = {
    ...shapeStyle,
    plottype: 'shape_label_down',
    color: '#bb06cf',
    textColor: '#bb06cf',
    text: 'Sell',
  }

  for (let i = 0; i < linePlots + shapePlotsBuy + shapePlotsSell; i++) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    styles[`plot_${i}`] =
      i < linePlots ? lineStyle : i < linePlots + shapePlotsBuy ? shapeStyleBuy : shapeStyleSell
  }
  return styles
}

export const customIndicatorsGetterRealTime = (): // pineJS: PineJS,
// PineJS: PineJS,
Promise<readonly CustomIndicator[]> =>
  Promise.resolve([
    {
      name: 'Base Strategy',
      metainfo: {
        _metainfoVersion: 51,

        id: 'baseStrategy@tv-basicstudies-1',
        name: 'BaseStrategy',
        description: 'Base Strategy Description',
        shortDescription: 'baseStrategy',

        isCustomIndicator: true,
        is_hidden_study: false,
        is_price_study: true,
        linkedToSeries: true,

        isTVScript: false,
        isTVScriptStub: false,

        format: {
          type: 'price',
          precision: 2,
        },
        inputs: [],
        plots: createPlots(5, 7),
        styles: createPlotStyles(5, 5, 2),
      },
      constructor: function () {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.main = function (context, inputCallback) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this._context = context
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this._input = inputCallback

          const { symbol } = context
          const { time, open, high, low, close, volume, index } = symbol

          if (index < 0) return

          const bar = { time, open, high, low, close, volume }

          // debugger

          bar.time = new Date(bar.time)

          strategy.run(bar)

          const lines = strategy.bases.map(base => base.price).slice(0, 5)

          // const lines = strategy.bases.map(base => ({
          //   value: base.price,
          //   offset: index,
          // }))

          const buyOrders = strategy.orders
            .filter(order => order.status === ORDER_STATUS.FILLED)
            .filter(order => order.timeOpen === bar.time)
            .map(order => order.price)
            .slice(0, 5)

          const sellOrders = strategy.orders
            .filter(order => [ORDER_STATUS.COMPLETED, ORDER_STATUS.CLOSED].includes(order.status))
            .filter(order => order.timeClosed === bar.time)
            .map(order => order.takeProfit)
            .slice(0, 2)

          const result = [
            ...lines,
            ...Array(5 - lines.length).fill(undefined),
            ...buyOrders,
            ...Array(5 - buyOrders.length).fill(undefined),
            ...sellOrders,
            ...Array(2 - sellOrders.length).fill(undefined),
          ]

          return result
        }
      },
    },
  ])
