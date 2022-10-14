import { IApi } from '@/api'

export const prefix = 'chart'

export const GET_CHART_INDICATOR_REQUEST = `${prefix}/GET_CHART_INDICATOR_REQUEST`
export const GET_CHART_INDICATOR_SUCCESS = `${prefix}/GET_CHART_INDICATOR_SUCCESS`
export const GET_CHART_INDICATOR_FAILURE = `${prefix}/GET_CHART_INDICATOR_FAILURE`

export const getChartIndicator = () => ({
  type: [GET_CHART_INDICATOR_REQUEST, GET_CHART_INDICATOR_SUCCESS, GET_CHART_INDICATOR_FAILURE],
  promise: (api: IApi) => api.chart.getChartIndicator(),
})
