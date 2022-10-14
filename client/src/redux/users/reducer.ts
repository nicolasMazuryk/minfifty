import { combineReducers } from 'redux'

import { IUser } from '@/interfaces/user'

import * as actions from './actions'

export interface IUsersState {
  loading: boolean
  selected: string | null
  list: IUser[]
}

export default combineReducers<IUsersState>({
  loading(state = false, action) {
    switch (action.type) {
      case actions.LIST_REQUEST:
        return true
      case actions.LIST_SUCCESS:
      case actions.LIST_FAILURE:
        return false
      default:
        return state
    }
  },
  selected(state: string | null = null, action) {
    switch (action.type) {
      case actions.SHOW_SUCCESS:
        return action.id
      case actions.HIDE:
        return null
      default:
        return state
    }
  },
  list(state: IUser[] = [], action) {
    switch (action.type) {
      case actions.LIST_SUCCESS:
        return action.data
      case actions.SHOW_REQUEST:
        return state.map(user => (user.id === action.id ? { ...user, loading: true } : user))
      case actions.SHOW_SUCCESS:
        return state.map(user => (user.id === action.id ? action.data : user))
      case actions.SHOW_FAILURE:
        return state.map(user => (user.id === action.id ? { ...user, loading: false } : user))
      default:
        return state
    }
  },
})
