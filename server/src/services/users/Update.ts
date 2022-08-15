import { User } from '@/models'
import Base from '@/services/Base'
import X from '@/services/Exception'

interface IData {
  data: {
    username: string
  }
}

export default class UsersUpdate extends Base {
  static validationRules: ValidationRules<IData> = {
    data: [
      'required',
      {
        nested_object: {
          username: { min_length: 2 },
        },
      },
    ],
  }

  async execute({ data }: IData) {
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

    await user.update(data)

    return {
      data: user.json(),
    }
  }

  static paramsSecret = []

  static resultSecret = ['data.email', 'data.location']
}
