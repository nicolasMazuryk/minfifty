import { Action } from 'redux'
import { takeEvery, put } from 'redux-saga/effects'

import { IResponse } from '@/interfaces/request'

import { PROFILE_FAILURE } from '../profile/actions'

import { putNotification } from './actions'

const DEFAULT_TYPE = 'USER_FLOW'

const toString = (obj: object) =>
  Object.entries(obj)
    .map(([key, val]) => `${key}: ${val}`)
    .join(', ')

function* notifyAction(action: IResponse & Action) {
  if (action.data && action.data.success) {
    const { message, description, type = DEFAULT_TYPE } = action.data.success

    alert(message)
    yield put(putNotification({ message, description, type }))
  }

  if (action.error && action.type !== PROFILE_FAILURE) {
    const { message, description, fields, type = DEFAULT_TYPE } = action.error

    alert(message || toString(fields))
    yield put(putNotification({ message, description, type }))
  }
}

export function* notify() {
  yield takeEvery('*', notifyAction)
}
