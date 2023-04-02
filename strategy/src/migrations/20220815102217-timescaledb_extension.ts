import { QueryInterface } from 'sequelize'

export const up = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async () => {
    await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;')
  })

export const down = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async () => {
    await queryInterface.sequelize.query('DROP EXTENSION timescaledb;')
  })
