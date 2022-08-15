import Sequelize, {
  CreationOptional,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyCreateAssociationMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin,
  InferAttributes,
  InferCreationAttributes,
  NonAttribute,
  Association,
  DataTypes,
} from 'sequelize'

import Base from '@/models/Base'
import { User } from '@/models/User'

export class Company extends Base<InferAttributes<Company>, InferCreationAttributes<Company>> {
  declare id: CreationOptional<string>
  declare name: string
  declare location: CreationOptional<string>

  declare readonly createdAt: CreationOptional<Date>
  declare readonly updatedAt: CreationOptional<Date>
  declare readonly deletedAt: Date | null

  declare getUsers: HasManyGetAssociationsMixin<User> // Note the null assertions!
  declare addUser: HasManyAddAssociationMixin<User, User['id']>
  declare addUsers: HasManyAddAssociationsMixin<User, User['id']>
  declare setUsers: HasManySetAssociationsMixin<User, User['id']>
  declare removeUser: HasManyRemoveAssociationMixin<User, User['id']>
  declare removeUsers: HasManyRemoveAssociationsMixin<User, User['id']>
  declare hasUser: HasManyHasAssociationMixin<User, User['id']>
  declare hasUsers: HasManyHasAssociationsMixin<User, User['id']>
  declare countUsers: HasManyCountAssociationsMixin
  declare createUser: HasManyCreateAssociationMixin<User, 'companyId'>

  declare users?: NonAttribute<User[]>

  declare static associations: {
    users: Association<Company, User>
  }

  static initialize(sequelize: Sequelize.Sequelize) {
    super.init<typeof Base, Company>(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: { type: DataTypes.STRING },
        location: { type: DataTypes.STRING },
        createdAt: { type: DataTypes.DATE },
        updatedAt: { type: DataTypes.DATE },
        deletedAt: { type: DataTypes.DATE },
      },
      {
        sequelize,
        tableName: 'companies',
      },
    )
  }

  static attrs(type = 'default'): string[] {
    const attributes: {
      [key: string]: string[]
    } = {
      default: ['id', 'name', 'location'],
    }

    if (type in attributes) {
      return attributes[type]
    }

    return attributes.default
  }

  static associate(models: { [key: string]: any }) {
    models.User.belongsTo(models.Company, { foreignKey: 'companyId' })
    models.Company.hasMany(models.User, { foreignKey: 'companyId' })
  }
}
