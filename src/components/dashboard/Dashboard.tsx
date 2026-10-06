import { lazy, Suspense } from 'react'
import { DataTable } from "@/components/data-table"
import { SectionCards } from "@/components/section-cards"
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardData, DashboardState, RecentReport } from '@/types/dashboard'

const ChartAreaInteractive = lazy(() => import('@/components/chart-area-interactive').then((module) => ({ default: module.ChartAreaInteractive })))

export default function Dashboard({ data, state, onViewReport }: {
  data: DashboardData
  state: DashboardState
  onViewReport?: (report: RecentReport) => void
}) {
  return (
    <div aria-busy={state === 'loading'} className="flex min-w-0 flex-col gap-6 lg:gap-7">
      {state === 'loading' && <p className="sr-only" role="status">Carregando indicadores, vistorias e relatórios…</p>}
      <SectionCards metrics={data.metrics} state={state} />
      <Suspense fallback={<div role="status" aria-label="Carregando gráfico de vistorias" className="rounded-xl border bg-card p-6"><Skeleton className="mb-5 h-5 w-44" /><Skeleton className="h-64 w-full" /></div>}>
        <ChartAreaInteractive periods={data.inspectionPeriods} state={state} />
      </Suspense>
      <DataTable reports={data.recentReports} state={state} onViewReport={onViewReport} />
    </div>
  )
}
