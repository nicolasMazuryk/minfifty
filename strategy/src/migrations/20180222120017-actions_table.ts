import Sequelize, { QueryInterface } from 'sequelize'

const { DataTypes } = Sequelize

export const up = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(
    async (transaction) =>
      await queryInterface.createTable(
        'actions',
        {
          id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
          hash: { type: DataTypes.STRING, allowNull: false, unique: true },
          type: {
            type: DataTypes.STRING,
          },
          data: { type: DataTypes.JSON },
          createdAt: { type: DataTypes.DATE },
          updatedAt: { type: DataTypes.DATE },
          deletedAt: { type: DataTypes.DATE },
        },
        { transaction },
      ),
  )

export const down = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(
    async (transaction) => await queryInterface.dropTable('actions', { transaction }),
  )
