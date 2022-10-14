import React from 'react'

import { useSelector } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'

import Loader from '@/components/Loader'
import { ROUTES } from '@/constants/routes'
import * as selectors from '@/redux/profile/selectors'

export interface IPrivateRoute {
  component: React.FC<any>
}

export const PrivateRoute: React.FC<IPrivateRoute> = ({ component: Component, ...rest }) => {
  const location = useLocation()
  const isLoading = useSelector(selectors.loading)
  const isAuthenticated = useSelector(selectors.isAuthenticated)
  const style: React.CSSProperties = { position: 'absolute', top: '50%' }
  if (isLoading) {
    return (
      <div style={style}>
        <Loader />
      </div>
    )
  }

  if (!isLoading && !isAuthenticated) {
    return <Navigate to={{ pathname: ROUTES.LOGIN }} state={{ from: location }} />
  }

  return <Component {...rest} />
}

export default PrivateRoute
