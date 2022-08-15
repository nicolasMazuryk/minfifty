import superagent, { Response } from 'superagent'

type IHTTPMethod = 'get' | 'options' | 'post' | 'put' | 'patch' | 'delete'

export default class ApiClient {
  prefix: string

  constructor(prefix: string) {
    if (!prefix) {
      throw new Error('[apiPrefix] required')
    }
    this.prefix = prefix
  }

  get(url: string, params: object = {}) {
    return this._request({ url, method: 'get', params })
  }

  post(url: string, body: object = {}) {
    return this._request({ url, method: 'post', body })
  }

  patch(url: string, body: object = {}) {
    return this._request({ url, method: 'patch', body })
  }

  put(url: string, body: object = {}) {
    return this._request({ url, method: 'put', body })
  }

  delete(url: string, body: object = {}) {
    return this._request({ url, method: 'delete', body })
  }

  _request({
    url,
    method,
    params,
    body,
  }: {
    url: string
    method: IHTTPMethod
    params?: object
    body?: object
  }) {
    const req = superagent[method](`${this.prefix}${url}`)

    if (params) {
      req.query(params)
    }
    if (body) {
      req.send(body)
    }

    return req.then((res: Response) => {
      if (!res.body.status) {
        throw res.body.error
      }
      return res.body.data
    })
  }
}
