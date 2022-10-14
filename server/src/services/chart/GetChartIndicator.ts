import { START_PERIOD_TIME, END_PERIOD_TIME } from '@common/strategy/config'
import { Op } from 'sequelize'

import { ChartIndicator } from '@/models'
import Base from '@/services/Base'

export default class GetChartIndicator extends Base {
  async execute() {
    const fromTimestamp = new Date(START_PERIOD_TIME).getTime()
    const endPeriodTime = new Date(END_PERIOD_TIME).getTime()

    const chartIndicator = await ChartIndicator.findAll({
      where: {
        timestamp: {
          [Op.gte]: fromTimestamp,
          [Op.lte]: endPeriodTime,
        },
      },
      order: [['time', 'DESC']],
      raw: true,
    })

    const result = chartIndicator.reverse()

    return result
  }

  static paramsSecret = []

  static resultSecret = []
}
