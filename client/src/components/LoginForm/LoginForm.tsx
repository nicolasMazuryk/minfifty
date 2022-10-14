import React from 'react'

import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Link from '@mui/material/Link'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useDispatch } from 'react-redux'
import { Link as RouterLink } from 'react-router-dom'

import { ROUTES } from '@/constants/routes'
import { login } from '@/redux/profile/actions'

import styles from './LoginForm.module.scss'

type ILoginForm = {
  email: string
  password: string
}

const LoginPage: React.FC = () => {
  const dispatch = useDispatch()
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const params: ILoginForm = {
      email: data.get('email')?.toString() || '',
      password: data.get('password')?.toString() || '',
    }

    dispatch(login(params))
  }
  return (
    <Box component="form" noValidate onSubmit={handleSubmit}>
      <Typography fontSize={24} component="h1">
        Login
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
      <TextField
        margin="normal"
        required
        fullWidth
        name="password"
        label="Password"
        type="password"
        id="password"
        autoComplete="current-password"
      />

      <Grid container direction="column" justifyContent="center" alignItems="center">
        <Grid item xs>
          <Link className={styles.link} component={RouterLink} to={ROUTES.PASSWORD_RECOVERY}>
            Forgot your password?
          </Link>
        </Grid>
        <Grid item>
          <Button type="submit" fullWidth variant="contained">
            Sign In
          </Button>
        </Grid>
      </Grid>
    </Box>
  )
}

export default LoginPage
