import LIVR from 'livr'
import extraRules from 'livr-extra-rules'

import { IContext } from '@/tools'

import Exception from './Exception'
import rules from './validationRules'

LIVR.Validator.registerDefaultRules(extraRules)
LIVR.Validator.registerDefaultRules(rules)

export default class Base {
  public context: IContext
  constructor(args: { context: IContext }) {
    if (!args.context) throw new Error('CONTEXT_REQUIRED')
    this.context = args.context

    for (const [method, fields] of [
      ['paramsCleanup', 'paramsSecret'],
      ['resultCleanup', 'resultSecret'],
    ]) {
      if (
        typeof (this as any).constructor[method] !== 'function' &&
        !Array.isArray((this as any).constructor[fields])
      ) {
        throw new Error(
          `Service ${this.constructor.name} needs '${method}' method` +
            ` or '${fields}' list to be implemented.` +
            ' It is used for filtering sensitive data from being logged',
        )
      }
    }
  }

  async run(params: object) {
    await this.checkPermissions()
    const cleanParams = await this.validate(params)
    return (this as any).execute(cleanParams)
  }

  async checkPermissions() {
    const role = this.context.role
    const permissions = (this as any).constructor.requiredPermissions

    if (permissions && !permissions.includes(role)) {
      throw new Exception({
        code: 'PERMISSION_DENIED',
        fields: { role },
      })
    }
  }

  validate(data: object) {
    // Cache validator
    const validator =
      (this as any).constructor.validator ||
      new LIVR.Validator((this as any).constructor.validationRules).prepare()
    ;(this as any).constructor.validator = validator

    return this._doValidationWithValidator(data, validator)
  }

  doValidation(data: object, rules: object) {
    const validator = new LIVR.Validator(rules).prepare()
    return this._doValidationWithValidator(data, validator)
  }

  _doValidationWithValidator(
    data: object,
    validator: {
      validate(data: object): object
      getErrors(): object
    },
  ) {
    const result = validator.validate(data)

    if (!result) {
      const exception = new Exception({
        code: 'FORMAT_ERROR',
        fields: validator.getErrors(),
      })

      return Promise.reject(exception)
    }

    return Promise.resolve(result)
  }
}
