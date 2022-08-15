import { combineReducers } from 'redux'

import { IUser } from '@/interfaces/user'

import * as actions from './actions'

export interface IProfileState {
  loading: boolean
  user: IUser | null
  isConfirmed: boolean
  isRecoveryRequested: boolean
  error: object | null
  successfullyRegistered: boolean
  isChangedPwd: boolean
}

export default combineReducers<IProfileState>({
  loading(state = false, action) {
    switch (action.type) {
      case actions.PROFILE_REQUEST:
      case actions.LOGIN_REQUEST:
      case actions.LOGOUT_REQUEST:
      case actions.SIGNUP_REQUEST:
        return true
      case actions.PROFILE_SUCCESS:
      case actions.PROFILE_FAILURE:
      case actions.LOGIN_SUCCESS:
      case actions.LOGIN_FAILURE:
      case actions.LOGOUT_SUCCESS:
      case actions.LOGOUT_FAILURE:
      case actions.SIGNUP_SUCCESS:
      case actions.SIGNUP_FAILURE:
        return false
      default:
        return state
    }
  },
  user(state: IUser | null = null, action) {
    switch (action.type) {
      case actions.PROFILE_SUCCESS:
        return action.data
      case actions.LOGOUT_SUCCESS:
        return null
      default:
        return state
    }
  },
  isConfirmed(state = false, action) {
    switch (action.type) {
      case actions.CONFIRM_SUCCESS:
        return true
      default:
        return state
    }
  },
  isChangedPwd(state = false, action) {
    switch (action.type) {
      case actions.RESET_PASSWORD_REQUEST:
      case actions.RESET_PASSWORD_FAILURE:
        return false
      case actions.RESET_PASSWORD_SUCCESS:
        return true
      default:
        return state
    }
  },
  isRecoveryRequested(state = false, action) {
    switch (action.type) {
      case actions.PASSWORD_RECOVERY_REQUEST:
      case actions.PASSWORD_RECOVERY_FAILURE:
        return false
      case actions.PASSWORD_RECOVERY_SUCCESS:
        return true
      default:
        return state
    }
  },
  error(state = null, action) {
    switch (action.type) {
      case actions.LOGIN_FAILURE:
      case actions.LOGOUT_FAILURE:
      case actions.PASSWORD_RECOVERY_FAILURE:
      case actions.RESET_PASSWORD_FAILURE:
        return action.error
      default:
        return state
    }
  },
  successfullyRegistered(state = false, action) {
    switch (action.type) {
      case actions.SIGNUP_SUCCESS:
        return true
      case actions.RESET_SUCCESS_STATE:
        return false
      default:
        return state
    }
  },
})
