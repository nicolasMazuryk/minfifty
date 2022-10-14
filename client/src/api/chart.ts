import Base from './base'

export default class Chart extends Base {
  getChartIndicator(query?: object) {
    return this.apiClient.get('chart/indicator', query)
  }
}
