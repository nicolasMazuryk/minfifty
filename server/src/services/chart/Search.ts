import { Op } from 'sequelize'

import { Symbols } from '@/models'
import Base from '@/services/Base'

interface IData {
  query: string
  type: string
  exchange: string
  limit: number
}

export default class Search extends Base {
  static validationRules: ValidationRules<IData> = {
    query: ['string'],
    type: ['string'],
    exchange: ['string'],
    limit: ['positive_integer'],
  }

  async execute(data: IData) {
    const { query, type, exchange, limit } = data
    const where: any = {}

    if (query) {
      where.ticker = {
        [Op.like]: `%${query}%`,
      }
    }

    if (type) {
      where.type = type
    }

    if (exchange) {
      where.exchange = exchange
    }

    const symbolsInfo = await Symbols.findAll({
      where,
      limit,
      raw: true,
    })

    if (!symbolsInfo?.length) return null

    const symbolsInfoMapped = symbolsInfo.map(
      ({
        name,
        exchangeTraded,
        exchangeListed,
        timezone,
        minmov,
        minmov2,
        pointvalue,
        session,
        hasIntraday,
        hasNoVolume,
        description,
        type,
        supportedResolutions,
        pricescale,
        ticker,
      }) => ({
        name,
        'exchange-traded': exchangeTraded,
        'exchange-listed': exchangeListed,
        timezone,
        minmov,
        minmov2,
        pointvalue,
        session,
        has_intraday: hasIntraday,
        has_no_volume: hasNoVolume,
        description,
        type,
        supported_resolutions: supportedResolutions,
        pricescale,
        ticker,
      }),
    )

    return symbolsInfoMapped
  }

  static paramsSecret = []

  static resultSecret = []
}
