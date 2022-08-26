import Sequelize, { QueryInterface } from 'sequelize'

const { DataTypes } = Sequelize

export const up = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(
    async (transaction) =>
      await queryInterface.createTable(
        'companies',
        {
          id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
          },
          username: { type: DataTypes.STRING },
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
    async (transaction) => await queryInterface.dropTable('companies', { transaction }),
  )
