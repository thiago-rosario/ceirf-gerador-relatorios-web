import { useState } from 'react'
import { FileTextIcon, RefreshCwIcon } from 'lucide-react'
import Dashboard from '@/components/dashboard/Dashboard'
import { DashboardPeriodFilter } from '@/components/dashboard/DashboardPeriodFilter'
import { Button } from '@/components/ui/button'
import { useDashboardData } from '@/hooks/use-dashboard-data'
import { useDashboardIndicators } from '@/hooks/use-dashboard-indicators'
import { useReportAccessError, useReportDownload } from '@/hooks/use-reports'

const noSessionAction = () => {}
const noRefresh = async () => null

/**
 * @param {{
 *   accessToken: string,
 *   loadData?: import('../types/dashboard').DashboardLoader,
 *   loadIndicators?: import('../types/dashboard').DashboardIndicatorsLoader,
 *   onNavigateReports: () => void,
 *   onNavigateReport?: (id: string) => void,
 *   onSessionInvalid?: () => void,
 *   refreshUser?: () => Promise<import('../types/users').SessionUser | null>
 * }} props
 */
export default function Home({ accessToken, loadData, loadIndicators, onNavigateReports, onNavigateReport, onSessionInvalid = noSessionAction, refreshUser = noRefresh }) {
  const [period, setPeriod] = useState(/** @type {import('../types/dashboard').DashboardIndicatorPeriod} */ ('30-days'))
  const { data, state, error, retry } = useDashboardData(accessToken, loadData)
  const indicators = useDashboardIndicators(accessToken, period, loadIndicators)
  const download = useReportDownload(accessToken)
  useReportAccessError(error || download.error, onSessionInvalid, refreshUser)
  useReportAccessError(indicators.error, onSessionInvalid, refreshUser)

  return (
    <div id="visao-geral" className="flex min-w-0 flex-col gap-6 lg:gap-7">
      <header className="space-y-4 border-b border-border pb-6">
        <div className="flex min-w-0 flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Acompanhamento institucional</p>
            <h1 className="text-2xl font-semibold tracking-tight text-primary lg:text-3xl">Visão Geral</h1>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">Acompanhe os registros e atividades das coordenações da CEIRF.</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end">
            <DashboardPeriodFilter value={period} onChange={setPeriod} />
            <Button nativeButton={false} render={<a href="/relatorios" />} className="h-11 gap-2 px-5"
              onClick={(event) => {
                if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                event.preventDefault()
                onNavigateReports()
              }}>
              <FileTextIcon aria-hidden="true" />Relatórios
            </Button>
          </div>
        </div>
        <p id="dashboard-period-help" className="max-w-3xl text-xs leading-5 text-slate-600">
          {indicators.state === 'unavailable' ? 'A consulta dos indicadores por período ainda não está disponível. ' : 'O período selecionado se aplica aos novos indicadores. '}
          O gráfico mensal e os relatórios recentes mantêm suas consultas independentes.
        </p>
      </header>
      {indicators.state === 'error' && (
        <div role="alert" className="flex flex-col items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center">
          <p>{indicators.error?.status === 401 ? 'Sua sessão expirou. Entre novamente para consultar os indicadores.' : indicators.error?.status === 403 ? 'Acesso aos indicadores não autorizado para sua sessão.' : 'Não foi possível atualizar os indicadores deste período. As demais seções mantêm suas consultas independentes.'}</p>
          <Button variant="outline" className="h-11 gap-2 bg-card" onClick={indicators.retry}><RefreshCwIcon aria-hidden="true" />Atualizar indicadores</Button>
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
      <Dashboard data={data} state={state} indicators={indicators} onViewReport={onNavigateReport ? (report) => onNavigateReport(report.id) : undefined}
        onDownloadReport={(report) => download.download(report.id)} downloadBusyId={download.busyId} />
    </div>
  )
}
