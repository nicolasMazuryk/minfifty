import React from 'react'

import TVChartContainer from '../../components/TVChartContainer'

import classnames from './ChartPage.module.scss'

const ChartPage: React.FC = () => (
  <div className={classnames.container}>
    <TVChartContainer />
  </div>
)

export default ChartPage
