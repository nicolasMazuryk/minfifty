import * as bodyParser from 'body-parser'
import multipart from 'connect-multiparty'
import cors from 'cors'
import { Request, Response } from 'express'
import sessions from 'express-session'

import config from '@/config'

const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24

export default {
  json: bodyParser.json({
    limit: 1024 * 1024,
    verify: (req: Request, res: Response, buf: Buffer) => {
      try {
        JSON.parse(buf.toString())
      } catch (e) {
        res.send({
          status: 0,
          error: {
            code: 'BROKEN_JSON',
            message: 'Please, verify your json',
          },
        })
        throw new Error('BROKEN_JSON')
      }
    },
  }),
  urlencoded: bodyParser.urlencoded({
    extended: true,
  }),
  cors: cors({ origin: '*' }),
  multipart: multipart(),
  session: sessions({
    secret: config.sessionSecret,
    saveUninitialized: true,
    cookie: { maxAge: COOKIE_MAX_AGE },
    resave: false,
  }),
}
