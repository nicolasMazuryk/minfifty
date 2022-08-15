import { TYPE_ACTION } from '@/constants/db'
import { User, Action } from '@/models'
import Base from '@/services/Base'
import emailSender from '@/services/emailSender'
import X from '@/services/Exception'

interface IData {
  data: { email: string }
}

export default class UsersResetPassword extends Base {
  static validationRules: ValidationRules<IData> = {
    data: {
      nested_object: {
        email: ['required', 'email'],
      },
    },
  }

  async execute({ data: { email } }: IData) {
    const user = await User.findOneWhere({
      email,
    })

    if (!user) {
      throw new X({
        code: 'NOT_FOUND',
        fields: {
          email: 'NOT_FOUND',
        },
      })
    }

    if (user.status === User.STATUS.BLOCKED) {
      throw new X({
        code: 'BLOCKED_USER',
        fields: {
          email: 'BLOCKED_USER',
        },
      })
    }

    const action = await new Action({
      type: TYPE_ACTION.resetPassword,
      hash: Action.generateHash(),
      data: {
        userId: user.id,
        email: user.email,
      },
    }).save()

    await emailSender.send('resetPassword', user.email, { hash: action.hash })

    return {}
  }

  static paramsSecret = ['data.email']

  static resultSecret = []
}
