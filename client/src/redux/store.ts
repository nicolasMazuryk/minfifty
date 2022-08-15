import { composeWithDevTools } from '@redux-devtools/extension'
import { createBrowserHistory } from 'history'
import { createStore, applyMiddleware, compose as simpleCompose } from 'redux'
import createSagaMiddleware from 'redux-saga'

import { IApi } from '@/api'

import apiMiddleware, { IAction } from './apiMiddleware'
import reducer, { IRootState } from './reducer'
import rootSaga from './sagas'

export const history = createBrowserHistory()

export default function configureStore(api: IApi) {
  const compose =
    process.env.NODE_ENV === 'production'
      ? simpleCompose
      : (composeWithDevTools as typeof simpleCompose)

  const sagaMiddleware = createSagaMiddleware()

  const store = createStore<IRootState, IAction, unknown, unknown>(
    reducer(),
    compose(applyMiddleware(apiMiddleware(api), sagaMiddleware)),
  )

  sagaMiddleware.run(() => rootSaga(history))

  return store
}
