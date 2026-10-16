import { getReportPermissions } from './reports-access.js'

/** @typedef {{ id: string, reference: string, coordination_id: number, municipality: string,
 * typology: string, author: string, submitted_at: string, inspection_date: string,
 * status: 'PENDING' | 'CHANGES_REQUESTED' | 'APPROVED', revision_number: number,
 * sections: { title: string, text: string }[],
 * history: { action: string, author: string, created_at: string, comment: string }[] }} ReviewReport */

const prefix = 'ceirf:presentation:review:v1:'
const memory = new Map()
const statuses = ['PENDING', 'CHANGES_REQUESTED', 'APPROVED']
const isText = (value) => typeof value === 'string' && value.trim().length > 0
const clone = (value) => JSON.parse(JSON.stringify(value))

const browserStorage = () => {
  try { return globalThis.localStorage ?? null } catch { return null }
}

const validateScope = (user, coordination) => {
  if (!Number.isSafeInteger(coordination?.id) || coordination.id < 1
    || !isText(coordination.code) || !isText(coordination.name)) throw new Error('A coordenação da revisão é inválida.')
  if (!getReportPermissions(user, coordination.id).review) throw new Error('Você não tem permissão para revisar relatórios nesta coordenação.')
  return `${prefix}${encodeURIComponent(user.id)}:${coordination.id}`
}

/** Local examples belong to the selected coordination; no report UUID is sent to the API.
 * @returns {ReviewReport[]} */
const examples = (coordination) => {
  const entries = [
    ['001', 'Vitória da Conquista', 'CIPM 1B – DT 1B', 'Mariana Santos', '2026-10-13T14:30:00-03:00', '2026-10-09', 'PENDING'],
    ['002', 'Ilhéus', 'DEAM 1B', 'Rafael Oliveira', '2026-10-12T10:15:00-03:00', '2026-10-08', 'PENDING'],
    ['003', 'Feira de Santana', 'Complexo Policial', 'Carolina Almeida', '2026-10-11T16:40:00-03:00', '2026-10-07', 'PENDING'],
    ['004', 'Bom Jesus da Serra', 'Delegacia Territorial', 'Lucas Ferreira', '2026-10-10T09:20:00-03:00', '2026-10-06', 'CHANGES_REQUESTED'],
    ['005', 'Salvador', 'Centro de Atendimento', 'Ana Costa', '2026-10-09T11:50:00-03:00', '2026-10-05', 'APPROVED'],
  ]
  return entries.map(([number, municipality, typology, author, submittedAt, inspectionDate, status]) => ({
    id: `local-review-${coordination.id}-${number}`,
    reference: `2026-${coordination.code}-${number}`,
    coordination_id: coordination.id,
    municipality,
    typology,
    author,
    submitted_at: submittedAt,
    inspection_date: inspectionDate,
    status,
    revision_number: number === '004' ? 2 : 1,
    sections: [
      { title: 'Informações gerais', text: `Vistoria técnica da unidade em ${municipality}, destinada à avaliação do pleito ${typology}. O levantamento contempla as condições de uso, acessibilidade e adequação dos ambientes.` },
      { title: 'Localização e infraestrutura', text: 'A unidade possui acesso por via pavimentada, abastecimento de água e energia elétrica. Foram observadas áreas de recepção, atendimento, administração e apoio, com registros de manutenção preventiva.' },
      { title: 'Conclusão técnica', text: 'Recomenda-se a continuidade do planejamento, com verificação das medidas de acessibilidade e atualização do levantamento de infraestrutura antes da execução dos serviços.' },
    ],
    history: status === 'PENDING' ? [] : [{
      action: status === 'APPROVED' ? 'approve' : 'request_changes',
      author: 'Equipe de revisão',
      created_at: '2026-10-13T09:00:00-03:00',
      comment: status === 'APPROVED' ? 'Informações conferidas e relatório aprovado.' : 'Detalhar as medidas de acessibilidade e complementar a conclusão técnica.',
    }],
  }))
}

