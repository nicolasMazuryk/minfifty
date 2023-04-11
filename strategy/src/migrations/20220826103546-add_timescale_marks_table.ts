import Sequelize, { QueryInterface } from 'sequelize'

import { COLOR } from '../constants/chart'

const { DataTypes } = Sequelize

export const up = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(
      'timescale_marks',
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
          type: DataTypes.BIGINT,
        },
        color: {
          type: DataTypes.STRING,
          defaultValue: COLOR.BLUE,
        },
        label: { type: DataTypes.STRING },
        tooltip: { type: DataTypes.TEXT },
      },
      { transaction },
    )

    await queryInterface.sequelize.query(
      `ALTER TABLE timescale_marks ALTER COLUMN time TYPE timestamp with time zone;`,
      {
        transaction,
      },
    )

    await queryInterface.sequelize.query("SELECT create_hypertable('timescale_marks', 'time');", {
      transaction,
    })
  })

export const down = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable('timescale_marks', { transaction })
  })
