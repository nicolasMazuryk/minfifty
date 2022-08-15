import { CreationAttributes } from 'sequelize'

import { STATUS } from '@/constants/db'
import db from '@/db'
import { User } from '@/models'
import { User as UserClass } from '@/models/User'

let idReady = false

export default class TestFactory {
  constructor() {
    // Additional protection against running test on production db
    if (!db.config.database.match(/test$/i)) {
      throw new Error(`DATABASE [${db.config.database}] DOES NOT HAVE "test" IN ITS NAME`)
    }
  }

  waitForReady() {
    return new Promise<void>((res) => {
      if (idReady) return res()
      db.afterBulkSync(() => {
        idReady = true
        res()
      })
    })
  }

  async createUser(data: CreationAttributes<UserClass>) {
    const user = new User(data)
    return user.save()
  }

  async setDefaultUsers() {
    const users = [
      {
        username: 'user1',
        email: 'user1@gmail.com',
        password: 'password1',
        status: STATUS.ACTIVE,
      },
      {
        username: 'user2',
        email: 'user2@gmail.com',
        password: 'password2',
        status: STATUS.BLOCKED,
      },
    ]

    return Promise.all(users.map(this.createUser))
  }

  cleanup() {
    return db.sync({ force: true })
  }
}
