import config from '@/config'
import { TYPE_ACTION } from '@/constants/db'
import { Action } from '@/models'
import Base from '@/services/Base'
import emailSender from '@/services/emailSender'
import X from '@/services/Exception'

export default class ActionsSubmit extends Base {
  async validate(data: { hash: string }) {
    const action = await Action.findOneWhere({
      hash: data.hash,
      deletedAt: null,
    })
    if (!action) {
      throw new X({
        code: 'NOT_FOUND',
        fields: {
          hash: 'INVALID',
        },
      })
    }

    const rulesRegistry: {
      [key: string]: object
    } = {
      resetPassword: {
        password: 'required',
        confirmPassword: [
          'required',
          {
            equal_to_field: ['password'],
          },
        ],
      },

      confirmEmail: {},
    }

    return this.doValidation(data, {
      ...rulesRegistry[action.type],
      hash: ['required'],
    })
  }

  async execute(data: { hash: string }) {
    const action = await Action.findOneWhere({
      hash: data.hash,
      deletedAt: null,
    })

    if (!action) {
      throw new X({
        code: 'NOT_FOUND',
        fields: {
          hash: 'INVALID',
        },
      })
    }

    await action.run(data)
    await action.destroy()

    if (action.type === TYPE_ACTION.resetPassword) {
      await emailSender.send('resetPasswordSuccess', action.data.email)
      return {}
    } else if (action.type === TYPE_ACTION.confirmEmail) {
      await emailSender.send('newUserRegistration', config.mail.adminEmail, {
        email: action.data.email,
      })
      return {}
    }

    return {}
  }

  static paramsSecret = ['password', 'confirmPassword']

  static resultSecret = []
}
