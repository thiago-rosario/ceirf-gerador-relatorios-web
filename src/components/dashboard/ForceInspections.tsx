import { useId } from 'react'
import { ShieldCheckIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardForceInspections, DashboardState } from '@/types/dashboard'

export function ForceInspections({ forces, state }: {
  forces: DashboardForceInspections[] | null
  state: DashboardState
}) {
  const id = useId()
  const visibleForces = state === 'ready' ? forces : null
  // Shared SVG coordinates control bar geometry only; counts are never aggregated.
  const barScale = Math.max(1, ...(visibleForces ?? []).map((force) => force.count))
  return (
    <section aria-labelledby={`forces-title-${id}`} aria-busy={state === 'loading'} className="min-w-0 overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-start gap-3 border-b border-border px-5 py-5 sm:px-6">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-primary"><ShieldCheckIcon aria-hidden="true" className="size-5" /></span>
        <div className="min-w-0 space-y-1">
          <h2 id={`forces-title-${id}`} className="text-lg font-semibold text-primary">Vistorias por Força</h2>
          <p className="text-sm leading-6 text-slate-600">Distribuição das vistorias entre as forças institucionais no período selecionado.</p>
        </div>
      </div>
      {state === 'loading' ? (
        <div role="status" aria-label="Carregando vistorias por força" className="space-y-5 p-5 sm:p-6">
          {Array.from({ length: 3 }, (_, index) => <div key={index} className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-2 w-full" /></div>)}
        </div>
      ) : visibleForces && visibleForces.length > 0 ? (
        <ul className="grid gap-x-10 gap-y-6 p-5 sm:p-6 lg:grid-cols-2">
          {visibleForces.map((force) => <li key={force.code} className="min-w-0 space-y-2.5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-baseline gap-2.5">
                <span className="shrink-0 text-sm font-semibold text-primary">{force.code}</span>
                <span className="min-w-0 break-words text-sm text-slate-600">{force.name}</span>
              </div>
              <span className="shrink-0 text-sm font-semibold text-slate-800 tabular-nums">{force.count.toLocaleString('pt-BR')}<span className="sr-only"> vistorias</span></span>
            </div>
            <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-slate-100">
              <svg className="h-full w-full text-primary" viewBox={`0 0 ${barScale} 8`} preserveAspectRatio="none"><rect width={force.count} height={8} fill="currentColor" /></svg>
            </div>
          </li>)}
        </ul>
      ) : (
        <div className="flex flex-col gap-1.5 px-5 py-7 sm:px-6">
          <p className="text-sm font-medium text-slate-800">{state === 'error' ? 'Não foi possível carregar a distribuição' : visibleForces ? 'Nenhuma vistoria registrada neste período' : 'Distribuição ainda indisponível'}</p>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">{state === 'error' ? 'Tente atualizar os indicadores. O gráfico mensal e os relatórios recentes continuam disponíveis.' : visibleForces ? 'As vistorias aparecerão aqui quando houver registros no período selecionado.' : 'As quantidades por força serão exibidas quando os dados do período estiverem disponíveis.'}</p>
        </div>
      )}
    </section>
  )
}
