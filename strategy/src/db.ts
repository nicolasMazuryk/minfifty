import Sequelize from 'sequelize'

import config from '@/config'
import * as list from '@/models/list'
import { MarketData } from '@/models/MarketData'

const sequelize = new Sequelize.Sequelize({
  ...config.postgres,
  define: { paranoid: true },
})

MarketData.initialize(sequelize)

const { models } = sequelize

for (const modelName in models) {
  const model = models[modelName]
  if ('associate' in model) {
    // @ts-expect-error because associate doesnt exist on type of model
    model.associate(models, sequelize)
  }
}

// sequelize.sync()

export default sequelize as any as Omit<typeof sequelize, '@/models'> & {
  models: typeof list
}
