import { DATE, QueryInterface, STRING, UUID, UUIDV4 } from 'sequelize'

export const up = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async (transaction) =>
    queryInterface.createTable(
      'companies',
      {
        id: {
          type: UUID,
          defaultValue: UUIDV4,
          primaryKey: true,
        },
        username: { type: STRING },
        location: { type: STRING },
        createdAt: { type: DATE },
        updatedAt: { type: DATE },
        deletedAt: { type: DATE },
      },
      { transaction },
    ),
  )

export const down = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async (transaction) =>
    queryInterface.dropTable('companies', { transaction }),
  )
