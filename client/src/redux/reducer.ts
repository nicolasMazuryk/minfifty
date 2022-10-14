import { combineReducers } from 'redux'

import chart, { IChartState } from './chart/reducer'
import profile, { IProfileState } from './profile/reducer'
import users, { IUsersState } from './users/reducer'

export interface IRootState {
  chart: IChartState
  profile: IProfileState
  users: IUsersState
}

export default () =>
  combineReducers<IRootState>({
    chart,
    profile,
    users,
  })
