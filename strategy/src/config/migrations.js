const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development'

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv-safe').config({ allowEmptyValues: isDev })

module.exports = {
  username: process.env.SQL_USER,
  password: process.env.SQL_PASS || '',
  database: process.env.SQL_DB,
  host: process.env.SQL_HOST,
  port: process.env.SQL_PORT,
  dialect: 'postgres',
}