const validStoredReport = (report, coordination) => (
  report && typeof report === 'object'
  && typeof report.id === 'string' && new RegExp(`^local-review-${coordination.id}-\\d{3}$`).test(report.id)
  && report.coordination_id === coordination.id
  && ['reference', 'municipality', 'typology', 'author', 'submitted_at', 'inspection_date'].every((field) => isText(report[field]))
  && statuses.includes(report.status) && Number.isSafeInteger(report.revision_number) && report.revision_number > 0
  && Array.isArray(report.sections) && report.sections.length > 0 && report.sections.every((section) => isText(section?.title) && isText(section?.text))
  && Array.isArray(report.history) && report.history.every((entry) => ['approve', 'request_changes', 'resubmit'].includes(entry?.action)
    && isText(entry.author) && isText(entry.created_at) && typeof entry.comment === 'string')
)

/** @param {import('../types/users').SessionUser} user
 * @param {import('../types/users').Coordination} coordination
 * @param {{ storage?: Pick<Storage, 'getItem' | 'setItem'> | null }} [options]
 * @returns {ReviewReport[]}
 */
export const listReviewReports = (user, coordination, { storage = browserStorage() } = {}) => {
  const key = validateScope(user, coordination)
  let stored
  try { stored = storage ? storage.getItem(key) : memory.get(key) } catch { /* A blocked storage still permits reading the examples. */ }
  if (stored) {
    try {
      const reports = JSON.parse(stored)
      if (Array.isArray(reports) && reports.length > 0 && reports.every((report) => validStoredReport(report, coordination))
        && new Set(reports.map((report) => report.id)).size === reports.length) return clone(reports)
    } catch { /* Recover a corrupted local presentation without affecting API data. */ }
  }
  return examples(coordination)
}

/** @param {ReturnType<typeof listReviewReports>} reports
 * @param {{ query?: string, status?: string }} [options]
 * @returns {ReviewReport[]}
 */
export const filterReviewReports = (reports, { query = '', status = 'PENDING' } = {}) => {
  const normalize = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  const needle = normalize(query.trim())
  return reports.filter((report) => (status === 'ALL' || report.status === status)
    && (!needle || normalize([report.reference, report.municipality, report.typology, report.author].join(' ')).includes(needle)))
}

/** Decisions stay in the browser, scoped to the authenticated user and coordination.
 * @param {import('../types/users').SessionUser} user
 * @param {import('../types/users').Coordination} coordination
 * @param {string} id
 * @param {{ action: 'approve' | 'request_changes' | 'resubmit', comment?: string }} decision
 * @param {{ storage?: Pick<Storage, 'getItem' | 'setItem'> | null, now?: string }} [options]
 * @returns {ReviewReport[]}
 */
export const decideReviewReport = (user, coordination, id, { action, comment = '' }, { storage = browserStorage(), now = new Date().toISOString() } = {}) => {
  const key = validateScope(user, coordination)
  if (!['approve', 'request_changes', 'resubmit'].includes(action)) throw new Error('A ação de revisão é inválida.')
  if (typeof comment !== 'string' || comment.length > 2000) throw new Error('O comentário deve conter no máximo 2.000 caracteres.')
  const cleanComment = comment.trim()
  if (action === 'request_changes' && !cleanComment) throw new Error('Informe um comentário para solicitar a correção.')
  if (!isText(now) || !Number.isFinite(Date.parse(now))) throw new Error('A data da revisão é inválida.')
  const reports = listReviewReports(user, coordination, { storage })
  const report = reports.find((entry) => entry.id === id)
  if (!report) throw new Error('O relatório informado não está disponível nesta fila de apresentação.')
  if (action === 'resubmit' ? report.status !== 'CHANGES_REQUESTED' : report.status !== 'PENDING') {
    throw new Error('O relatório mudou de situação. Atualize a fila para continuar.')
  }
  report.status = action === 'approve' ? 'APPROVED' : action === 'request_changes' ? 'CHANGES_REQUESTED' : 'PENDING'
  if (action === 'resubmit') {
    report.revision_number += 1
    report.submitted_at = now
  }
  report.history.push({ action, author: user.name || 'Usuário autenticado', created_at: now,
    comment: action === 'resubmit' ? 'Reenvio de apresentação com as correções solicitadas.' : cleanComment })
  const serialized = JSON.stringify(reports)
  if (storage) {
    try { storage.setItem(key, serialized) } catch {
      throw new Error('Não foi possível salvar a revisão neste navegador. Libere o armazenamento local e tente novamente.')
    }
  } else memory.set(key, serialized)
  return clone(reports)
}
