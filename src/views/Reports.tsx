import { useEffect } from 'react'
import { LoaderCircleIcon, SearchIcon } from 'lucide-react'
import { CoordinationCard } from '@/components/reports/CoordinationCard'
import { ReportsShell } from '@/components/reports/ReportsShell'
import { Button } from '@/components/ui/button'
import { useCoordinations } from '@/hooks/use-coordinations'
import { canAccessReportsRoute, getReportPermissions, getReportsRoute } from '@/service/reports-access'
import type { Coordination, SessionUser } from '@/types/users'
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
  const catalogueRestricted = error && 'status' in error && error.status === 403
  // /me can supply a real membership when the administrative catalogue is restricted.
  const availableCoordinations: Coordination[] = catalogueRestricted && user.coordination
    ? [user.coordination] : coordinations
  const selected = route && 'coordinationId' in route
    ? availableCoordinations.find((coordination) => coordination.id === route.coordinationId) : undefined

  useEffect(() => {
    if (error && 'status' in error && error.status === 401) onSessionInvalid()
  }, [error, onSessionInvalid])

  const backToCoordinations = () => onNavigate('/relatorios')

  if (allowed && route?.screen === 'search') return <ReportDestination screen="search" onBack={backToCoordinations} />
  if (allowed && selected && !isLoading && route?.screen === 'actions') return (
    <CoordinationActions coordination={selected} user={user} onBack={backToCoordinations} onNavigate={onNavigate} />
  )
  if (allowed && selected && !isLoading && (route?.screen === 'create' || route?.screen === 'review')) return (
    <ReportDestination screen={route.screen} coordination={selected} onBack={() => onNavigate(`/relatorios/coordenacoes/${selected.id}`)} />
  )

  const isList = route?.screen === 'list'
  return (
    <ReportsShell onBack={isList ? onBack : backToCoordinations} backHref={isList ? '/dashboard' : '/relatorios'}>
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
          <h1 className={isList ? 'sr-only' : 'text-2xl font-bold text-primary'}>
            {isList ? 'Relatórios por coordenação' : 'Coordenação indisponível'}
          </h1>
          {error && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
            <p>{catalogueRestricted
              ? 'Não foi possível acessar o catálogo completo de coordenações. Você pode pesquisar relatórios de todas as coordenações e acessar sua coordenação, quando vinculada à sua conta.'
              : error.message}</p>
            <Button variant="outline" className="mt-3 h-11 bg-white" onClick={reload}>Tentar novamente</Button>
          </div>}
          {isList && availableCoordinations.length > 0 ? (
            <div className="flex w-full flex-wrap justify-center gap-6 lg:gap-x-20 lg:gap-y-12">
              {availableCoordinations.map((coordination) => <CoordinationCard key={coordination.id} coordination={coordination} onNavigate={onNavigate} />)}
            </div>
          ) : !error && <p role="status" className="text-center text-slate-600">
            {isList ? 'Nenhuma coordenação disponível no momento.' : 'A coordenação informada não está disponível no catálogo acessível à sua conta.'}
          </p>}
        </>}
        {!isLoading && getReportPermissions(user, undefined).search && <Button nativeButton={false} render={<a href="/relatorios/pesquisar" />} variant="ghost" className="h-auto min-h-11 self-center whitespace-normal text-primary"
          onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            event.preventDefault()
            onNavigate('/relatorios/pesquisar')
          }}><SearchIcon aria-hidden="true" />Pesquisar relatórios de todas as coordenações</Button>}
      </div>
    </ReportsShell>
  )
}
