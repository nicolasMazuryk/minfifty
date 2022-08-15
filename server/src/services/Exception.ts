import pointer from 'json-pointer'
import rename from 'rename-keys'

export interface IException {
  fields: object
  code: string | number
  message?: string
}

export default class Exception extends Error {
  fields: object
  code: string | number
  message: string

  constructor({ fields: _fields, code, message = '' }: IException) {
    super()
    if (!_fields) throw new Error('FIELDS_REQUIRED')
    if (!code) throw new Error('MESSAGE_REQUIRED')

    const fields = pointer.dict(_fields)

    this.fields = rename(fields, (str: string) => str.substr(1))

    this.code = code
    this.message = message
  }

  toHash() {
    return {
      fields: this.fields,
      code: this.code,
    }
  }
}
