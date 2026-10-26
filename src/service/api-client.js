const apiUrl = (import.meta.env?.VITE_API_URL || '/api').replace(/\/$/, '')

export const request = async (path, { method = 'GET', body, accessToken, signal, responseType = 'json', timeoutMs = 30000, preserveValidationMessage = false } = {}) => {
  // Fetch adds the multipart boundary for FormData. Setting Content-Type here
  // would prevent Laravel from reading the uploaded file and form fields.
  const multipart = typeof FormData !== 'undefined' && body instanceof FormData
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal?.aborted) abort()
  else signal?.addEventListener('abort', abort, { once: true })
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, timeoutMs)
  let response

  try {
    response = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        Accept: responseType === 'blob' ? 'application/pdf, application/json' : 'application/json',
        ...(body !== undefined && !multipart && { 'Content-Type': 'application/json' }),
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      credentials: 'include',
      signal: controller.signal,
      ...(body !== undefined && { body: multipart ? body : JSON.stringify(body) }),
    })
    const payload = response.ok && responseType === 'blob' ? null : await response.json().catch(() => null)

    if (!response.ok) {
      let message = payload?.message || 'Não foi possível concluir a solicitação.'

      if (response.status === 429) {
        message = 'Muitas tentativas. Aguarde um minuto e tente novamente.'
      } else if (response.status >= 500) {
        message = 'O servidor está indisponível no momento. Tente novamente mais tarde.'
      } else if (response.status === 422 && responseType !== 'blob' && !preserveValidationMessage) {
        message = 'Confira os campos informados e tente novamente.'
      }

      const error = new Error(message)
      error.status = response.status
      error.errors = payload?.errors || {}
      throw error
    }

    if (responseType === 'blob') {
      return { blob: await response.blob(), contentDisposition: response.headers.get('Content-Disposition') }
    }

    if (payload?.status !== 'success' || !Object.hasOwn(payload, 'data')) {
      throw new Error('O servidor retornou uma resposta inválida. Tente novamente.')
    }

    return payload.data
  } catch (error) {
    if (signal?.aborted) throw new DOMException('Solicitação cancelada.', 'AbortError')
    if (timedOut) throw new Error('O servidor demorou para responder. Tente novamente.')
    if (response && error instanceof Error && !(error instanceof TypeError)) throw error
    throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.')
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', abort)
  }
}
