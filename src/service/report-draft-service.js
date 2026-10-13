import { request } from './api-client.js'
import { isReportId } from './reports-navigation.js'

const sectionNames = [
  'cover', 'general_information', 'location', 'infrastructure',
  'pre_implementation', 'photographic_documentation', 'attachments', 'conclusion',
]
const invalidResponse = () => new Error('Não foi possível confirmar os dados do relatório recebidos do servidor. Tente novamente.')
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const isText = (value) => typeof value === 'string' && value.trim().length > 0
const isPositiveInt = (value) => Number.isSafeInteger(value) && value > 0

const reportPath = (id) => {
  if (!isReportId(id)) throw new Error('O identificador do relatório é inválido.')
  return `/reports/${id}`
}

const sectionPayload = (payload) => {
  if (!isRecord(payload)) throw new Error('Os dados do relatório são inválidos.')
  const result = {}
  for (const name of sectionNames) {
    if (!Object.hasOwn(payload, name)) continue
    if (!isRecord(payload[name])) throw new Error('Os dados de uma seção do relatório são inválidos.')
    result[name] = { ...payload[name] }
  }
  if (result.cover) {
    for (const field of ['municipality_id', 'force', 'size', 'sei_number']) {
      if (typeof result.cover[field] === 'string' && !result.cover[field].trim()) result.cover[field] = null
    }
  }
  return result
}

const validateReport = (report, expectedId) => {
  if (!isRecord(report) || !isReportId(report.id)
    || (expectedId && report.id.toLowerCase() !== expectedId.toLowerCase())
    || !['DRAFT', 'GENERATED'].includes(report.status)) throw invalidResponse()

  // Partial sections and empty fields are valid in a server draft.
  for (const name of sectionNames) {
    if (Object.hasOwn(report, name) && report[name] !== null && !isRecord(report[name])) throw invalidResponse()
  }
  return report
}

/** Creates a partial draft. Media must be attached later using server storage references.
 * @param {string} accessToken
 * @param {number | null | undefined} coordinationId
 * @param {Record<string, unknown>} payload
 * @param {AbortSignal} [signal]
 */
export const createReportDraft = async (accessToken, coordinationId, payload, signal) => {
  if (coordinationId != null && !isPositiveInt(coordinationId)) throw new Error('A coordenação do relatório é inválida.')
  const body = sectionPayload(payload)
  // CreateReportRequest prohibits media even when values are null or empty lists.
  delete body.location
  delete body.pre_implementation
  delete body.photographic_documentation
  if (body.attachments) {
    delete body.attachments.municipality_location_map
    delete body.attachments.topographic_plan
    delete body.attachments.others
  }
  if (coordinationId != null) body.coordination_id = coordinationId
  if (payload.report_type_id != null) {
    if (!isPositiveInt(payload.report_type_id)) throw new Error('O tipo de relatório é inválido.')
    body.report_type_id = payload.report_type_id
  }
  const data = validateReport(await request('/reports', { method: 'POST', accessToken, body, signal }))
  if (data.status !== 'DRAFT' || !Number.isSafeInteger(data.revision_number) || data.revision_number < 0 || !isText(data.created_at)) throw invalidResponse()
  return data
}

/** PATCH replaces each supplied section; callers send its complete current values.
 * @param {string} accessToken
 * @param {string} id
 * @param {Record<string, unknown>} payload
 * @param {AbortSignal} [signal]
 */
export const updateReportDraft = async (accessToken, id, payload, signal) => {
  const path = reportPath(id)
  const body = sectionPayload(payload)
  if (Object.keys(body).length === 0) throw new Error('Informe ao menos uma seção do relatório para salvar.')
  const data = validateReport(await request(path, { method: 'PATCH', accessToken, body, signal }), id)
  if (data.status !== 'DRAFT') throw invalidResponse()
  return data
}

/** @param {string} accessToken
 * @param {string} id
 * @param {AbortSignal} [signal]
 */
export const loadReportDraft = async (accessToken, id, signal) => validateReport(await request(reportPath(id), { accessToken, signal }), id)

/** Finalizes using the existing generator; success requires confirmed document metadata.
 * @param {string} accessToken
 * @param {string} id
 */
export const generateReportDraft = async (accessToken, id) => {
  const data = validateReport(await request(`${reportPath(id)}/generate`, { method: 'POST', accessToken, timeoutMs: 120000 }), id)
  if (data.status !== 'GENERATED' || data.is_generated !== true
    || !isText(data.generated_document?.file_name) || !isText(data.generated_document?.generated_at)) throw invalidResponse()
  return data
}
