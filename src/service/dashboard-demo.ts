import type { DashboardData, DashboardLoader } from '@/types/dashboard'
import { presentationReports } from './presentation-data.js'

const yearlyInspections = [
  { month: 'Nov/25', inspections: 6 },
  { month: 'Dez/25', inspections: 9 },
  { month: 'Jan/26', inspections: 8 },
  { month: 'Fev/26', inspections: 12 },
  { month: 'Mar/26', inspections: 18 },
  { month: 'Abr/26', inspections: 15 },
  { month: 'Mai/26', inspections: 8 },
  { month: 'Jun/26', inspections: 12 },
  { month: 'Jul/26', inspections: 18 },
  { month: 'Ago/26', inspections: 15 },
  { month: 'Set/26', inspections: 24 },
  { month: 'Out/26', inspections: 20 },
]

// Local UI data for this presentation branch; authentication continues to use the real session.
export const dashboardDemoData: DashboardData = {
  metrics: {
    municipalities: 42,
    forces: 4,
    reports: yearlyInspections.reduce((total, month) => total + month.inspections, 0),
    trends: { municipalities: '+8% no período' },
  },
  inspectionPeriods: {
    '6-months': yearlyInspections.slice(-6),
    '12-months': yearlyInspections,
    'current-year': yearlyInspections.slice(2),
  },
  recentReports: presentationReports.map((report) => ({
    id: report.id,
    municipality: report.cover?.municipality?.name ?? '',
    coordination: report.coordination?.code ?? null,
    author: report.created_by_name ?? null,
    date: report.created_at,
    status: report.status,
    viewHref: `/relatorios/${report.id}`,
    hasPdf: report.generated_document != null,
  })),
}

export const loadDashboardDemo: DashboardLoader = ({ signal }) => {
  if (signal.aborted) return Promise.reject(new DOMException('Solicitação cancelada.', 'AbortError'))
  return Promise.resolve(structuredClone(dashboardDemoData))
}
