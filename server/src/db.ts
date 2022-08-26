import Sequelize from 'sequelize'

import config from '@/config'
import { Action } from '@/models/Actions'
import { Company } from '@/models/Company'
import * as list from '@/models/list'
import { MarketData } from '@/models/MarketData'
import { Marks } from '@/models/Marks'
import { Symbols } from '@/models/Symbols'
import { TimescaleMarks } from '@/models/TimescaleMarks'
import { User } from '@/models/User'

const sequelize = new Sequelize.Sequelize({
  ...config.postgres,
  define: { paranoid: true },
})

Company.initialize(sequelize)
User.initialize(sequelize)
Action.initialize(sequelize)
MarketData.initialize(sequelize)
Marks.initialize(sequelize)
Symbols.initialize(sequelize)
TimescaleMarks.initialize(sequelize)

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
