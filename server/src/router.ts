import express, { Router } from 'express'

import routes from '@/routes'

const router: Router = express.Router()

const checkAuth = routes.auth.check

router.post('/auth', routes.auth.create)
router.post('users/log-out', routes.auth.logout)

router.post('/actions/:hash', routes.actions.submit)

router.get('/users/me', checkAuth, routes.users.info)
router.get('/users', checkAuth, routes.users.list)
router.get('/users/:id', checkAuth, routes.users.show)
router.post('/users', routes.users.create)
router.post('/users/resetPassword', routes.users.resetPassword)
router.put('/users', checkAuth, routes.users.update)

router.get('/chart/config', routes.chart.config)
router.get('/chart/time', routes.chart.time)
router.get('/chart/search', routes.chart.search)
router.get('/chart/symbols', routes.chart.symbols)
router.get('/chart/history', routes.chart.history)
router.get('/chart/marks', routes.chart.marks)
router.get('/chart/timescale_marks', routes.chart.timescaleMarks)

export default router
