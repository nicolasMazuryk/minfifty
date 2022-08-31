import Sequelize, { InferAttributes, InferCreationAttributes } from 'sequelize'

import { COLOR } from '@/constants/chart'

import Base from './Base'

const { DataTypes } = Sequelize

export class Marks extends Base<InferAttributes<Marks>, InferCreationAttributes<Marks>> {
  static initialize(sequelize: Sequelize.Sequelize) {
    super.init<typeof Base, Marks>(
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
        text: { type: DataTypes.TEXT },
        label: { type: DataTypes.STRING },
        labelFontColor: {
          type: DataTypes.STRING,
          defaultValue: COLOR.WHITE,
        },
        minSize: { type: 'SMALLINT' },
      },
      {
        sequelize,
        timestamps: false,
        tableName: 'marks',
      },
    )
  }

  declare id: string
  declare market: string
  declare ticker: string
  declare time: string
  declare timestamp: number
  declare color: string
  declare text: string
  declare label: string
  declare labelFontColor: string
  declare minSize: number
}
