import { Suspense, lazy } from 'react'

import { Routes, Route } from 'react-router-dom'

// const MainLayout = lazy(() => import('./pages/MainLayout'))
const ChartPage = lazy(() => import('./pages/ChartPage'))
const HomePage = lazy(() => import('./pages/HomePage'))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'))
const ConfirmEmail = lazy(() => import('./pages/ConfirmEmail'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const PasswordRecoveryPage = lazy(() => import('./pages/PasswordRecoveryPage'))

import AdminContainer from './components/AdminContainer'
import AuthContainer from './components/AuthContainer'
import Loader from './components/Loader'
import PrivateRoute from './components/PrivateRoute'
import { ROUTES } from './constants/routes'

const RootComponent = () => (
  // <MainLayout>
  <Suspense fallback={<Loader />}>
    <Routes>
      <Route path={ROUTES.CHART} element={<ChartPage />} />
      <Route path={ROUTES.HOME} element={<HomePage />} />
      <Route path={ROUTES.CONFIRM_EMAIL} element={<ConfirmEmail />} />
      <Route
        path={ROUTES.ADMIN}
        element={<PrivateRoute component={AdminContainer} />}
      />
      <Route
        path={ROUTES.ADMIN_USERS}
        element={<PrivateRoute component={AdminUsersPage} />}
      />
      <Route
        path={ROUTES.PROFILE}
        element={<PrivateRoute component={ProfilePage} />}
      />
      <Route
        path={ROUTES.LOGIN}
        element={<AuthContainer component={LoginPage} />}
      />
      <Route
        path={ROUTES.SIGNUP}
        element={<AuthContainer component={SignupPage} />}
      />
      <Route
        path={ROUTES.RESET_PASSWORD}
        element={<AuthContainer component={ResetPasswordPage} />}
      />
      <Route
        path={ROUTES.PASSWORD_RECOVERY}
        element={<AuthContainer component={PasswordRecoveryPage} />}
      />
    </Routes>
  </Suspense>
  // </MainLayout>
)

export default RootComponent
