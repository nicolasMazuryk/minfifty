import { v1 as uuid } from 'uuid'

export const prefix = 'notify'

export const PUT_NOTIFICATION = `${prefix}/PUT_NOTIFICATION`
export const REMOVE_NOTIFICATION = `${prefix}/REMOVE_NOTIFICATION`

export const putNotification = (notification: object) => ({
  type: PUT_NOTIFICATION,
  payload: {
    notification: {
      ...notification,
      date: new Date().toISOString(),
      _id: uuid(),
    },
  },
})

export const removeNotification = (id: string) => ({
  type: REMOVE_NOTIFICATION,
  payload: {
    id,
  },
})
