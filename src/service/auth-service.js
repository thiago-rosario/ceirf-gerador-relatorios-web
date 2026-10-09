import { request } from './api-client.js'

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0
const isSessionUser = (user) => (
  isNonEmptyString(user?.id)
  && isNonEmptyString(user.name)
  && isNonEmptyString(user.email)
  && isNonEmptyString(user.role)
  && typeof user.must_change_password === 'boolean'
)

const isCurrentUser = (user) => (
  isSessionUser(user)
  && typeof user.is_active === 'boolean'
  && (user.coordination_id === null
    ? user.coordination === null
    : Number.isSafeInteger(user.coordination_id) && user.coordination_id > 0
      && user.coordination?.id === user.coordination_id
      && isNonEmptyString(user.coordination.code) && isNonEmptyString(user.coordination.name))
)

export const authenticateUser = async ({ email, password }) => {
  const session = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  })

  if (!isNonEmptyString(session?.access_token) || !isSessionUser(session.user)) {
    throw new Error('Não foi possível iniciar a sessão. Tente novamente.')
  }

  // Login identifies the role; /me also supplies the real coordination and account state.
  const user = await findCurrentUser(session.access_token)
  if (user.id !== session.user.id) throw new Error('Não foi possível confirmar o usuário da sessão. Tente novamente.')
  return { ...session, user }
}

export const findCurrentUser = async (accessToken) => {
  const data = await request('/auth/me', { accessToken })

  if (!isCurrentUser(data?.user)) {
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

  if (!isCurrentUser(data?.user) || data.user.must_change_password !== false) {
    throw new Error('Não foi possível confirmar a alteração da senha. Tente novamente.')
  }

  return data.user
}

export const logoutUser = (accessToken) => request('/auth/logout', {
  method: 'POST',
  accessToken,
})
