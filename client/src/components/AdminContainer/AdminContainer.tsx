import React from 'react'

import { useSelector } from 'react-redux'
import { Link, Navigate } from 'react-router-dom'

import { ROUTES } from '@/constants/routes'
import * as selectors from '@/redux/profile/selectors'

const AdminContainer: React.FC = () => {
  const isAdmin = useSelector(selectors.isAdmin)
  if (!isAdmin) {
    return <Navigate to={{ pathname: ROUTES.HOME }} />
  }

  return (
    <div>
      <Link to={ROUTES.ADMIN_USERS}>Users</Link>
    </div>
  )
}

export default AdminContainer
