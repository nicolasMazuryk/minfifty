import Base from '@/services/Base'

export default class Config extends Base {
  async execute() {
    return {
      supports_search: true,
      supports_group_request: false,
      supports_marks: true,
      supports_timescale_marks: true,
      supports_time: true,
      exchanges: [
        { value: '', name: 'All Exchanges', desc: '' },
        { value: 'binance', name: 'BINANCE', desc: 'Binance Exchange' },
      ],
      symbols_types: [
        { name: 'All types', value: '' },
        { name: 'Crypto', value: 'crypto' },
        { name: 'Index', value: 'index' },
        { name: 'Stock', value: 'stock' },
        { name: 'Forex', value: 'forex' },
      ],
      supported_resolutions: ['1', '5', '15', '30', '60', '1D', '1W', '1M'],
    }
  }

  static paramsSecret = []
  static resultSecret = []
}
