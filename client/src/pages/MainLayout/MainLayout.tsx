import React from 'react'

import BottomNavigation from '@mui/material/BottomNavigation'
import BottomNavigationAction from '@mui/material/BottomNavigationAction'
import cx from 'classnames'
import { useDispatch } from 'react-redux'
import { Link, useLocation } from 'react-router-dom'

import MainHeader from '@/components/MainHeader'
import { LINK_LABELS } from '@/constants/labels'
import { ROUTES } from '@/constants/routes'
import useComponentWillMount from '@/hooks/useComponentWillMount'
import { loadProfile } from '@/redux/profile/actions'

import style from './MainLayout.module.scss'

type IMainLayout = {
  children: React.ReactNode
}

const routes = [
  { href: ROUTES.HOME, label: LINK_LABELS.HOME },
  { href: ROUTES.PROFILE, label: LINK_LABELS.PROFILE },
  { href: ROUTES.HOME, label: LINK_LABELS.ABOUT_US },
  { href: ROUTES.HOME, label: LINK_LABELS.CONTACT_US },
] as const

const MainLayout: React.FC<IMainLayout> = ({ children }) => {
  const dispatch = useDispatch()
  useComponentWillMount(() => {
    dispatch(loadProfile())
  })

  const { pathname } = useLocation()
  const isHomePage = pathname === '/'

  return (
    <div className={style.root}>
      <MainHeader />
      <main
        className={cx({
          [style.content]: true,
          [style.home]: isHomePage,
        })}
      >
        {children}
      </main>
      <BottomNavigation className={style.footer} showLabels>
        {routes.map(({ label, href }) => (
          <BottomNavigationAction
            component={Link}
            to={href}
            className={style.footerAction}
            key={label}
            label={label}
          />
        ))}
      </BottomNavigation>
    </div>
  )
}

export default MainLayout
