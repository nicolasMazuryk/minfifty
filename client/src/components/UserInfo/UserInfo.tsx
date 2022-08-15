import React from 'react'

import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import { useDispatch, useSelector } from 'react-redux'

import { hideUser } from '@/redux/users/actions'
import * as selector from '@/redux/users/selectors'

const UserInfo: React.FC = () => {
  const dispatch = useDispatch()
  const selectedUser = useSelector(selector.selectedUser)

  const handleHideUser = () => {
    dispatch(hideUser())
  }

  const { id, username, email, phone } = selectedUser

  return (
    <Dialog fullWidth={true} open={!!id} onClose={handleHideUser}>
      <DialogTitle id="alert-dialog-title">full name: {username}</DialogTitle>
      <DialogContent>
        <p>email: {email}</p>
        <p>phone: {phone}</p>
      </DialogContent>
    </Dialog>
  )
}

export default UserInfo
