import { request } from './api-client.js'

export const authenticateUser = async ({ email, password }) => {
  const session = await request('/auth/login', {
    method: 'POST',
    body: { email, password },
  })

  if (typeof session?.access_token !== 'string' || !session.access_token || !session.user?.id) {
    throw new Error('Não foi possível iniciar a sessão. Tente novamente.')
  }

  return session
}

export const findCurrentUser = async (accessToken) => {
  const data = await request('/auth/me', { accessToken })

  if (!data?.user?.id) {
    throw new Error('Não foi possível validar a sessão. Tente novamente.')
  }

  return data.user
}

export const logoutUser = (accessToken) => request('/auth/logout', {
  method: 'POST',
  accessToken,
})
