export type DashboardPeriod = '6-months' | '12-months' | 'current-year'

export type InspectionPoint = {
  month: string
  inspections: number
}

export type DashboardMetrics = {
  reports: number | null
}

// UI selections only. Wire values must be mapped by a confirmed API adapter.
export type DashboardIndicatorPeriod = '7-days' | '30-days' | '6-months' | 'all-time'

// Presentation models, not a proposed HTTP response or a local force catalogue.
export type DashboardCompletion = {
  percentage: number | null
  completedReports?: number | null
  totalReports?: number | null
}

export type DashboardForceInspections = {
  code: string
  name: string
  count: number
}

export type DashboardIndicators = {
  municipalities: number | null
  reports: number | null
  completion: DashboardCompletion | null
  forces: DashboardForceInspections[] | null
}

export type DashboardIndicatorsLoader = (context: {
  accessToken: string
  period: DashboardIndicatorPeriod
  signal: AbortSignal
}) => Promise<DashboardIndicators | null>

export type DashboardIndicatorsQuery = {
  data: DashboardIndicators | null
  state: DashboardState
  error: (Error & { status?: number }) | null
  retry: () => void
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
  hasPdf?: boolean
}

export type ReportActionProps = {
  onViewReport?: (report: RecentReport) => void
  onDownloadReport?: (report: RecentReport) => void
  downloadBusyId?: string | null
}

// Presentation model adapted from the authenticated Laravel responses.
export type DashboardData = {
  metrics: DashboardMetrics
  inspectionPeriods: Partial<Record<DashboardPeriod, InspectionPoint[]>>
  recentReports: RecentReport[]
  notices?: string[]
}

export type DashboardState = 'unavailable' | 'loading' | 'ready' | 'error'

export type DashboardLoader = (context: {
  accessToken: string
  signal: AbortSignal
}) => Promise<DashboardData>
