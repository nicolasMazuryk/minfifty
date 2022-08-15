import React from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useDispatch } from 'react-redux'
import { useParams } from 'react-router-dom'

import { resetPassword } from '@/redux/profile/actions'

type IResetPasswordParams = {
  hash: string
}

const ResetPasswordForm: React.FC = () => {
  const { hash } = useParams<IResetPasswordParams>()
  const dispatch = useDispatch()

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const params: Parameters<typeof resetPassword>[0] = {
      password: data.get('password')?.toString() || '',
      confirmPassword: data.get('confirmPassword')?.toString() || '',
      hash: hash || '',
    }
    dispatch(resetPassword(params))
  }

  return (
    <Box component="form" noValidate onSubmit={handleSubmit}>
      <Typography fontSize={24} component="h1">
        Set password
      </Typography>
      <TextField
        margin="normal"
        required
        fullWidth
        id="password"
        label="Password"
        name="password"
        autoFocus
      />
      <TextField
        margin="normal"
        required
        fullWidth
        name="confirmPassword"
        label="Confirm Password"
        type="password"
        id="confirmPassword"
      />

      <Grid>
        <Button type="submit" fullWidth variant="contained">
          Set new password
        </Button>
      </Grid>
    </Box>
  )
}

export default ResetPasswordForm
