import { AnyAction, Dispatch, ActionCreator } from 'redux'
import { Selector } from 'reselect'

import { IApi } from '@/api'

import { IRootState } from './reducer'

export interface IAction extends AnyAction {
  type: string[] | string
  promise?: (api: IApi) => Promise<any>
  payload?: any
}

export default function apiMiddleware(api: IApi) {
  return ({
      dispatch,
      getState,
    }: {
      dispatch: Dispatch<IAction>
      getState: () => IRootState
    }) =>
    (next: Dispatch<IAction>) =>
    (action: IAction | ActionCreator<IAction>) => {
      if (typeof action === 'function') {
        return dispatch(
          action((selector: Selector<IRootState, any>) => selector(getState())),
        )
      }

      const { promise, type, ...rest } = action

      if (!promise) {
        return next(action)
      }

      const [REQUEST, SUCCESS, FAILURE] = type as string[]

      next({ ...rest, type: REQUEST })

      return promise(api).then(
        (data: object) => next({ ...rest, data, type: SUCCESS }),
        (error: Error) => next({ ...rest, error, type: FAILURE }),
      )
    }
}
