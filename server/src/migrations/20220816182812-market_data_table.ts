import Sequelize, { QueryInterface } from 'sequelize'

const { DataTypes } = Sequelize

export const up = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async (transaction) => {
    queryInterface.createTable(
      'market_data',
      {
        market: { type: DataTypes.STRING },
        ticker: { type: DataTypes.STRING },
        time: {
          primaryKey: true,
          type: 'TIMESTAMP',
        },
        open: { type: DataTypes.FLOAT },
        high: { type: DataTypes.FLOAT },
        low: { type: DataTypes.FLOAT },
        close: { type: DataTypes.FLOAT },
        volume: { type: DataTypes.FLOAT },
        timeClose: { type: 'TIMESTAMP' },
        quoteAssetVolume: { type: DataTypes.FLOAT },
        trades: { type: DataTypes.INTEGER },
        takerBuyBaseAssetVolume: { type: DataTypes.FLOAT },
        takerBuyQuoteAssetVolume: { type: DataTypes.FLOAT },
      },
      { transaction },
    )
  })

export const down = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async (transaction) => {
    queryInterface.dropTable('market_data', { transaction })
  })
