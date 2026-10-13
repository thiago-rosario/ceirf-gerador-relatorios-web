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
