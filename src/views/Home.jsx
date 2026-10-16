import { FileTextIcon, InfoIcon, RefreshCwIcon } from 'lucide-react'
import Dashboard from '@/components/dashboard/Dashboard'
import { Button } from '@/components/ui/button'
import { useDashboardData } from '@/hooks/use-dashboard-data'
import { useReportAccessError, useReportDownload } from '@/hooks/use-reports'
import { downloadPresentationExample } from '@/service/presentation-data'

const noSessionAction = () => {}
const noRefresh = async () => null

/**
 * @param {{
 *   accessToken: string,
 *   loadData?: import('../types/dashboard').DashboardLoader,
 *   onNavigateReports: () => void,
 *   onNavigateReport?: (id: string) => void,
 *   onSessionInvalid?: () => void,
 *   refreshUser?: () => Promise<import('../types/users').SessionUser | null>
 * }} props
 */
export default function Home({ accessToken, loadData, onNavigateReports, onNavigateReport, onSessionInvalid = noSessionAction, refreshUser = noRefresh }) {
  const { data, state, error, retry } = useDashboardData(accessToken, loadData)
  const download = useReportDownload(accessToken)
  useReportAccessError(error || download.error, onSessionInvalid, refreshUser)

  return (
    <div id="visao-geral" className="flex min-w-0 flex-col gap-6 lg:gap-7">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-primary lg:text-3xl">Visão Geral</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Acompanhe os registros e atividades das coordenações da CEIRF.</p>
        </div>
        <Button nativeButton={false} render={<a href="/relatorios" />} className="h-11 gap-2 px-5"
          onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            event.preventDefault()
            onNavigateReports()
          }}>
          <FileTextIcon aria-hidden="true" />Relatórios
        </Button>
      </div>

      {state === 'ready' && (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>Dados de apresentação.</p>
        </div>
      )}
      {data.notices?.length > 0 && (
        <div role="alert" className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {data.notices.map((notice) => <p key={notice}>{notice}</p>)}
          <Button variant="outline" className="h-11 gap-2 bg-card" onClick={retry}><RefreshCwIcon aria-hidden="true" />Atualizar dados</Button>
        </div>
      )}
      {state === 'error' && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
          <p>{error?.status === 401 ? 'Sua sessão expirou. Entre novamente para continuar.' : error?.status === 403 ? 'Acesso ao dashboard não autorizado. Verifique as permissões da sua sessão.' : error?.status === 404 ? 'O dashboard ainda não está disponível nesta instalação da API.' : error?.message}</p>
          <Button variant="outline" className="h-11 gap-2 bg-card" onClick={retry}>
            <RefreshCwIcon aria-hidden="true" />Tentar novamente
          </Button>
        </div>
      )}
      {download.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{download.error.message}</p>}
      <Dashboard data={data} state={state} onViewReport={onNavigateReport ? (report) => onNavigateReport(report.id) : undefined}
        onDownloadReport={(report) => {
          if (!downloadPresentationExample(report.id)) download.download(report.id)
        }} downloadBusyId={download.busyId} />
    </div>
  )
}
