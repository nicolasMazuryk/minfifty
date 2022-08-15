import React from 'react'

import Logout from '@mui/icons-material/Logout'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Toolbar from '@mui/material/Toolbar'
import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'

import { LINK_LABELS } from '@/constants/labels'
import { ROUTES } from '@/constants/routes'
import { USER_ROLES } from '@/constants/users'
import { logout } from '@/redux/profile/actions'
import * as selectors from '@/redux/profile/selectors'

type IMenu = {
  key: string
  to?: string
  icon?: React.ReactElement
  label: string
}

const unauthorizedMenuItems = [
  {
    key: 'login',
    to: ROUTES.LOGIN,
    label: 'Login',
  },
  {
    key: 'signup',
    to: ROUTES.SIGNUP,
    label: 'Sign Up',
  },
]

const loggedInItems = [
  {
    key: 'home',
    to: ROUTES.HOME,
    label: LINK_LABELS.HOME,
  },
  {
    key: 'profile',
    to: ROUTES.PROFILE,
    label: LINK_LABELS.PROFILE,
  },
]

const loggedInAdminItems = [
  {
    key: 'admin-panel',
    to: ROUTES.ADMIN,
    label: 'Admin Panel',
  },
]

const loggedInAuthItems = [
  {
    key: 'logout',
    to: '',
    icon: <Logout />,
    label: 'Logout',
  },
]

const getMenuItems = (isAuthenticated: boolean, role: string): IMenu[] => {
  if (!isAuthenticated) return unauthorizedMenuItems
  return [
    ...loggedInItems,
    ...(role === USER_ROLES.ADMIN ? loggedInAdminItems : []),
    ...loggedInAuthItems,
  ]
}

const MainHeader: React.FC = () => {
  const user = useSelector(selectors.user)
  const isAuthenticated = useSelector(selectors.isAuthenticated)
  const dispatch = useDispatch()

  const onClick = (e: IMenu) => {
    if (e.key === 'logout') dispatch(logout())
  }

  const menuItems = getMenuItems(isAuthenticated, user.role)
  return (
    <AppBar position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Box>
            {menuItems.map(item => {
              const commonProps = {
                sx: { color: 'white' },
                key: item.key,
                onClick: () => onClick(item),
              }

              return item.to ? (
                <Button component={Link} to={item.to} {...commonProps} />
              ) : (
                <Button {...commonProps} />
              )
            })}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  )
}

export default MainHeader
