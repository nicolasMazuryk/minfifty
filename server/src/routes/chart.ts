import { Request } from 'express'

import Config from '@/services/chart/Config'
import GetChartIndicator from '@/services/chart/GetChartIndicator'
import History from '@/services/chart/History'
import Marks from '@/services/chart/Marks'
import Search from '@/services/chart/Search'
import Symbols from '@/services/chart/Symbols'
import Time from '@/services/chart/Time'
import TimescaleMarks from '@/services/chart/TimescaleMarks'
import { makeServiceRunner } from '@/tools'

export default {
  config: makeServiceRunner(Config),
  time: makeServiceRunner(Time),
  search: makeServiceRunner(Search, (req: Request) => req.query),
  symbols: makeServiceRunner(Symbols, (req: Request) => req.query),
  history: makeServiceRunner(History, (req: Request) => req.query),
  marks: makeServiceRunner(Marks, (req: Request) => req.query),
  timescaleMarks: makeServiceRunner(TimescaleMarks, (req: Request) => req.query),
  getChartIndicator: makeServiceRunner(GetChartIndicator, (req: Request) => req.query),
}
