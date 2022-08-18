const fs = require('fs')

const sequelizerc = require('../.sequelizerc')

const args = process.argv.slice(2)

if (args.length !== 1) {
  console.log('Wrong arguments! Usage:\nnpm run migration:generate <name>')
  process.exit(1)
}

if (!sequelizerc['migrations-path']) {
  console.log('Please, set "migrations-path" in .sequelizerc')
  process.exit(1)
}

if (!fs.existsSync(sequelizerc['migrations-path'])) {
  fs.mkdirSync(sequelizerc['migrations-path'])
  console.log('Created migrations directory')
}

// Convert from e.g. 2022-08-08T15:42:43.595Z to 20220808154243
const dateFormatted = new Date().toISOString().replaceAll(/[T\-:]|(\..+)/g, '')
const name = args[0]
const path = sequelizerc['migrations-path'] + `/${dateFormatted}-${name}.ts`

const template = `import { QueryInterface } from 'sequelize';

export const up = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async (transaction) => {
    // here go all migration changes
  })

export const down = (queryInterface: QueryInterface): Promise<void> =>
  queryInterface.sequelize.transaction(async (transaction) => {
    // here go all migration undo changes
  })
`

fs.writeFileSync(path, template)

console.log(`Migration successfully created!\n\nPath:\n\n${path}`)
