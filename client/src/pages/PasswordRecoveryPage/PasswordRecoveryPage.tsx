import React from 'react'

import { useSelector } from 'react-redux'

import PasswordRecoveryForm from '@/components/PasswordRecoveryForm'
import * as selectors from '@/redux/profile/selectors'

const PasswordRecoveryPage: React.FC = () => {
  const isRecoveryRequested = useSelector(selectors.isRecoveryRequested)
  if (isRecoveryRequested) {
    return <h3>Success, check your email for next step.</h3>
  }
  return <PasswordRecoveryForm />
}

export default PasswordRecoveryPage
