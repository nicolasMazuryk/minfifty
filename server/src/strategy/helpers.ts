import Sequelize from 'sequelize'

import { MarketData } from '@/models'
import { IBar } from '@/strategy/index'

const { Op } = Sequelize

export const logger = {
  // eslint-disable-next-line no-console
  info: (...args: any) => console.log(...args),
  // eslint-disable-next-line no-console
  error: (...args: any) => console.error(...args),
}

export const roundToPrecision = (precision: number) => (value: number) =>
  Number(value.toFixed(precision))

export const median = (arr: any[]) => {
  const mid = Math.floor(arr.length / 2),
    nums = [...arr].sort((a, b) => a - b)
  // eslint-disable-next-line no-negated-condition
  return arr.length % 2 !== 0 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
}

export const getBacktestBars = async (
  market: string,
  ticker: string,
  startDate: string,
  endDate: string,
): Promise<IBar[]> => {
  const marketData = await MarketData.findAll({
    where: {
      market,
      ticker,
      time: {
        [Op.between]: [startDate, endDate],
      },
    },
    order: [['timestamp', 'ASC']],
    raw: true,
  })

  return marketData.map(({ time, open, high, low, close, volume }) => ({
    time,
    open: parseFloat(open),
    high: parseFloat(high),
    low: parseFloat(low),
    close: parseFloat(close),
    volume: parseFloat(volume),
  }))
}
