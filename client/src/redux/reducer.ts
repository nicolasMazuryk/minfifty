import { combineReducers } from 'redux'

import profile, { IProfileState } from './profile/reducer'
import users, { IUsersState } from './users/reducer'

export interface IRootState {
  profile: IProfileState
  users: IUsersState
}

export default () =>
  combineReducers<IRootState>({
    profile,
    users,
  })
