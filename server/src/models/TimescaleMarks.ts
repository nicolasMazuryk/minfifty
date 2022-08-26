import Sequelize, { InferAttributes, InferCreationAttributes } from 'sequelize'

import { COLOR } from '@/constants/chart'

import Base from './Base'

const { DataTypes } = Sequelize

export class TimescaleMarks extends Base<
  InferAttributes<TimescaleMarks>,
  InferCreationAttributes<TimescaleMarks>
> {
  static initialize(sequelize: Sequelize.Sequelize) {
    super.init<typeof Base, TimescaleMarks>(
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
        label: { type: DataTypes.STRING },
        tooltip: { type: DataTypes.TEXT },
      },
      {
        sequelize,
        timestamps: false,
        tableName: 'timescale_marks',
      },
    )
  }

  declare id: string
  declare market: string
  declare ticker: string
  declare time: string
  declare timestamp: number
  declare color: string
  declare label: string
  declare tooltip: string
}
