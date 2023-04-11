import Sequelize, { QueryInterface } from 'sequelize'

const { DataTypes } = Sequelize

export const up = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.createTable(
      'market_data',
      {
        market: { type: DataTypes.STRING },
        ticker: { type: DataTypes.STRING },
        time: {
          primaryKey: true,
          type: 'TIMESTAMP',
        },
        timestamp: {
          primaryKey: true,
          type: DataTypes.BIGINT,
        },
        open: { type: DataTypes.FLOAT },
        high: { type: DataTypes.FLOAT },
        low: { type: DataTypes.FLOAT },
        close: { type: DataTypes.FLOAT },
        volume: { type: DataTypes.FLOAT },
        timeClose: { type: 'TIMESTAMP' },
        timestampClose: { type: DataTypes.BIGINT },
        quoteAssetVolume: { type: DataTypes.FLOAT },
        trades: { type: DataTypes.INTEGER },
        takerBuyBaseAssetVolume: { type: DataTypes.FLOAT },
        takerBuyQuoteAssetVolume: { type: DataTypes.FLOAT },
      },
      { transaction },
    )

    await queryInterface.sequelize.query(
      `ALTER TABLE market_data ALTER COLUMN time TYPE timestamp with time zone;
            ALTER TABLE market_data ALTER COLUMN "timeClose" TYPE timestamp with time zone;`,
      {
        transaction,
      },
    )

    await queryInterface.sequelize.query("SELECT create_hypertable('market_data', 'time');", {
      transaction,
    })
  })

export const down = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async (transaction) => {
    await queryInterface.dropTable('market_data', { transaction })
  })
