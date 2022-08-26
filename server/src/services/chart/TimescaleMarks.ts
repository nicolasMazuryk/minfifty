import { Op } from 'sequelize'

import { TimescaleMarks } from '@/models'
import Base from '@/services/Base'

interface IData {
  symbol: string
  resolution: string
  from: number
  to: number
}

export default class GetTimescaleMarks extends Base {
  static validationRules: ValidationRules<IData> = {
    symbol: ['required', 'string'],
    resolution: ['string'],
    from: ['positive_integer'],
    to: ['positive_integer'],
  }

  async execute(data: IData) {
    const { symbol, from, to } = data

    const timescaleMarks = await TimescaleMarks.findAll({
      where: {
        ticker: symbol,
        timestamp: {
          [Op.between]: [from * 1000, to * 1000],
        },
      },
      order: [['time', 'DESC']],
      raw: true,
    })

    const result = timescaleMarks.reverse()

    return {
      id: result.map(({ id }) => id),
      time: result.map(({ timestamp }) => Math.floor(timestamp / 1000)),
      color: result.map(({ color }) => color),
      label: result.map(({ label }) => label),
      tooltip: result.map(({ tooltip }) => tooltip),
    }
  }

  static paramsSecret = []

  static resultSecret = []
}
