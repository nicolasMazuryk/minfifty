import { START_PERIOD_TIME, END_PERIOD_TIME } from '@common/strategy/config'
import { Op } from 'sequelize'

import { MarketData } from '@/models'
import Base from '@/services/Base'

interface IData {
  symbol: string
  resolution: string
  from: number
  to: number
  countback: number
}

export default class History extends Base {
  static validationRules: ValidationRules<IData> = {
    symbol: ['required', 'string'],
    resolution: ['string'],
    from: ['positive_integer'],
    to: ['positive_integer'],
    countback: ['positive_integer'],
  }

  async execute(params: IData) {
    const { symbol, to, countback } = params

    const fromTimestamp = new Date(START_PERIOD_TIME).getTime()

    const endPeriodTime = new Date(END_PERIOD_TIME).getTime() / 1000

    const toTimestamp = to > endPeriodTime ? endPeriodTime : to

    const marketData = await MarketData.findAll({
      where: {
        ticker: symbol,
        timestamp: {
          // [Op.lt]: Math.floor(to * 1000),
          [Op.gte]: fromTimestamp,
          [Op.lte]: Math.floor(toTimestamp * 1000),
        },
      },
      limit: countback,
      order: [['time', 'DESC']],
      raw: true,
    })

    const result = marketData.reverse()

    return {
      s: 'ok',
      t: result.map(({ timestamp }) => Math.floor(timestamp / 1000)),
      o: result.map(({ open }) => open),
      h: result.map(({ high }) => high),
      l: result.map(({ low }) => low),
      c: result.map(({ close }) => close),
      v: result.map(({ volume }) => volume),
    }
  }

  static paramsSecret = []

  static resultSecret = []
}
