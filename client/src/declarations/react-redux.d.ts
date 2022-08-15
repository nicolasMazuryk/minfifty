/* eslint-disable @typescript-eslint/no-empty-interface */
import { EqualityFn } from 'react-redux'

import { IRootState } from '@/redux/reducer'

declare module 'react-redux' {
  declare interface DefaultRootState extends IRootState {}
  export declare const useSelector: <T>(
    selector: (state: IRootState) => T,
    equalityFn?: EqualityFn<T>,
  ) => T
}
