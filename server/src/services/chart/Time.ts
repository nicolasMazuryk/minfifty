import Base from '@/services/Base'

export default class Time extends Base {
  async execute() {
    return Math.round(Date.now() / 1000).toString()
  }

  static paramsSecret = []
  static resultSecret = []
}
