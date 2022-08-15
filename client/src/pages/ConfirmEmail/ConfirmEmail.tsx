import React, { useEffect } from 'react'

import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'

import { confirm } from '@/redux/profile/actions'
import * as selectors from '@/redux/profile/selectors'

import styles from './ConfirmEmail.module.scss'

type IConfirmEmailParams = {
  hash: string
}

const ConfirmEmail: React.FC = () => {
  const dispatch = useDispatch()
  const isConfirmed = useSelector(selectors.isConfirmed)
  const { hash } = useParams<IConfirmEmailParams>()

  useEffect(() => {
    if (hash) {
      dispatch(confirm(hash))
    }
  }, [hash, dispatch])

  return (
    <div className={styles.confirmEmailWrap}>
      <div>
        {isConfirmed ? (
          <h3>Your email is verified. Now you can login to system.</h3>
        ) : (
          <h3>Email is not verified.</h3>
        )}
      </div>
    </div>
  )
}

export default ConfirmEmail
