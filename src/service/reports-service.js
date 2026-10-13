import { request } from './api-client.js'
import { isReportId } from './reports-navigation.js'

const invalidResponse = () => new Error('O servidor retornou dados de relatório inválidos. Tente novamente.')
const isText = (value) => typeof value === 'string' && value.trim().length > 0
const isPositiveInt = (value) => Number.isSafeInteger(value) && value > 0
const isMunicipality = (value) => isPositiveInt(value?.id) && isText(value.name) && isText(value.state_code)

const validateReport = (report, expectedId) => {
  if (!isReportId(report?.id) || (expectedId && report.id.toLowerCase() !== expectedId.toLowerCase())
    || !isText(report.status) || !isText(report.created_at)
    || !(report.cover === null || (isText(report.cover?.typology)
      && (report.cover.municipality === null || isMunicipality(report.cover.municipality))))
    || !(report.general_information === null || report.general_information?.inspection_date === null || isText(report.general_information?.inspection_date))
    || !(report.generated_document === null || (isText(report.generated_document?.file_name) && isText(report.generated_document?.generated_at)))) {
    throw invalidResponse()
  }
  return report
}

const reportPath = (id) => {
  if (!isReportId(id)) throw new Error('O identificador do relatório é inválido.')
  return `/reports/${id}`
}

/** @param {string} accessToken
 * @param {{ municipalityId?: number | null, typology?: string, page?: number, perPage?: number, signal?: AbortSignal }} [options]
 * @returns {Promise<import('../types/reports').ReportsResult>} */
export const listReports = async (accessToken, { municipalityId, typology = '', page = 1, perPage = 10, signal } = {}) => {
  if (!isPositiveInt(page) || !isPositiveInt(perPage) || perPage > 100 || (municipalityId != null && !isPositiveInt(municipalityId))) {
    throw new Error('Os filtros de pesquisa são inválidos.')
  }
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (municipalityId) params.set('municipality_id', String(municipalityId))
  if (typology.trim()) params.set('typology', typology.trim())
  const data = await request(`/reports?${params}`, { accessToken, signal })
  const p = data?.pagination
  if (!Array.isArray(data?.reports) || !isPositiveInt(p?.current_page) || !isPositiveInt(p?.per_page)
    || !Number.isSafeInteger(p?.total) || p.total < 0 || !isPositiveInt(p?.last_page)
    || !(p.from === null || isPositiveInt(p.from)) || !(p.to === null || isPositiveInt(p.to))) throw invalidResponse()
  return { reports: data.reports.map((report) => validateReport(report)), pagination: p }
}

/** @returns {Promise<import('../types/reports').Report>} */
export const findReport = async (accessToken, id, signal) => validateReport(await request(reportPath(id), { accessToken, signal }), id)

/** @returns {Promise<import('../types/reports').Municipality[]>} */
export const listReportMunicipalities = async (accessToken, signal) => {
  const data = await request('/reports/municipalities', { accessToken, signal })
  if (!Array.isArray(data?.municipalities) || !data.municipalities.every(isMunicipality)) throw invalidResponse()
  return data.municipalities
}

export const pdfFileName = (disposition, fallback) => {
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition ?? '')
  const regular = /filename=(?:"([^"]+)"|([^;]+))/i.exec(disposition ?? '')
  let name = regular?.[1] || regular?.[2] || fallback
  if (encoded) {
    try { name = decodeURIComponent(encoded[1]) } catch { /* Fall back to the regular filename. */ }
  }
  name = Array.from(name).map((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127 ? '_' : character).join('')
    .replace(/[\\/<>:"|?*]/g, '_').trim().slice(0, 180)
  return /\.pdf$/i.test(name) ? name : `${name || 'relatorio'}.pdf`
}

/** @param {string} accessToken
 * @param {string} id
 * @param {{ inline?: boolean, signal?: AbortSignal, timeoutMs?: number }} [options]
 * @returns {Promise<import('../types/reports').ReportPdf>} */
export const getReportPdf = async (accessToken, id, { inline = false, signal, timeoutMs = 60000 } = {}) => {
  const path = `${reportPath(id)}/pdf${inline ? '?disposition=inline' : ''}`
  const { blob, contentDisposition } = await request(path, { accessToken, signal, responseType: 'blob', timeoutMs })
  if (blob.type.split(';')[0].toLowerCase() !== 'application/pdf' || blob.size < 12) {
    throw new Error('O arquivo recebido não é um PDF válido. Tente novamente ou contate a equipe responsável.')
  }
  const header = await blob.slice(0, 1024).text()
  const ending = await blob.slice(Math.max(0, blob.size - 1024)).text()
  if (!header.includes('%PDF-') || !ending.includes('%%EOF')) {
    throw new Error('O PDF parece estar corrompido ou incompleto. Tente novamente ou contate a equipe responsável.')
  }
  return { blob, fileName: pdfFileName(contentDisposition, `relatorio-${id}.pdf`) }
}
