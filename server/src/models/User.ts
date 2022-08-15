import crypto from 'crypto'
import util from 'util'

import Sequelize, {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  ForeignKey,
  NonAttribute,
} from 'sequelize'

import config from '@/config'
import { ROLE, STATUS } from '@/constants/db'
import { Company } from '@/models/Company'

import Base from './Base'

const scrypt = util.promisify(crypto.scrypt)
const { DataTypes, Op } = Sequelize

const symbols = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*+-=?'

export class User extends Base<InferAttributes<User>, InferCreationAttributes<User>> {
  static ROLE = ROLE

  static STATUS = STATUS

  static initialize(sequelize: Sequelize.Sequelize) {
    super.init<typeof Base, User>(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        email: {
          type: DataTypes.STRING,
          unique: true,
        },
        username: {
          type: DataTypes.STRING,
        },
        password: {
          type: DataTypes.STRING,
        },
        status: {
          type: DataTypes.ENUM,
          values: Object.values(STATUS),
          defaultValue: this.STATUS.NEW,
        },
        role: {
          type: DataTypes.ENUM,
          values: Object.values(ROLE),
          defaultValue: this.ROLE.USER,
        },
        avatar: { type: DataTypes.STRING },
        location: { type: DataTypes.STRING },
        createdAt: { type: DataTypes.DATE },
        updatedAt: { type: DataTypes.DATE },
        deletedAt: { type: DataTypes.DATE },
      },
      {
        hooks: {
          beforeCreate: async (user: User) => {
            if (user.password) {
              user.password = await User.hashPassword(user.password)
            }
          },
          beforeUpdate: async (user: User) => {
            if (user.changed('password')) {
              user.password = await User.hashPassword(user.password)
            }
          },
        },
        sequelize,
        tableName: 'users',
      },
    )
  }

  static attrs(type = 'default'): string[] {
    const attributes: {
      [key: string]: string[]
    } = {
      default: ['id', 'username', 'email', 'status', 'role'],
    }

    if (type in attributes) {
      return attributes[type]
    }

    return attributes.default
  }

  static generatePassword(): string {
    return Array(10)
      .fill(1)
      .map(() => symbols[Math.floor(Math.random() * symbols.length)])
      .join('')
  }

  static async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(config.saltLength).toString('hex')
    const derivedKey = (await scrypt(password, salt, config.passwordHashKeyLength)) as Buffer

    return salt + ':' + derivedKey.toString('hex')
  }

  static findById(id: string): Promise<User | null> {
    return this.findOne({
      where: {
        id,
        status: {
          [Op.ne]: this.STATUS.BLOCKED,
        },
      },
    })
  }

  static info(id: string): Promise<User | null> {
    return this.findOne({
      where: {
        id,
        role: {
          [Op.ne]: this.ROLE.ADMIN,
        },
      },
    })
  }

  static list(): Promise<User[]> {
    return this.findAll({
      where: {
        role: {
          [Op.ne]: this.ROLE.ADMIN,
        },
      },
    })
  }

  declare id: CreationOptional<string>
  declare email: string
  declare username: string
  declare password: string
  declare status: CreationOptional<STATUS>
  declare role: CreationOptional<ROLE>
  declare avatar: CreationOptional<string>
  declare location: CreationOptional<string>

  declare companyId: ForeignKey<Company['id']>
  declare company?: NonAttribute<Company>

  declare readonly createdAt: CreationOptional<Date>
  declare readonly updatedAt: CreationOptional<Date>
  declare readonly deletedAt: Date | null

  async checkPassword(password: string): Promise<boolean> {
    const [salt, key] = this.get('password').split(':')
    const keyBuffer = Buffer.from(key, 'hex')
    const derivedKey = (await scrypt(password, salt, config.passwordHashKeyLength)) as Buffer

    return crypto.timingSafeEqual(keyBuffer, derivedKey)
  }
}
