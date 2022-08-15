import { DATE, ENUM, QueryInterface, STRING, UUID, UUIDV4 } from 'sequelize'

export const up = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async (transaction) =>
    queryInterface.createTable(
      'users',
      {
        id: {
          type: UUID,
          defaultValue: UUIDV4,
          primaryKey: true,
        },
        email: { type: STRING, unique: true },
        username: { type: STRING },
        password: { type: STRING },
        status: {
          type: ENUM,
          values: ['NEW', 'ACTIVE', 'BLOCKED'],
          defaultValue: 'NEW',
        },
        role: {
          type: ENUM,
          values: ['USER', 'ADMIN'],
          defaultValue: 'USER',
        },
        visibility: {
          type: ENUM,
          values: ['PUBLIC', 'PRIVATE'],
          defaultValue: 'PRIVATE',
        },
        avatar: { type: STRING },
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
    queryInterface.dropTable('users', { transaction }),
  )
