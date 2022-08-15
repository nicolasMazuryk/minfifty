import 'module-alias/register'

import app from './app'
import config from './config'
import logger from './logger'

app.listen(config.port)
logger.info(`APP STARTING AT PORT ${config.port}`)
