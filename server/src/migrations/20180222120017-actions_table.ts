import { BIGINT, DATE, ENUM, QueryInterface, STRING, JSON } from 'sequelize'

export const up = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async (transaction) =>
    queryInterface.createTable(
      'actions',
      {
        id: { type: BIGINT, primaryKey: true, autoIncrement: true },
        hash: { type: STRING, allowNull: false, unique: true },
        type: {
          type: ENUM,
          values: ['resetPassword', 'confirmEmail'],
        },
        data: { type: JSON },
        createdAt: { type: DATE },
        updatedAt: { type: DATE },
        deletedAt: { type: DATE },
      },
      { transaction },
    ),
  )

export const down = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async (transaction) =>
    queryInterface.dropTable('actions', { transaction }),
  )
