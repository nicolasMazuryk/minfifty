import { History } from 'history'
import { all } from 'redux-saga/effects'

import { notify } from './notify/sagas'
import { loginSuccess, signupSuccess, logoutSuccess, profileSuccess } from './profile/sagas'
import { listFailure } from './users/sagas'

export default function* rootSaga(history: History) {
  yield all([
    loginSuccess(history),
    logoutSuccess(history),
    profileSuccess(),
    listFailure(history),
    signupSuccess(),
    notify(),
  ])
}
