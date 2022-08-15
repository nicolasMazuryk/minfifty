import { User } from '@/models'
import Base from '@/services/Base'
import X from '@/services/Exception'

interface IData {
  data: {
    email: string
    password: string
  }
}

export default class AuthCreate extends Base {
  static validationRules: ValidationRules<IData> = {
    data: [
      'required',
      {
        nested_object: {
          email: ['required', 'trim', 'email', 'to_lc'],
          password: 'required',
        },
      },
    ],
  }

  async execute({ data: { email, password } }: IData) {
    const user = await User.findOneWhere({
      email,
    })

    if (!user || !(await user.checkPassword(password))) {
      throw new X({
        code: 'AUTHENTICATION_FAILED',
        fields: {
          email: 'INVALID',
          password: 'INVALID',
        },
      })
    }

    if (user.status !== User.STATUS.ACTIVE) {
      throw new X({
        code: 'NOT_ACTIVE_USER',
        fields: {
          status: 'NOT_ACTIVE_USER',
        },
      })
    }
    if (this.context.session && this.context.session.userId) {
      this.context.session.userId = user?.id
    }

    return {
      data: 'Successfully logged in',
      status: 200,
    }
  }

  static paramsSecret = ['data.email', 'data.password']

  static resultSecret = ['data']
}
