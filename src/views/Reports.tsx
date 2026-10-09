import { useEffect } from 'react'
import { LoaderCircleIcon } from 'lucide-react'
import { CoordinationSelection, GlobalReportSearch } from '@/components/reports/CoordinationSelection'
import { ReportsShell } from '@/components/reports/ReportsShell'
import { Button } from '@/components/ui/button'
import { useCoordinations } from '@/hooks/use-coordinations'
import { canAccessReportsRoute, getReportPermissions, getReportsRoute } from '@/service/reports-access'
import type { SessionUser } from '@/types/users'
import CoordinationActions from './CoordinationActions'
import ReportDestination from './ReportDestination'

type ReportsProps = {
  pathname: string
  accessToken: string
  user: SessionUser
  onBack: () => void
  onNavigate: (href: string) => void
  onSessionInvalid: () => void
  refreshUser: () => Promise<SessionUser | null>
}

export default function Reports({ pathname, accessToken, user, onBack, onNavigate, onSessionInvalid, refreshUser }: ReportsProps) {
  const route = getReportsRoute(pathname)
  const allowed = canAccessReportsRoute(user, route)
  const needsCoordination = allowed && route?.screen !== 'search'
  const { coordinations, error, isLoading, reload } = useCoordinations(accessToken, needsCoordination, refreshUser)
  const selected = route && 'coordinationId' in route
    ? coordinations.find((coordination) => coordination.id === route.coordinationId) : undefined

  useEffect(() => {
    if (error && 'status' in error && error.status === 401) onSessionInvalid()
  }, [error, onSessionInvalid])

  const backToCoordinations = () => onNavigate('/relatorios')

  if (allowed && route?.screen === 'list') return (
    <ReportsShell onBack={onBack} backHref="/dashboard">
      <CoordinationSelection coordinations={coordinations} isLoading={isLoading} error={error} onRetry={reload} onNavigate={onNavigate} />
    </ReportsShell>
  )
  if (allowed && route?.screen === 'search') return <ReportDestination screen="search" onBack={backToCoordinations} />
  if (allowed && selected && !isLoading && route?.screen === 'actions') return (
    <CoordinationActions coordination={selected} user={user} onBack={backToCoordinations} onNavigate={onNavigate} />
  )
  if (allowed && selected && !isLoading && (route?.screen === 'create' || route?.screen === 'review')) return (
    <ReportDestination screen={route.screen} coordination={selected} onBack={() => onNavigate(`/relatorios/coordenacoes/${selected.id}`)} />
  )

  return (
    <ReportsShell onBack={backToCoordinations}>
      <div className="mx-auto flex w-full max-w-[1008px] flex-1 flex-col justify-center gap-6 py-10 sm:py-14">
        {!route ? <>
          <h1 className="text-2xl font-bold text-primary">Página não encontrada</h1>
          <p role="alert" className="text-slate-600">Este endereço de relatórios é inválido.</p>
        </> : !allowed ? <>
          <h1 className="text-2xl font-bold text-primary">Acesso restrito</h1>
          <p role="alert" className="text-slate-600">Você não tem permissão para acessar esta ação nesta coordenação.</p>
        </> : isLoading ? <>
          <h1 className="sr-only">Relatórios por coordenação</h1>
          <p role="status" className="flex items-center justify-center gap-3 text-slate-600">
            <LoaderCircleIcon aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
            Carregando coordenações…
          </p>
        </> : <>
          <h1 className="text-2xl font-bold text-primary">Coordenação indisponível</h1>
          {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
            <p>{error.message}</p>
            <Button variant="outline" className="mt-3 h-11 bg-white" onClick={reload}>Tentar novamente</Button>
          </div>}
          {!error && <p role="status" className="text-center text-slate-600">A coordenação informada não está disponível no catálogo.</p>}
        </>}
        {getReportPermissions(user, undefined).search && <GlobalReportSearch onNavigate={onNavigate} />}
      </div>
    </ReportsShell>
  )
}
