import { request } from './api-client.js'
import { fileMimeType, validateSelectedFile } from './report-form-model.js'
import { isReportId } from './reports-navigation.js'

export const MEDIA_KIND_BY_ASSET = Object.freeze({
  location_map: 'image', state_map: 'image', pre_implementation: 'image', photograph: 'image',
  municipality_map: 'attachment', topographic_plan: 'attachment', other: 'attachment',
})

const isChecksum = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value)
const isText = (value) => typeof value === 'string' && value.trim().length > 0
const hasControlCharacters = (value) => Array.from(value).some((character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)
const invalidResponse = () => new Error('Não foi possível confirmar o arquivo recebido do servidor. Tente novamente.')
const validateFile = (file) => {
  if (!(file instanceof Blob) || !isText(file.name)) throw new Error('Selecione um arquivo válido para enviar.')
  const issue = validateSelectedFile(file)
  if (issue) throw new Error(issue)
}

/** Calculates the SHA-256 of the actual file bytes before upload or duplicate checks.
 * @param {File} file
 * @returns {Promise<string>}
 */
export const calculateFileChecksum = async (file) => {
  validateFile(file)
  if (!globalThis.crypto?.subtle) throw new Error('Não foi possível calcular a identificação do arquivo. Acesse o sistema por uma conexão segura e tente novamente.')
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Uploading stores the bytes; callers still PATCH the complete section to link this reference.
 * @param {string} accessToken
 * @param {string} id
 * @param {File} file
 * @param {'image' | 'attachment'} kind
 * @param {string} checksum
 * @param {AbortSignal} [signal]
 * @param {string} [replacesId] UUID currently linked to the report, allowing replacement at the figure limit.
 * @returns {Promise<{id: string, file: import('../types/report-draft').FileReference}>}
 */
export const uploadReportMedia = async (accessToken, id, file, kind, checksum, signal, replacesId) => {
  if (!isReportId(id)) throw new Error('O identificador do relatório é inválido.')
  validateFile(file)
  if (!['image', 'attachment'].includes(kind)) throw new Error('O tipo de mídia é inválido.')
  if (!isChecksum(checksum)) throw new Error('Não foi possível confirmar a identificação do arquivo. Selecione-o novamente.')
  if (replacesId !== undefined && !isReportId(replacesId)) throw new Error('O identificador da mídia a substituir é inválido.')

  const body = new FormData()
  body.append('file', file, file.name)
  body.append('kind', kind)
  body.append('checksum', checksum.toLowerCase())
  if (replacesId !== undefined) body.append('replaces_id', replacesId)

  const data = await request(`/reports/${id}/media`, { method: 'POST', accessToken, body, signal, timeoutMs: 120000, preserveValidationMessage: true })
  const reference = data?.file
  const extension = ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'application/pdf': 'pdf' })[fileMimeType(file)]
  if (!isReportId(data?.id) || !isReportId(data.root_report_id)
    || !isText(reference?.storage_identifier) || reference.storage_identifier.length > 255
    || reference.storage_identifier !== `reports/${data.root_report_id}/media/${data.id}.${extension}`
    || !isText(reference?.file_name) || Array.from(reference.file_name).length > 255 || hasControlCharacters(reference.file_name)
    || reference.mime_type !== fileMimeType(file) || reference.size_bytes !== file.size
    || !isChecksum(reference.checksum) || reference.checksum.toLowerCase() !== checksum.toLowerCase()) throw invalidResponse()

  return { id: data.id, file: {
    storage_identifier: reference.storage_identifier, file_name: reference.file_name,
    mime_type: reference.mime_type, size_bytes: reference.size_bytes, checksum: reference.checksum.toLowerCase(),
  } }
}
