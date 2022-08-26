import crypto from 'crypto'

import Sequelize, { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize'

import { TYPE_ACTION } from '@/constants/db'
import X from '@/services/Exception'

import Base from './Base'
import { User } from './User'

const { DataTypes } = Sequelize

export class Action extends Base<InferAttributes<Action>, InferCreationAttributes<Action>> {
  static initialize(sequelize: Sequelize.Sequelize) {
    super.init<typeof Base, Action>(
      {
        id: {
          type: DataTypes.UUID,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4,
        },
        hash: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
        },
        type: {
          type: DataTypes.STRING,
        },
        data: { type: DataTypes.JSON },
        createdAt: { type: DataTypes.DATE },
        updatedAt: { type: DataTypes.DATE },
        deletedAt: { type: DataTypes.DATE },
      },
      {
        sequelize,
        tableName: 'actions',
      },
    )
  }

  static generateHash(): string {
    return crypto.randomBytes(20).toString('hex')
  }

  declare id: CreationOptional<string>
  declare hash: string
  declare type: TYPE_ACTION
  declare data: {
    [key: string]: any
  }

  declare readonly createdAt: CreationOptional<Date>
  declare readonly updatedAt: CreationOptional<Date>
  declare readonly deletedAt: Date | null

  run(data: any) {
    return this[this.type](data)
  }

  async confirmEmail(): Promise<User> {
    const user = await User.findOne({
      where: { id: this.data.userId },
    })

    if (!user) {
      throw new X({
        code: 'NOT_FOUND',
        fields: {
          id: 'NOT_FOUND',
        },
      })
    }

    return user.update({
      status: User.STATUS.ACTIVE,
    })
  }

  async resetPassword(externalData: { password: string }): Promise<User> {
    const user = await User.findOne({
      where: { id: this.data.userId },
    })

    if (!user) {
      throw new X({
        code: 'NOT_FOUND',
        fields: {
          id: 'NOT_FOUND',
        },
      })
    }

    user.password = externalData.password

    return user.save()
  }
}
