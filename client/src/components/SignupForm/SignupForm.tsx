import React, { useRef, useEffect } from 'react'

import CheckIcon from '@mui/icons-material/Check'
import LoadingButton from '@mui/lab/LoadingButton'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'

import { signup, resetSuccessState } from '@/redux/profile/actions'
import * as selectors from '@/redux/profile/selectors'

const SignupForm: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const refEmail = useRef<HTMLInputElement>()
  const dispatch = useDispatch()

  const isSignupSuccess = useSelector(selectors.successfullyRegistered)
  const isLoading = useSelector(selectors.loading)

  useEffect(() => {
    const email = new URLSearchParams(location.search).get('email')
    if (email && refEmail.current) {
      refEmail.current.value = email
      navigate('/signup', { replace: true })
    }
    return () => {
      dispatch(resetSuccessState())
    }
  }, [navigate, dispatch, location])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    if (data) {
      const params: Parameters<typeof signup>[0] = {
        username: data.get('name')?.toString() || '',
        email: data.get('email')?.toString() || '',
        password: data.get('password')?.toString() || '',
        confirmPassword: data.get('confirmPassword')?.toString() || '',
      }
      dispatch(signup(params))
    }
  }

  if (isSignupSuccess)
    return (
      <Box flexDirection="row">
        <h3>
          {' '}
          <CheckIcon /> You successfully registered
        </h3>
        <Box
          sx={{
            textAlign: 'center',
          }}
        >
          Check email address!
        </Box>
      </Box>
    )

  return (
    <Box component="form" noValidate onSubmit={handleSubmit}>
      <Typography fontSize={24} component="h1">
        Sign Up
      </Typography>
      <TextField
        margin="normal"
        fullWidth
        label="Name"
        required
        name="name"
        autoComplete="name"
        autoFocus
      />
      <TextField
        margin="normal"
        fullWidth
        name="email"
        required
        label="Email Address"
        autoComplete="email"
        autoFocus
        inputRef={refEmail}
      />
      <TextField
        margin="normal"
        required
        fullWidth
        name="password"
        label="Password"
        type="password"
        id="password"
        autoComplete="password"
      />
      <TextField
        margin="normal"
        required
        fullWidth
        name="confirmPassword"
        label="confirmPassword"
        type="password"
        id="confirmPassword"
        autoComplete="confirmPassword"
      />

      <Grid container justifyContent="center" alignItems="center">
        <Grid item>
          <LoadingButton loading={isLoading} type="submit" variant="contained">
            Sign up
          </LoadingButton>
        </Grid>
      </Grid>
    </Box>
  )
}

export default SignupForm
