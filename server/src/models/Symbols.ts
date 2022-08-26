import Sequelize, { InferAttributes, InferCreationAttributes } from 'sequelize'

import Base from './Base'

const { DataTypes } = Sequelize

export class Symbols extends Base<InferAttributes<Symbols>, InferCreationAttributes<Symbols>> {
  static initialize(sequelize: Sequelize.Sequelize) {
    super.init<typeof Base, Symbols>(
      {
        name: { type: DataTypes.STRING, primaryKey: true },
        market: { type: DataTypes.STRING },
        exchangeTraded: { type: DataTypes.STRING },
        exchangeListed: { type: DataTypes.STRING },
        timezone: { type: DataTypes.STRING },
        minmov: { type: DataTypes.INTEGER },
        minmov2: { type: DataTypes.INTEGER },
        pointvalue: { type: DataTypes.INTEGER },
        session: { type: DataTypes.STRING },
        hasIntraday: { type: DataTypes.BOOLEAN },
        hasNoVolume: { type: DataTypes.BOOLEAN },
        description: { type: DataTypes.STRING },
        type: { type: DataTypes.STRING },
        supportedResolutions: { type: DataTypes.ARRAY(DataTypes.STRING) },
        pricescale: { type: DataTypes.INTEGER },
        ticker: { type: DataTypes.STRING },
      },
      {
        sequelize,
        timestamps: false,
        tableName: 'symbols',
      },
    )
  }

  declare name: string
  declare market: string
  declare exchangeTraded: string
  declare exchangeListed: string
  declare timezone: string
  declare minmov: number
  declare minmov2: number
  declare pointvalue: number
  declare session: string
  declare hasIntraday: boolean
  declare hasNoVolume: boolean
  declare description: string
  declare type: string
  declare supportedResolutions: string[]
  declare pricescale: number
  declare ticker: string
}
