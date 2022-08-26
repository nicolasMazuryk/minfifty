import { Request, Response } from 'express'
import jp from 'jsonpath'

import logger, { ILogParams } from '@/logger'
import Exception from '@/services/Exception'

export interface IContext {
  id?: string
  role?: string
  ipAddress?: string | string[]
  userAgent?: string
  session?: Request['session']
}

const cleanup = (
  data: Record<string, unknown>,
  paths: any[],
  callback: (arg0: any, arg1: () => string) => any,
  replacer = () => '<secret>',
) =>
  Array.isArray(paths)
    ? paths.reduce((acc, path) => {
        jp.apply(acc, path.startsWith('[') ? `$${path}` : `$.${path}`, replacer)
        return acc
      }, cloneDeep(data))
    : callback(cloneDeep(data), replacer)

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const defaultParamsBuilder = (req: Request, res: Response) => ({})
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const defaultContextBuilder = (req: Request, res: Response): IContext => ({
  id: req.user?.id,
  role: req.user?.role,
  ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
  userAgent: req.headers['user-agent'],
  session: req.session,
})

export async function runService(
  service: any,
  { context = {}, params = {} }: { context?: IContext; params: Record<string, unknown> },
) {
  const startTime = Date.now()
  const actionName = service.name

  const cleanParams = cleanup(params, service.paramsSecret, service.paramsCleanup)
  try {
    const result = await new service({
      context,
    }).run(params)

    const cleanResult = cleanup(result, service.resultSecret, service.resultCleanup)

    logRequest({
      type: 'info',
      actionName,
      params: cleanParams,
      result: cleanResult,
      startTime,
      userId: context.id,
    })

    return result
  } catch (error) {
    if (error instanceof Exception) {
      logRequest({
        type: 'info',
        actionName,
        params: cleanParams,
        result: error,
        startTime,
      })
    } else {
      logRequest({
        type: 'error',
        actionName,
        params: cleanParams,
        result: error,
        startTime,
      })
    }

    throw error
  }
}

export function makeServiceRunner(
  service: any,
  paramsBuilder = defaultParamsBuilder,
  contextBuilder = defaultContextBuilder,
) {
  return async function serviceRunner(req: Request, res: Response) {
    const params = paramsBuilder(req, res)
    const cleanParams = cleanup(params, service.paramsSecret, service.paramsCleanup)
    const resultPromise = runService(service, {
      params,
      context: contextBuilder(req, res),
    })

    return renderPromiseAsJson(req, res, resultPromise, cleanParams)
  }
}

export async function renderPromiseAsJson(
  req: Request,
  res: Response,
  promise: Promise<any>,
  params: object,
) {
  try {
    const data = await promise

    return res.send(data)
  } catch (error: Error | Exception | unknown) {
    if (error instanceof Exception) {
      res.send({
        status: 0,
        error: error.toHash(),
      })
    } else {
      logger.error({
        REQUEST_URL: req.url,
        REQUEST_PARAMS: params,
        ERROR_STACK: error instanceof Error ? error.stack : '',
        ERROR_MESSAGE: error instanceof Error ? error.message : String(error),
      })

      res.send({
        status: 0,
        error: {
          code: 'SERVER_ERROR',
          message: 'Please, contact your system administrator!',
        },
      })
    }
  }
}

function cloneDeep<T = Record<string, unknown> | unknown[]>(data: T): T {
  return JSON.parse(JSON.stringify(data))
}

function logRequest({
  type,
  actionName,
  params,
  result,
  startTime,
  userId,
}: {
  type: string
  actionName: string
  params: any
  result: any
  startTime: number
  userId?: string
}) {
  defaultLogger(type, {
    service: actionName,
    runtime: Date.now() - startTime,
    params,
    result,
    userId,
  })
}

function defaultLogger(type: string, data: ILogParams) {
  const logMethods: { [key: string]: string } = {
    error: 'error',
    info: 'info',
    debug: 'debug',
  }

  const logMethodName = logMethods[type && type.toLowerCase()] || 'debug'

  logger[logMethodName](data)
}
