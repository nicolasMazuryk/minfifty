import Sequelize, { InferAttributes, InferCreationAttributes } from 'sequelize'

import Base from './Base'

const { DataTypes } = Sequelize

export class MarketData extends Base<
  InferAttributes<MarketData>,
  InferCreationAttributes<MarketData>
> {
  static initialize(sequelize: Sequelize.Sequelize) {
    super.init<typeof Base, MarketData>(
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
      {
        sequelize,
        timestamps: false,
        tableName: 'market_data',
      },
    )
  }

  declare market: string
  declare ticker: string
  declare time: string
  declare timestamp: number
  declare open: string
  declare high: string
  declare low: string
  declare close: string
  declare volume: string
  declare timeClose: string
  declare timestampClose: number
  declare quoteAssetVolume: string
  declare trades: string
  declare takerBuyBaseAssetVolume: string
  declare takerBuyQuoteAssetVolume: string
}
