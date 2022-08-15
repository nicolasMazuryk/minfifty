import * as dotenv from 'dotenv-safe'

import dbConfig from './dbConfig'

const isDev: boolean = !process.env.NODE_ENV || process.env.NODE_ENV === 'development'

dotenv.config({ allowEmptyValues: isDev })

export default {
  port: process.env.API_PORT,
  ws: process.env.WS_PORT,
  secret: process.env.HASH_SECRET,
  saltLength: 16,
  passwordHashKeyLength: 64,
  mainUrl: process.env.BASE_URL,
  sessionSecret: process.env.SESSION_SECRET || '',
  mail: {
    adminEmail: process.env.ADMIN_EMAIL || '',
    from: process.env.USER_EMAIL || '',
    transport_options: {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : undefined,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    },
    transport: process.env.EMAIL_TRANSPORT_TYPE,
    smtp: `smtp://${process.env.EMAIL_USER}:${process.env.EMAIL_PASSWORD}@${
      process.env.EMAIL_HOST
    }:${process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 2525}/?pool=true`,
  },
  ...dbConfig,
} as const
