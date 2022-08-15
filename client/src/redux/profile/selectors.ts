/* eslint-disable @typescript-eslint/no-shadow */
import { createSelector } from 'reselect'

import { USER_ROLES } from '@/constants/users'
import { IUser } from '@/interfaces/user'
import { IRootState } from '@/redux/reducer'

import { prefix } from './actions'

const profile = (state: IRootState) => state[prefix]

export const loading = createSelector(profile, ({ loading }) => loading)

export const error = createSelector(profile, ({ error }) => error)

export const successfullyRegistered = createSelector(
  profile,
  ({ successfullyRegistered }) => successfullyRegistered,
)

export const isChangedPwd = createSelector(
  profile,
  ({ isChangedPwd }) => isChangedPwd,
)

export const isRecoveryRequested = createSelector(
  profile,
  ({ isRecoveryRequested }) => isRecoveryRequested,
)

export const isConfirmed = createSelector(
  profile,
  ({ isConfirmed }) => isConfirmed,
)

export const user = createSelector(profile, ({ user }) => user || ({} as IUser))

export const role = createSelector(user, ({ role }) => role)

export const isAdmin = createSelector(
  user,
  ({ role }) => role === USER_ROLES.ADMIN,
)

export const isAuthenticated = createSelector(user, ({ id }) => Boolean(id))
