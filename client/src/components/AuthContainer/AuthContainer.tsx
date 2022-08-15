import React from 'react'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'

import * as selector from '@/redux/profile/selectors'

import styles from './AuthContainer.module.scss'

export interface IAuthContainer {
  component: React.ComponentType
}

const AuthContainer: React.FC<IAuthContainer> = ({
  component: Component,
  ...rest
}) => {
  const isAuthenticated = useSelector(selector.isAuthenticated)
  const isLoading = useSelector(selector.loading)

  return (
    <div className={styles.container}>
      {isAuthenticated && !isLoading && <Navigate to="/" />}
      {isLoading && (
        <Box
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            zIndex: 2,
          }}
        >
          <CircularProgress />
        </Box>
      )}
      {!isAuthenticated && !isLoading && <Component {...rest} />}
    </div>
  )
}

export default AuthContainer
