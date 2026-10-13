import { request } from './api-client.js'
import { isReportId } from './reports-navigation.js'

const invalidResponse = () => new Error('O servidor retornou dados do dashboard inválidos. Tente novamente.')
const isText = (value) => typeof value === 'string' && value.trim().length > 0
const isCount = (value) => Number.isSafeInteger(value) && value >= 0
const isId = (value) => Number.isSafeInteger(value) && value > 0
const isDate = (value) => isText(value) && !Number.isNaN(Date.parse(value))

/** @param {Date} [today] */
export const dashboardMonths = (today = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bahia', year: 'numeric', month: '2-digit' }).formatToParts(today)
  const year = Number(parts.find((part) => part.type === 'year').value)
  const month = Number(parts.find((part) => part.type === 'month').value)
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 12 + index, 1))
    return date.toISOString().slice(0, 7)
  })
  return { '6-months': months.slice(-6), '12-months': months, 'current-year': months.filter((value) => value.startsWith(`${year}-`)) }
}

const monthLabel = (month) => {
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' })
    .format(new Date(`${month}-01T12:00:00Z`)).replace('.', '')
  return label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1).replace(' de ', '/')
}

const loadMonthlyCount = async (accessToken, month, signal) => {
  const data = await request(`/reports/count-by-month?${new URLSearchParams({ month })}`, { accessToken, signal })
  if (data?.month !== month || !Array.isArray(data.counts) || data.counts.length > 1
    || !data.counts.every((entry) => entry?.month === month && isCount(entry.count))) throw invalidResponse()
  return { month: monthLabel(month), inspections: data.counts[0]?.count ?? 0 }
}

const validateDashboard = (data) => {
  if (!isCount(data?.total_reports) || !Array.isArray(data.reports) || data.reports.length > data.total_reports) throw invalidResponse()
  const identifiers = new Set()
  for (const report of data.reports) {
    const municipality = report?.cover?.municipality
    if (!isReportId(report?.id) || identifiers.has(report.id.toLowerCase()) || !isText(report.status) || !isDate(report.created_at)
      || !(report.coordination_id == null || isId(report.coordination_id))
      || !(report.cover === null || (typeof report.cover?.typology === 'string'
        && (municipality === null || (isId(municipality?.id) && isText(municipality.name) && municipality.state_code === 'BA'))))
      || !(report.generated_document === null || (isText(report.generated_document?.file_name) && isDate(report.generated_document?.generated_at)))) throw invalidResponse()
    identifiers.add(report.id.toLowerCase())
  }
  return data
}

const loadCoordinations = async (accessToken, signal) => {
  const data = await request('/coordinations', { accessToken, signal })
  if (!Array.isArray(data?.coordinations) || !data.coordinations.every((coordination) => isId(coordination?.id) && isText(coordination.code) && isText(coordination.name))) throw invalidResponse()
  return new Map(data.coordinations.map((coordination) => [coordination.id, coordination.code]))
}

/** @param {{ accessToken: string, signal: AbortSignal, today?: Date }} context
 * @returns {Promise<import('../types/dashboard').DashboardData>} */
export const loadDashboard = async ({ accessToken, signal, today }) => {
  const periods = dashboardMonths(today)
  const months = periods['12-months']
  // These endpoints are independent. Partial chart/catalogue failures must not replace real reports with examples.
  const results = await Promise.allSettled([
    request('/reports/dashboard', { accessToken, signal }).then(validateDashboard),
    loadCoordinations(accessToken, signal),
    ...months.map((month) => loadMonthlyCount(accessToken, month, signal)),
  ])
  if (signal.aborted) throw new DOMException('Solicitação cancelada.', 'AbortError')
  const accessFailure = results.find((result) => result.status === 'rejected' && [401, 403].includes(result.reason?.status))
  if (accessFailure) throw accessFailure.reason
  const [dashboard, coordinations, ...monthly] = results
  if (dashboard.status === 'rejected') throw dashboard.reason
  const notices = []
  if (coordinations.status === 'rejected') notices.push('Não foi possível carregar os nomes das coordenações. Os demais dados estão disponíveis.')
  const counts = new Map(months.flatMap((month, index) => monthly[index].status === 'fulfilled' ? [[month, monthly[index].value]] : []))
  const inspectionPeriods = Object.fromEntries(Object.entries(periods)
    .filter(([, periodMonths]) => periodMonths.every((month) => counts.has(month)))
    .map(([period, periodMonths]) => [period, periodMonths.map((month) => counts.get(month))]))
  if (monthly.some((result) => result.status === 'rejected')) notices.push('Não foi possível carregar todos os meses. Os períodos incompletos estão indisponíveis; tente atualizar os dados.')
  return {
    metrics: { municipalities: null, forces: null, reports: dashboard.value.total_reports },
    inspectionPeriods,
    recentReports: [...dashboard.value.reports].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 10).map((report) => ({
      id: report.id,
      municipality: report.cover?.municipality?.name ?? '',
      coordination: coordinations.status === 'fulfilled' ? coordinations.value.get(report.coordination_id) ?? null : null,
      // The API supplies the author's UUID, but no public display name. Do not request the restricted users catalogue.
      author: null,
      date: report.created_at,
      status: report.status,
      viewHref: `/relatorios/${report.id}`,
      hasPdf: report.generated_document !== null,
    })),
    notices,
  }
}
