import type { ReactNode } from 'react'
import { CircleCheckIcon, FileTextIcon, MapPinIcon, type LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardIndicatorsQuery, DashboardMetrics, DashboardState } from '@/types/dashboard'

const formatCount = (value: number) => value.toLocaleString('pt-BR')

function MetricCard({ title, icon: Icon, scope, value, loading, description, children }: {
  title: string
  icon: LucideIcon
  scope: string
  value: string | null
  loading: boolean
  description: string
  children?: ReactNode
}) {
  return (
    <Card className="min-w-0 gap-5 border border-border bg-card p-5 shadow-none ring-0 sm:p-6" aria-busy={loading}>
      <div className="flex min-h-16 items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-sm font-medium text-slate-700">{title}</h2>
          <p className="text-xs text-slate-500">{scope}</p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-primary">
          <Icon aria-hidden="true" className="size-5" strokeWidth={1.7} />
        </span>
      </div>
      <div className="text-4xl font-semibold tracking-tight text-primary tabular-nums">
        {loading ? <Skeleton className="h-10 w-24" aria-label="Carregando indicador" /> : value ?? <span aria-label="Dados indisponíveis">—</span>}
      </div>
      <div className="mt-auto space-y-3">
        {children}
        <p className="text-xs leading-5 text-slate-600">{loading ? 'Carregando dados do período…' : description}</p>
      </div>
    </Card>
  )
}

export function SectionCards({ metrics, state, indicators }: {
  metrics: DashboardMetrics
  state: DashboardState
  indicators: DashboardIndicatorsQuery
}) {
  const data = indicators.state === 'ready' ? indicators.data : null
  const loading = indicators.state === 'loading'
  const unavailable = indicators.state === 'error' ? 'Não foi possível carregar este indicador.' : 'Dados do período ainda indisponíveis.'
  const scopedReports = data?.reports != null
  const reports = scopedReports ? data.reports : state === 'ready' ? metrics.reports : null
  const completion = data?.completion
  const percentage = completion?.percentage
  // Display the supplied rate without inferring it from counts or status.
  const hasPercentage = typeof percentage === 'number' && Number.isFinite(percentage) && percentage >= 0 && percentage <= 100
  const hasCompletionCounts = completion?.completedReports != null && completion.totalReports != null

  return (
    <section aria-label="Indicadores principais" className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-3">
      <MetricCard title="Municípios Visitados" icon={MapPinIcon} scope="Período selecionado"
        value={data?.municipalities == null ? null : formatCount(data.municipalities)} loading={loading}
        description={data?.municipalities == null ? unavailable : 'Municípios distintos com visitas no período.'} />
      <MetricCard title="Relatórios Registrados" icon={FileTextIcon} scope={scopedReports ? 'Período selecionado' : 'Todo o histórico'}
        value={reports == null ? null : formatCount(reports)} loading={loading || (!scopedReports && state === 'loading')}
        description={reports == null ? 'Relatórios ainda não disponíveis.' : scopedReports ? 'Registros considerados nos indicadores do período.' : 'Registros acessíveis à sua sessão, incluindo rascunhos e revisões. O período global ainda não se aplica a este total.'} />
      <MetricCard title="Taxa de Conclusão" icon={CircleCheckIcon} scope="Período selecionado"
        value={hasPercentage ? `${percentage.toLocaleString('pt-BR')}%` : null} loading={loading}
        description={completion == null ? unavailable : hasPercentage ? 'Conclusão dos relatórios considerados no período.' : 'Sem base válida para calcular a taxa neste período.'}>
        {loading ? <Skeleton className="h-2 w-full" /> : hasPercentage ? (
          <div role="progressbar" aria-label="Taxa de conclusão dos relatórios" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}
            className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary" style={{ width: `${percentage}%` }} />
          </div>
        ) : <div aria-hidden="true" className="h-2 rounded-full border border-dashed border-slate-200 bg-slate-50" />}
        {!loading && hasCompletionCounts && <p className="text-xs font-medium text-slate-700 tabular-nums">{formatCount(completion.completedReports!)} de {formatCount(completion.totalReports!)} relatórios concluídos</p>}
      </MetricCard>
    </section>
  )
}
