const ROUTES = {
  CHART: '/',
  HOME: '/home',
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  LOGIN: '/login',
  SIGNUP: '/signup',
  CONFIRM_EMAIL: '/confirm-email/:hash',
  PROFILE: '/profile',
  RESET_PASSWORD: '/reset-password/:hash',
  PASSWORD_RECOVERY: '/password-recovery',

  ADMIN_ROOT: '/admin',
  SETUP_TWOFA: '/admin/setup-twofa',
} as const

export { ROUTES }
