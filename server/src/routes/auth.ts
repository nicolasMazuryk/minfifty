import { Request, Response, NextFunction } from 'express'

import AuthCheck from '@/services/auth/Check'
import AuthCreate from '@/services/auth/Create'
import { makeServiceRunner, runService, renderPromiseAsJson } from '@/tools'

export default {
  create: makeServiceRunner(AuthCreate, (req: Request) => req.body),

  async check(req: any, res: Response, next: NextFunction) {
    const promise = runService(AuthCheck, {
      params: {
        userId: req.session.userId,
      },
    })

    try {
      req.user = await promise

      return next()
    } catch (e) {
      return renderPromiseAsJson(req, res, promise, { token: '<secret>' })
    }
  },
  async logout(req: any, res: Response) {
    req.session.destroy()
    return res.send({ status: 1, data: 'success' })
  },
}
