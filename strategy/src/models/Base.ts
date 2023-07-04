import _ from 'lodash'
import Sequelize, { Attributes, ModelStatic, WhereOptions } from 'sequelize'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export default class Base<M, C> extends Sequelize.Model<M, C> {
  static findOneWhere<T extends Sequelize.Model>(
    this: ModelStatic<T>,
    where: WhereOptions<Attributes<Sequelize.Model<T>>>,
  ) {
    return this.findOne({ where })
  }
  json(fields = (this.constructor as any).attrs()): { [key: string]: any } {
    return _.pick(this.toJSON(), fields)
  }
}
