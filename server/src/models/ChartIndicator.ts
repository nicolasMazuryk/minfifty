import Sequelize, { InferAttributes, InferCreationAttributes } from 'sequelize'

import Base from './Base'

const { DataTypes } = Sequelize

export class ChartIndicator extends Base<
  InferAttributes<ChartIndicator>,
  InferCreationAttributes<ChartIndicator>
> {
  static initialize(sequelize: Sequelize.Sequelize) {
    super.init<typeof Base, ChartIndicator>(
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
      {
        sequelize,
        timestamps: false,
        tableName: 'chart_indicator',
      },
    )
  }

  declare time: Date
  declare timestamp: number
  declare bases: number[]
  declare brokenBases: number[]
  declare respectedBases: number[]
  declare buyOrders: number[]
  declare sellOrders: number[]
}
