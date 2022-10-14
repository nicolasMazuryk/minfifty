import config from '@/config'

import Auth from './auth'
import Chart from './chart'
import ApiClient from './client'
import Users from './users'

const apiClient: ApiClient = new ApiClient(config.apiPrefix)

export interface IApi {
  auth: Auth
  chart: Chart
  users: Users
  client: ApiClient
}

export default {
  auth: new Auth(apiClient),
  chart: new Chart(apiClient),
  users: new Users(apiClient),
  client: apiClient,
}
