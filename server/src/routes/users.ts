import { Request } from 'express'

import UsersCreate from '@/services/users/Create'
import UsersInfo from '@/services/users/Info'
import UsersList from '@/services/users/List'
import UsersResetPassword from '@/services/users/ResetPassword'
import ShowInfo from '@/services/users/Show'
import UsersUpdate from '@/services/users/Update'
import { makeServiceRunner } from '@/tools'

export default {
  create: makeServiceRunner(UsersCreate, (req: Request) => req.body),
  update: makeServiceRunner(UsersUpdate, (req: Request) => req.body),
  info: makeServiceRunner(UsersInfo),
  resetPassword: makeServiceRunner(UsersResetPassword, (req: Request) => req.body),
  list: makeServiceRunner(UsersList),
  show: makeServiceRunner(ShowInfo, (req: Request) => req.params),
}
