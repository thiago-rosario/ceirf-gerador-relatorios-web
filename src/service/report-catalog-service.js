import { request } from './api-client.js'

const catalogs = ['forces', 'typologies', 'answers', 'infrastructure', 'checklist']
const cache = new Map()
const invalidResponse = () => new Error('Não foi possível carregar as opções do formulário. Tente novamente.')

const validateCatalog = (data, name) => {
  const options = data?.[name]
  if (!Array.isArray(options) || options.length === 0 || !options.every((option) => (
    typeof option?.key === 'string' && option.key.trim().length > 0
    && typeof option.label === 'string' && option.label.trim().length > 0
  )) || new Set(options.map(({ key }) => key)).size !== options.length) throw invalidResponse()
  return options
}

export const clearReportCatalogCache = () => {
  for (const entry of cache.values()) entry.controller.abort()
  cache.clear()
}

/** A subscriber can cancel without aborting a request shared with another mounted form.
 * @param {string} accessToken
 * @param {import('../types/report-catalogs').ReportCatalogName} name
 * @param {AbortSignal} [signal]
 * @returns {Promise<import('../types/report-catalogs').ReportCatalogOption[]>}
 */
export const getReportCatalog = (accessToken, name, signal) => {
  if (!catalogs.includes(name)) return Promise.reject(new Error('O catálogo solicitado é inválido.'))
  if (signal?.aborted) return Promise.reject(new DOMException('Solicitação cancelada.', 'AbortError'))
  const cacheKey = `${accessToken}:${name}`
  let entry = cache.get(cacheKey)
  if (!entry) {
    const controller = new AbortController()
    entry = { controller, promise: null }
    const current = entry
    entry.promise = request(`/reports/catalogs/${name}`, { accessToken, signal: controller.signal })
      .then((data) => validateCatalog(data, name)).catch((error) => {
        if (cache.get(cacheKey) === current) cache.delete(cacheKey)
        throw error
      })
    cache.set(cacheKey, entry)
  }
  if (!signal) return entry.promise
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException('Solicitação cancelada.', 'AbortError'))
    signal.addEventListener('abort', abort, { once: true })
    entry.promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
  })
}
