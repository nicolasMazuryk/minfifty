import { User } from '@/models'
import Base from '@/services/Base'
import X from '@/services/Exception'

interface IData {
  id: string
}

export default class UsersShow extends Base {
  static requiredPermissions = [User.ROLE.ADMIN]

  static validationRules: ValidationRules<IData> = {
    id: ['required'],
  }

  async execute({ id }: IData) {
    const user = await User.info(id)

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
