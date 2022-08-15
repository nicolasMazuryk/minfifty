export interface IResponseData {
  data: any
  status: number
}

export interface IResponseError {
  error: {
    code: string
    fields: object
    type?: string
    message?: string
    description?: string
  }
  status: number
}

export type IResponse = IResponseData & IResponseError
