import { request } from './api-client.js'

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0
const isSessionUser = (user) => (
  isNonEmptyString(user?.id)
  && isNonEmptyString(user.name)
  && isNonEmptyString(user.email)
  && isNonEmptyString(user.role)
  && typeof user.must_change_password === 'boolean'
)

export const authenticateUser = async ({ email, password }) => {
  const session = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  })

  if (!isNonEmptyString(session?.access_token) || !isSessionUser(session.user)) {
    throw new Error('Não foi possível iniciar a sessão. Tente novamente.')
  }

  return session
}

export const findCurrentUser = async (accessToken) => {
  const data = await request('/auth/me', { accessToken })

  if (!isSessionUser(data?.user)) {
    throw new Error('Não foi possível validar a sessão. Tente novamente.')
  }

  return data.user
}

export const changePassword = async (accessToken, { current_password, password, password_confirmation }) => {
  const data = await request('/auth/change-password', {
    method: 'POST',
    accessToken,
    body: { current_password, password, password_confirmation },
  })

  if (!isSessionUser(data?.user) || data.user.must_change_password !== false) {
    throw new Error('Não foi possível confirmar a alteração da senha. Tente novamente.')
  }

  return data.user
}

export const logoutUser = (accessToken) => request('/auth/logout', {
  method: 'POST',
  accessToken,
})
