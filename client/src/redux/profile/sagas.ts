import { History } from 'history'
import { put, takeEvery } from 'redux-saga/effects'

import { ROUTES } from '@/constants/routes'

import {
  LOGIN_SUCCESS,
  SIGNUP_SUCCESS,
  LOGOUT_SUCCESS,
  PROFILE_SUCCESS,
  loadProfile,
} from './actions'

export function* loginSuccess(history: History) {
  yield takeEvery(LOGIN_SUCCESS, function* () {
    yield put(loadProfile())

    yield history.push(ROUTES.HOME)
  })
}

export function* signupSuccess() {
  yield takeEvery(SIGNUP_SUCCESS, function* () {
    yield null
  })
}

export function* logoutSuccess(history: History) {
  yield takeEvery(LOGOUT_SUCCESS, () => {
    history.push(ROUTES.LOGIN)
  })
}

export function* profileSuccess() {
  yield takeEvery(PROFILE_SUCCESS, function* () {
    yield null
  })
}
