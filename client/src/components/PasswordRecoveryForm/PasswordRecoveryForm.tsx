import React from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useDispatch } from 'react-redux'

import { passwordRecovery } from '@/redux/profile/actions'

const PasswordRecoveryForm: React.FC = () => {
  const dispatch = useDispatch()
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const params: Parameters<typeof passwordRecovery>[0] = {
      email: data.get('email')?.toString() || '',
    }
    dispatch(passwordRecovery(params))
  }
  return (
    <Box component="form" noValidate onSubmit={handleSubmit}>
      <Typography fontSize={24} component="h1">
        Reset password
      </Typography>
      <TextField
        margin="normal"
        required
        fullWidth
        id="email"
        label="Email Address"
        name="email"
        autoComplete="email"
        autoFocus
      />
      <Grid container justifyContent="center" alignItems="center">
        <Grid item>
          <Button type="submit" fullWidth variant="contained">
            Reset password
          </Button>
        </Grid>
      </Grid>
    </Box>
  )
}

export default PasswordRecoveryForm
