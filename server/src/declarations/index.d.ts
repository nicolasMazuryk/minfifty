declare module 'connect-multiparty'
declare module 'livr'
declare module 'livr-extra-rules'
declare module 'nodemailer-sendmail-transport'
declare module 'rename-keys'

declare namespace NodeJS {
  export interface ProcessEnv {
    NODE_LOGGER_TYPE: string
    HASH_SECRET: string
  }
}

declare namespace Express {
  export interface Request {
    user?: import('./models/User').User
  }
}

declare type ValidationRules<T> = {
  [K in keyof T]: any
}
