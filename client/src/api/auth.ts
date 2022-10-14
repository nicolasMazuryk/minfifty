import Base from './base'

export default class Auth extends Base {
  profile() {
    return this.apiClient.get('users/me')
  }

  login(email: string, password: string) {
    return this.apiClient.post('auth', { data: { email, password } })
  }

  signup(data: { username: string; email: string; password: string; confirmPassword: string }) {
    return this.apiClient.post('users', { data })
  }

  confirm(hash: string) {
    return this.apiClient.post(`actions/${hash}`)
  }

  resetPassword(email: string) {
    return this.apiClient.post('users/resetPassword', { data: { email } })
  }

  setPassword(hash: string, password: string, confirmPassword: string) {
    return this.apiClient.post(`actions/${hash}`, {
      data: { password, confirmPassword },
    })
  }

  async logout() {
    return this.apiClient.post('users/log-out')
  }
}
