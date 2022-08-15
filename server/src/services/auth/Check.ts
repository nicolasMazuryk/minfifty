import { User } from '@/models'
import Base from '@/services/Base'
import X from '@/services/Exception'

interface IData {
  userId: string
}

export default class AuthCheck extends Base {
  static validationRules: ValidationRules<IData> = {
    userId: ['required'],
  }

  async execute({ userId }: IData) {
    try {
      const user = await User.findById(userId)

      if (!user) throw new Error('NOT_VALID_USER')

      return {
        id: user.id,
        role: user.role,
      }
    } catch (e) {
      throw new X({
        code: 'PERMISSION_DENIED',
        fields: {
          data: 'User is not authorized',
        },
      })
    }
  }

  static paramsSecret = ['userId']

  static resultSecret = []
}
