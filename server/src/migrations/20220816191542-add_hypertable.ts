import { QueryInterface } from 'sequelize'

export const up = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async () => {
    queryInterface.sequelize.query("SELECT create_hypertable('market_data', 'time');")
  })

export const down = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async () => {
    // here go all migration's undo changes
  })
