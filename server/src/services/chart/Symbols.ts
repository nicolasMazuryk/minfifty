import { Symbols } from '@/models'
import Base from '@/services/Base'

interface IData {
  symbol: string
}

export default class GetSymbols extends Base {
  static validationRules: ValidationRules<IData> = {
    symbol: ['required', 'string'],
  }

  async execute(data: IData) {
    const { symbol } = data

    const symbolInfo = await Symbols.findOne({
      where: {
        ticker: symbol,
      },
      raw: true,
    })

    if (!symbolInfo) return null

    const {
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
    } = symbolInfo

    return {
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
    }
  }

  static paramsSecret = []

  static resultSecret = []
}
