import React, { forwardRef, useEffect, useState } from 'react'

import MuiAlert, { AlertProps } from '@mui/material/Alert'
import Snackbar from '@mui/material/Snackbar'
import { useSelector } from 'react-redux'

import { error as errorSelector } from '@/redux/profile/selectors'

const DURATION_TIME = 7000

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
})

const AlertComponent = () => {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const error: Record<string, any> | null = useSelector(errorSelector)

  useEffect(() => {
    if (error && error.code && error.code !== message) {
      setMessage(error.code)
      setOpen(true)
    }
  }, [error])

  const handleClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return
    }
    setOpen(false)
  }

  return (
    <Snackbar
      open={open}
      autoHideDuration={DURATION_TIME}
      onClose={handleClose}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <Alert onClose={handleClose} severity="error" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  )
}

export default AlertComponent
