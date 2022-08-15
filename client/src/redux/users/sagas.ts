import { History } from 'history'
import { Action } from 'redux'
import { takeEvery } from 'redux-saga/effects'

import { ERROR_CODES } from '@/constants/errors'
import { ROUTES } from '@/constants/routes'
import { IResponse } from '@/interfaces/request'

import { LIST_FAILURE } from './actions'

export function* listFailure(history: History) {
  yield takeEvery(LIST_FAILURE, function* (data: IResponse & Action) {
    if (data.error && data.error.code === ERROR_CODES.PERMISSION_DENIED) {
      yield history.push(ROUTES.HOME)
    }
  })
}
