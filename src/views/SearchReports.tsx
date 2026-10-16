import { useEffect, useRef, useState } from 'react'
import { FilterXIcon, LoaderCircleIcon, SearchIcon, XIcon } from 'lucide-react'
import { MunicipalityPicker } from '@/components/reports/MunicipalityPicker'
import { ReportPagination } from '@/components/reports/ReportPagination'
import { ReportsShell } from '@/components/reports/ReportsShell'
import { ReportsTable } from '@/components/reports/ReportsTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useReportAccessError, useReportDownload, useReportMunicipalities, useReports } from '@/hooks/use-reports'
import { parseReportSearch, reportSearchCorrectionHref, reportSearchHref } from '@/service/reports-navigation'
import type { Coordination, SessionUser } from '@/types/users'
import { presentationEnabled } from '@/service/presentation-config'
import { downloadPresentationExample, presentationReports, searchPresentationExamples } from '@/service/presentation-data'

type SearchReportsProps = {
  accessToken: string
  search: string
  coordination?: Coordination
  onNavigate: (href: string, replace?: boolean) => void
  onSessionInvalid: () => void
  refreshUser: () => Promise<SessionUser | null>
}

export default function SearchReports({ accessToken, search, coordination, onNavigate, onSessionInvalid, refreshUser }: SearchReportsProps) {
  const filters = parseReportSearch(search)
  const [municipalityId, setMunicipalityId] = useState(filters.municipalityId)
  const [typology, setTypology] = useState(filters.typology)
  const apiResults = useReports(accessToken, filters.municipalityId, filters.typology, filters.page)
  const municipalities = useReportMunicipalities(accessToken)
  const showExamples = presentationEnabled && ![401, 403].includes(apiResults.error?.status ?? 0)
    && (!apiResults.data || apiResults.data.pagination.total === 0)
  const catalogue = municipalities.data?.length ? municipalities.data : presentationEnabled
    ? presentationReports.map((report) => report.cover.municipality).filter((item, index, rows) => rows.findIndex((row) => row.name === item.name) === index) : []
  const results = showExamples ? { ...apiResults, data: searchPresentationExamples({ ...filters, municipalities: catalogue }), error: null, isLoading: false } : apiResults
  const download = useReportDownload(accessToken)
  useReportAccessError(apiResults.error, onSessionInvalid, refreshUser)
  useReportAccessError(municipalities.error, onSessionInvalid, refreshUser)
  useReportAccessError(download.error, onSessionInvalid, refreshUser)

  const onNavigateRef = useRef(onNavigate)
  const correctionHref = reportSearchCorrectionHref(filters, results.data?.pagination)
  useEffect(() => { onNavigateRef.current = onNavigate }, [onNavigate])
  useEffect(() => {
    if (correctionHref) onNavigateRef.current(correctionHref, true)
  }, [correctionHref])

  const searchHref = reportSearchHref(filters)
  const backHref = coordination ? `/relatorios/coordenacoes/${coordination.id}` : '/relatorios'
  const reset = () => {
    setMunicipalityId(null)
    setTypology('')
    download.clearError()
    onNavigate(reportSearchHref({ coordinationId: filters.coordinationId }))
    if (!filters.municipalityId && !filters.typology && filters.page === 1) results.reload()
  }
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    download.clearError()
    onNavigate(reportSearchHref({ municipalityId, typology, coordinationId: filters.coordinationId, page: 1 }))
    if (municipalityId === filters.municipalityId && typology.trim() === filters.typology && filters.page === 1) results.reload()
  }

  return <ReportsShell coordination={coordination} onBack={() => onNavigate(backHref)} backHref={backHref}>
    <div className="mx-auto w-full max-w-[1440px] pb-8 pt-9 sm:pb-10 sm:pt-12">
      <div className="mb-6 sm:mb-8">
        {coordination ? <h2 className="text-[26px] font-bold text-[#073574] sm:text-[30px]">Pesquisar Relatório</h2>
          : <h1 className="text-[26px] font-bold text-[#073574] sm:text-[30px]">Pesquisar Relatório</h1>}
        <span aria-hidden="true" className="ml-24 mt-2 block h-1.5 w-9 rounded-full bg-[#073574]" />
        <p className="mt-4 text-sm text-slate-600">Consulte relatórios de todas as coordenações.{showExamples && ' Dados de apresentação.'}</p>
      </div>
      <section aria-label="Pesquisa de relatórios" className="rounded-[28px] border border-[#dedede] bg-white p-5 shadow-[0_2px_16px_rgba(7,53,116,0.05)] sm:rounded-[40px] sm:p-7 lg:rounded-[48px] lg:p-9">
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_auto_auto] lg:items-end">
          <div className="min-w-0"><label htmlFor="report-municipality" className="mb-2 block text-base font-bold text-[#073574]">Município</label>
            <MunicipalityPicker municipalities={catalogue} value={municipalityId} onChange={setMunicipalityId} disabled={!presentationEnabled && (municipalities.isLoading || Boolean(municipalities.error))} />
          </div>
          <div className="min-w-0"><label htmlFor="report-typology" className="mb-2 block text-base font-bold text-[#073574]">Pleito / Tipologia</label>
            <Input id="report-typology" placeholder="Todas as tipologias" value={typology} maxLength={100} className="h-12 rounded-xl bg-white px-4 text-base" onChange={(event) => setTypology(event.target.value)} />
          </div>
          <Button type="submit" disabled={results.isLoading} className="h-12 gap-2 rounded-xl bg-[#4359f5] px-6 text-base font-semibold hover:bg-[#3447db]">
            {results.isLoading ? <LoaderCircleIcon aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" /> : <SearchIcon aria-hidden="true" className="size-5" />}
            {results.isLoading ? 'Pesquisando…' : 'Pesquisar'}
          </Button>
          <Button type="button" variant="secondary" className="h-12 gap-2 rounded-xl border border-[#d8d8d8] bg-[#e8e8e8] px-5 text-base font-semibold text-[#073574] hover:bg-[#dedede]" onClick={reset}><FilterXIcon aria-hidden="true" className="size-5" />Limpar Filtro</Button>
        </form>
        {municipalities.isLoading && !showExamples && <p role="status" className="mt-3 text-sm text-slate-500">Carregando municípios…</p>}
        {municipalities.error && !showExamples && <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p>Não foi possível carregar os municípios. {municipalities.error.message}</p><Button variant="outline" className="mt-3 h-11 bg-white" onClick={municipalities.reload}>Tentar novamente</Button>
        </div>}
        <p role="status" aria-live="polite" className="mb-3 mt-6 text-sm text-slate-500 sm:text-base">{results.isLoading ? 'Consultando resultados…' : results.data ? <><strong className="font-bold text-[#073574]">{results.data.pagination.total}</strong> {results.data.pagination.total === 1 ? 'resultado encontrado' : 'resultados encontrados'}</> : 'A pesquisa não pôde ser concluída.'}</p>
        {download.error && <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>Não foi possível baixar o documento. {download.error.message}</p><Button variant="ghost" className="size-9 shrink-0" aria-label="Fechar erro de download" onClick={download.clearError}><XIcon aria-hidden="true" className="size-4" /></Button></div>}
        {results.error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-red-800">
          <p>{results.error.status === 403 ? 'Você não tem permissão para consultar relatórios. Sua sessão foi revalidada.' : results.error.message}</p><Button variant="outline" className="mt-4 h-11 bg-white" onClick={results.reload}>Tentar novamente</Button>
        </div> : <>
          <ReportsTable reports={results.data?.reports ?? []} isLoading={results.isLoading} searchHref={searchHref} busyId={download.busyId} onNavigate={onNavigate}
            onDownload={(id) => { if (!downloadPresentationExample(id)) download.download(id) }} />
          {results.data && <ReportPagination pagination={results.data.pagination} disabled={results.isLoading} onPage={(page) => onNavigate(reportSearchHref({ ...filters, page }))} />}
        </>}
      </section>
    </div>
  </ReportsShell>
}
