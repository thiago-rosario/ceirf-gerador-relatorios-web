import { useState } from 'react'
import { FileTextIcon, InfoIcon, RefreshCwIcon } from 'lucide-react'
import Dashboard from '@/components/dashboard/Dashboard'
import { ReportPreviewDialog } from '@/components/dashboard/ReportPreviewDialog'
import { Button } from '@/components/ui/button'
import { useDashboardData } from '@/hooks/use-dashboard-data'

/**
 * @param {{
 *   accessToken: string,
 *   loadData?: import('../types/dashboard').DashboardLoader,
 *   isDemo?: boolean,
 *   onNavigateReports: () => void
 * }} props
 */
export default function Home({ accessToken, loadData, isDemo = false, onNavigateReports }) {
  const { data, state, error, retry } = useDashboardData(accessToken, loadData)
  const [previewReport, setPreviewReport] = useState(
    /** @type {import('../types/dashboard').RecentReport | null} */ (null),
  )

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

      {isDemo && (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          <p><strong className="font-semibold text-primary">Dados demonstrativos.</strong> Indicadores, autores e status são exemplos para visualizar o dashboard.</p>
        </div>
      )}
      {!isDemo && state === 'unavailable' && (
        <div role="status" className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed text-muted-foreground">
          <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>Os indicadores e relatórios serão exibidos quando os dados estiverem disponíveis.</p>
        </div>
      )}
      {state === 'error' && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
          <p>{error}</p>
          <Button variant="outline" className="h-11 gap-2 bg-card" onClick={retry}>
            <RefreshCwIcon aria-hidden="true" />Tentar novamente
          </Button>
        </div>
      )}
      <Dashboard data={data} state={state} onViewReport={isDemo ? setPreviewReport : undefined} />
      <ReportPreviewDialog report={previewReport} onClose={() => setPreviewReport(null)} />
    </div>
  )
}
