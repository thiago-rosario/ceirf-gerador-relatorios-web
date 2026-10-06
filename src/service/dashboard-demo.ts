import type { DashboardData, DashboardLoader } from '@/types/dashboard'

// Demonstration data only. Replace this loader with an adapter for the real API.
// This model describes the UI's needs; it does not define business permissions,
// report status transitions, or the future backend's endpoints.
export const dashboardDemoData: DashboardData = {
  metrics: {
    municipalities: 42,
    forces: 4,
    reports: 128,
    trends: { municipalities: '+8% no período' },
  },
  inspectionPeriods: {
    '6-months': [
      { month: 'Mai/26', inspections: 8 },
      { month: 'Jun/26', inspections: 12 },
      { month: 'Jul/26', inspections: 18 },
      { month: 'Ago/26', inspections: 15 },
      { month: 'Set/26', inspections: 24 },
      { month: 'Out/26', inspections: 20 },
    ],
    '12-months': [
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
    ],
    'current-year': [
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
    ],
  },
  recentReports: [
    { id: 'demo-1', municipality: 'Salvador', coordination: 'COTEC', author: 'João Silva', date: '2026-10-02', status: 'completed' },
    { id: 'demo-2', municipality: 'Camaçari', coordination: 'COPROJ', author: 'Ana Santos', date: '2026-09-30', status: 'in_review' },
    { id: 'demo-3', municipality: 'Ilhéus', coordination: 'CORMAN', author: 'Mariana Costa', date: '2026-09-28', status: 'approved' },
    { id: 'demo-4', municipality: 'Feira de Santana', coordination: 'COTEC', author: 'Paulo Oliveira', date: '2026-09-25', status: 'draft' },
  ],
}

export const loadDashboardDemo: DashboardLoader = ({ signal }) => {
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'))
  return Promise.resolve(dashboardDemoData)
}
