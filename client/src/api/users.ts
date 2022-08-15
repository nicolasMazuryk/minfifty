import Base from './base'

export default class Users extends Base {
  list(query?: object) {
    return this.apiClient.get('users', query)
  }

  show(id: string) {
    return this.apiClient.get(`users/${id}`)
  }
}
