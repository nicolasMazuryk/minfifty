import Sequelize, { QueryInterface } from 'sequelize'

const { DataTypes } = Sequelize

export const up = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(
      'chart_indicator',
      {
        time: {
          primaryKey: true,
          type: 'TIMESTAMP',
        },
        timestamp: {
          primaryKey: true,
          type: DataTypes.BIGINT,
        },
        bases: { type: DataTypes.ARRAY(DataTypes.FLOAT) },
        brokenBases: { type: DataTypes.ARRAY(DataTypes.FLOAT) },
        respectedBases: { type: DataTypes.ARRAY(DataTypes.FLOAT) },
        buyOrders: { type: DataTypes.ARRAY(DataTypes.FLOAT) },
        sellOrders: { type: DataTypes.ARRAY(DataTypes.FLOAT) },
      },
      { transaction },
    )

    await queryInterface.sequelize.query("SELECT create_hypertable('chart_indicator', 'time');", {
      transaction,
    })
  })

export const down = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable('chart_indicator', { transaction })
  })
