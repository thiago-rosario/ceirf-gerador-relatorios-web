export type DashboardPeriod = '6-months' | '12-months' | 'current-year'

export type InspectionPoint = {
  month: string
  inspections: number
}

export type DashboardMetrics = {
  municipalities: number | null
  forces: number | null
  reports: number | null
  trends?: Partial<Record<'municipalities' | 'forces' | 'reports', string>>
}

export type RecentReport = {
  id: string
  municipality: string
  coordination: string | null
  author: string | null
  date: string | null
  status: string | null
  viewHref?: string
  downloadHref?: string
}

// Presentation model. A future API adapter should map its actual contract here.
export type DashboardData = {
  metrics: DashboardMetrics
  inspectionPeriods: Partial<Record<DashboardPeriod, InspectionPoint[]>>
  recentReports: RecentReport[]
}

export type DashboardState = 'unavailable' | 'loading' | 'ready' | 'error'

export type DashboardLoader = (context: {
  accessToken: string
  signal: AbortSignal
}) => Promise<DashboardData>
