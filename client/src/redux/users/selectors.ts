import { createSelector } from 'reselect'

import { IUser } from '@/interfaces/user'
import { IRootState } from '@/redux/reducer'

import { prefix } from './actions'

export const loading = (state: IRootState) => state[prefix].loading

export const list = (state: IRootState) => state[prefix].list

export const selectedId = (state: IRootState) => state[prefix].selected

export const selectedUser = createSelector(
  selectedId,
  list,
  (id, l) => l.find(u => u.id === id) || ({} as IUser),
)
