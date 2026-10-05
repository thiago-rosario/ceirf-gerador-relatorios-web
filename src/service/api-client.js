const apiUrl = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '')

export const request = async (path, { method = 'GET', body, accessToken } = {}) => {
  let response

  try {
    response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    })
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.')
  }

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    let message = payload?.message || 'Não foi possível concluir a solicitação.'

    if (response.status === 429) {
      message = 'Muitas tentativas. Aguarde um minuto e tente novamente.'
    } else if (response.status >= 500) {
      message = 'O servidor está indisponível no momento. Tente novamente mais tarde.'
    } else if (response.status === 422) {
      message = 'Confira os campos informados e tente novamente.'
    }

    const error = new Error(message)
    error.status = response.status
    error.errors = payload?.errors || {}
    throw error
  }

  if (payload?.status !== 'success' || !Object.hasOwn(payload, 'data')) {
    throw new Error('O servidor retornou uma resposta inválida. Tente novamente.')
  }

  return payload.data
}
