// eslint-disable-next-line import/order
import './alias-runtime'

import express from 'express'

import middlewares from '@/middlewares'
import router from '@/router'

const app: express.Application = express()

app.use(middlewares.json)
app.use(middlewares.urlencoded)
app.use(middlewares.cors)
app.use(middlewares.multipart)
app.use(middlewares.session)
app.use('/api/v1', router)

export default app
