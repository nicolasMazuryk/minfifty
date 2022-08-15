import { TYPE_ACTION } from '@/constants/db'
import { User, Action } from '@/models'
import Base from '@/services/Base'
import emailSender from '@/services/emailSender'
import X from '@/services/Exception'

interface IData {
  data: {
    username: string
    email: string
    password: string
  }
}

export default class UsersCreate extends Base {
  static validationRules: ValidationRules<IData> = {
    data: [
      'required',
      {
        nested_object: {
          username: ['required'],
          email: ['required', 'trim', 'email', 'to_lc'],
          password: 'required',
          confirmPassword: [
            'required',
            {
              equal_to_field: ['password'],
            },
          ],
        },
      },
    ],
  }

  async execute({ data }: IData) {
    const { username, email, password } = data
    if (
      await User.findOneWhere({
        email,
      })
    ) {
      throw new X({
        code: 'NOT_UNIQUE',
        fields: {
          email: 'NOT_UNIQUE',
        },
      })
    }

    const user = new User({
      username,
      email,
      password,
    })

    await user.save()

    const action = await new Action({
      type: TYPE_ACTION.confirmEmail,
      hash: Action.generateHash(),
      data: {
        userId: user.id,
        email: user.email,
      },
    }).save()

    await emailSender.send(TYPE_ACTION.confirmEmail, email, {
      hash: action.hash,
    })

    return {
      data: user.json(),
    }
  }

  static paramsSecret = ['data.email', 'data.password', 'data.confirmPassword']

  static resultSecret = ['data.email', 'data.location']
}
