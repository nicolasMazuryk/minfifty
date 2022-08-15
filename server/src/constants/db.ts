export enum ROLE {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum STATUS {
  NEW = 'NEW',
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
}

export enum TYPE_ACTION {
  confirmEmail = 'confirmEmail',
  resetPassword = 'resetPassword',
}

export const passwordMinLength = 7
