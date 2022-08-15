import React from 'react'

import { useSelector } from 'react-redux'
import { Link, useParams } from 'react-router-dom'

import ResetPasswordForm from '@/components/ResetPasswordForm'
import { ROUTES } from '@/constants/routes'
import * as selector from '@/redux/profile/selectors'

type IResetPasswordParams = {
  hash: string
}

const ResetPasswordPage: React.FC = () => {
  const isChangedPwd = useSelector(selector.isChangedPwd)
  const { hash } = useParams<IResetPasswordParams>()
  return (
    <div>
      {hash && !isChangedPwd && <ResetPasswordForm />}
      {isChangedPwd && (
        <span>
          Your password successfully changed!
          <Link to={ROUTES.LOGIN}>Go to login page</Link>
        </span>
      )}
    </div>
  )
}

export default ResetPasswordPage
