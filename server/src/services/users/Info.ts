import { User } from '@/models'
import Base from '@/services/Base'
import X from '@/services/Exception'

export default class UsersInfo extends Base {
  async execute() {
    if (!this.context.id) {
      throw new X({
        code: 'NOT_FOUND',
        fields: {
          id: 'NOT_FOUND',
        },
      })
    }

    const user = await User.findById(this.context.id)

    if (!user) {
      throw new X({
        code: 'NOT_FOUND',
        fields: {
          id: 'NOT_FOUND',
        },
      })
    }

    return {
      data: user.json(),
    }
  }

  static paramsSecret = []

  static resultSecret = ['data.email', 'data.location']
}
