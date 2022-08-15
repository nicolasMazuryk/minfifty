import { User } from '@/models'
import Base from '@/services/Base'

export default class UsersList extends Base {
  static requiredPermissions = [User.ROLE.ADMIN]

  async execute() {
    const users = await User.list()

    return {
      data: users.map((user) => user.json()).filter((user) => user.id !== this.context.id),
    }
  }

  static paramsSecret = []

  static resultSecret = ['data[*].email', 'data[*].location']
}
