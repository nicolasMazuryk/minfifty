import { IChartIndicator } from '@common/strategy'
import { combineReducers } from 'redux'

import { GET_CHART_INDICATOR_SUCCESS } from './actions'

export interface IChartState {
  chartIndicator: IChartIndicator[]
}

export default combineReducers<IChartState>({
  chartIndicator(state = [], action) {
    switch (action.type) {
      case GET_CHART_INDICATOR_SUCCESS:
        return action.data
      default:
        return state
    }
  },
})
