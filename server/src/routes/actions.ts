import { Request } from 'express'

import ActionsSubmit from '@/services/actions/Submit'
import { makeServiceRunner } from '@/tools'

export default {
  submit: makeServiceRunner(ActionsSubmit, (req: Request) => ({
    ...(req.body.data || {}),
    hash: req.params.hash,
  })),
}
