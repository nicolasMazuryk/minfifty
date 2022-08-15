import config from '@/config'

import Auth from './auth'
import ApiClient from './client'
import Users from './users'
const apiClient: ApiClient = new ApiClient(config.apiPrefix)

export interface IApi {
  auth: Auth
  users: Users
  client: ApiClient
}

export default {
  auth: new Auth(apiClient),
  users: new Users(apiClient),
  client: apiClient,
}
