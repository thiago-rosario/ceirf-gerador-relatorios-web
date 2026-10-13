export const isReportId = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)

const positiveId = (value) => {
  if (!/^[1-9]\d*$/.test(value ?? '')) return null
  const id = Number(value)
  return Number.isSafeInteger(id) ? id : null
}

/** @returns {import('../types/reports').ReportSearch} */
export const parseReportSearch = (search = '') => {
  const params = new URLSearchParams(search)
  return {
    municipalityId: positiveId(params.get('municipality_id')),
    typology: (params.get('typology') ?? '').trim().slice(0, 100),
    page: positiveId(params.get('page')) ?? 1,
    coordinationId: positiveId(params.get('coordination_id')),
  }
}

/** @param {Partial<import('../types/reports').ReportSearch>} filters */
export const reportSearchHref = (filters = {}) => {
  const params = new URLSearchParams()
  if (positiveId(String(filters.municipalityId))) params.set('municipality_id', String(filters.municipalityId))
  if (filters.typology?.trim()) params.set('typology', filters.typology.trim().slice(0, 100))
  if (positiveId(String(filters.page)) && filters.page > 1) params.set('page', String(filters.page))
  if (positiveId(String(filters.coordinationId))) params.set('coordination_id', String(filters.coordinationId))
  return `/relatorios/pesquisar${params.size ? `?${params}` : ''}`
}

/** @param {import('../types/reports').ReportSearch} filters
 * @param {import('../types/reports').ReportPagination | null | undefined} pagination */
export const reportSearchCorrectionHref = (filters, pagination) => {
  if (!pagination || filters.page <= pagination.last_page) return null
  return reportSearchHref({ ...filters, page: pagination.last_page })
}

export const reportReturnHref = (search = '') => {
  const value = new URLSearchParams(search).get('return_to')
  if (!value || value.includes('\\') || Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return '/relatorios/pesquisar'
  // Rebuild only the known search path and allowed parameters; never follow an arbitrary URL.
  if (value.split('?')[0] !== '/relatorios/pesquisar') return '/relatorios/pesquisar'
  return reportSearchHref(parseReportSearch(value.includes('?') ? value.slice(value.indexOf('?')) : ''))
}

export const reportViewHref = (id, searchHref = '/relatorios/pesquisar') => {
  if (!isReportId(id)) throw new Error('O identificador do relatório é inválido.')
  const params = new URLSearchParams({ return_to: searchHref })
  return `/relatorios/${id}?${params}`
}

export const reportDateLabel = (report) => {
  const value = report.general_information?.inspection_date || report.created_at
  const date = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(value)
  if (!date) return 'Não informada'
  const normalized = `${date[1]}-${date[2]}-${date[3]}`
  const calendar = new Date(`${normalized}T12:00:00Z`)
  if (Number.isNaN(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== normalized) return 'Não informada'
  return `${date[3]}/${date[2]}/${date[1]}`
}
