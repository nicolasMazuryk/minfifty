import { IChartIndicator } from '@common/strategy'
import { wait } from '@common/strategy/utils'

import api from '@/api'

import {
  CustomIndicator,
  // PineJS,
} from '../../charting_library'

// import { logger } from './strategy/helpers'

let chartIndicator: IChartIndicator[]

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
        this.init = async function (context, inputCallback) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this._context = context
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this._input = inputCallback

          chartIndicator = await api.chart.getChartIndicator()
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        this.main = async function (context, inputCallback) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this._context = context
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          this._input = inputCallback

          const { symbol } = context
          const { index } = symbol
          // const { time, open, high, low, close, volume, index } = symbol

          if (index < 0) {
            await wait(2000)
            return
          }

          if (index < 0) return

          const { bases, buyOrders, sellOrders } = chartIndicator[index]

          const result = [
            ...bases.slice(0, 5),
            ...Array(5 - bases.length).fill(undefined),
            ...buyOrders.slice(0, 5),
            ...Array(5 - buyOrders.length).fill(undefined),
            ...sellOrders.slice(0, 2),
            ...Array(2 - sellOrders.length).fill(undefined),
          ]

          return result
        }
      },
    },
  ])
