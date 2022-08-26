import Sequelize, { QueryInterface } from 'sequelize'

import { COLOR } from '../constants/chart'

const { DataTypes } = Sequelize

export const up = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(
      'marks',
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
        },
        market: { type: DataTypes.STRING },
        ticker: { type: DataTypes.STRING },
        time: {
          type: 'TIMESTAMP',
          primaryKey: true,
        },
        timestamp: {
          primaryKey: true,
          type: 'BIGINT',
        },
        color: {
          type: DataTypes.STRING,
          defaultValue: COLOR.BLUE,
        },
        text: { type: DataTypes.TEXT },
        label: { type: DataTypes.STRING },
        labelFontColor: {
          type: DataTypes.STRING,
          defaultValue: COLOR.WHITE,
        },
        minSize: { type: 'SMALLINT' },
      },
      { transaction },
    )

    await queryInterface.sequelize.query("SELECT create_hypertable('marks', 'time');", {
      transaction,
    })
  })

export const down = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable('marks', { transaction })
  })
