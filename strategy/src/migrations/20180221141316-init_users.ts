import Sequelize, { QueryInterface } from 'sequelize'

const { DataTypes } = Sequelize

export const up = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(
    async (transaction) =>
      await queryInterface.createTable(
        'users',
        {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          email: { type: DataTypes.STRING, unique: true },
          username: { type: DataTypes.STRING },
          password: { type: DataTypes.STRING },
          status: {
            type: DataTypes.STRING,
            defaultValue: 'NEW',
          },
          role: {
            type: DataTypes.STRING,
            defaultValue: 'USER',
          },
          visibility: {
            type: DataTypes.STRING,
            defaultValue: 'PRIVATE',
          },
          avatar: { type: DataTypes.STRING },
          location: { type: DataTypes.STRING },
          createdAt: { type: DataTypes.DATE },
          updatedAt: { type: DataTypes.DATE },
          deletedAt: { type: DataTypes.DATE },
        },
        { transaction },
      ),
  )

export const down = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(
    async (transaction) => await queryInterface.dropTable('users', { transaction }),
  )
