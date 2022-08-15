import assert from 'assert'

import supertest from 'supertest'

import app from '@/app'

import TestFactory from '../TestFactory'

const factory = new TestFactory()
const request = supertest.agent(app)

describe('User Create', () => {
  beforeAll(async () => {
    await factory.waitForReady()
    await factory.cleanup()
    await factory.setDefaultUsers()
  })

  it('Positive: Create user', () =>
    request
      .post('/api/v1/users')
      .send({
        data: {
          username: 'john',
          email: 'testuser@gmail.com',
          password: '123456',
          confirmPassword: '123456',
        },
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        assert.ok(res.body.status)
      }))

  it('Negative: Create with not unique email', () =>
    request
      .post('/api/v1/users')
      .send({
        data: {
          username: 'john',
          email: 'user1@gmail.com',
          password: '123456',
          confirmPassword: '123456',
        },
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        assert.deepEqual(res.body, {
          status: 0,
          error: {
            code: 'NOT_UNIQUE',
            fields: {
              email: 'NOT_UNIQUE',
            },
          },
        })
      }))

  it('Negative: Create without confirmPassword', () =>
    request
      .post('/api/v1/users')
      .send({
        data: {
          username: 'john',
          email: 'user1@gmail.com',
          password: '123456',
        },
      })
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((res) => {
        assert.deepEqual(res.body, {
          status: 0,
          error: {
            code: 'FORMAT_ERROR',
            fields: {
              'data/confirmPassword': 'REQUIRED',
            },
          },
        })
      }))

  afterAll(async () => {
    try {
      await factory.cleanup()
    } catch (e) {
      console.error(e) // eslint-disable-line no-console
      throw e
    }
  })
})
