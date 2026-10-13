import { CalendarDaysIcon, DownloadIcon, ExternalLinkIcon, FileTextIcon, FingerprintIcon, LoaderCircleIcon, MapPinIcon } from 'lucide-react'
import { ReportsShell } from '@/components/reports/ReportsShell'
import { ReportPdfViewer } from '@/components/reports/ReportPdfViewer'
import { Button } from '@/components/ui/button'
import { useReport, useReportAccessError, useReportDownload, useReportPdf } from '@/hooks/use-reports'
import { reportDateLabel, reportReturnHref } from '@/service/reports-navigation'
import { getReportPermissions } from '@/service/reports-access'
import type { SessionUser } from '@/types/users'

type ViewReportProps = {
  accessToken: string
  reportId: string
  search: string
  onNavigate: (href: string) => void
  onSessionInvalid: () => void
  refreshUser: () => Promise<SessionUser | null>
  user?: SessionUser
}

export function ReportInformation({ report }: { report: import('@/types/reports').Report }) {
  return <dl className="grid grid-cols-1 gap-4 rounded-xl border border-[#d8d8d8] bg-white p-5 sm:grid-cols-2 lg:grid-cols-[1.1fr_1.4fr_1fr_0.8fr] lg:gap-0 lg:rounded-none lg:px-4">
    {[
      { name: 'ID', value: report.id, Icon: FingerprintIcon },
      { name: 'Município', value: report.cover?.municipality?.name ?? 'Não informado', Icon: MapPinIcon },
      { name: 'Tipo', value: report.cover?.typology ?? 'Não informado', Icon: FileTextIcon },
      { name: 'Data', value: reportDateLabel(report), Icon: CalendarDaysIcon },
    ].map(({ name, value, Icon }) => <div key={name} className="flex min-w-0 items-center gap-3 lg:border-r-4 lg:border-[#073574] lg:px-5 lg:last:border-0">
      <Icon aria-hidden="true" className="size-7 shrink-0 text-[#073574]" strokeWidth={1.6} />
      <div className="min-w-0 text-sm leading-6"><dt className="inline font-bold text-[#073574]">{name}: </dt><dd className="inline break-words text-slate-500">{value}</dd></div>
    </div>)}
  </dl>
}

export default function ViewReport({ accessToken, reportId, search, onNavigate, onSessionInvalid, refreshUser, user }: ViewReportProps) {
  const backHref = reportReturnHref(search)
  const report = useReport(accessToken, reportId)
  const pdf = useReportPdf(accessToken, reportId, Boolean(report.data?.generated_document))
  const download = useReportDownload(accessToken)
  useReportAccessError(report.error, onSessionInvalid, refreshUser)
  useReportAccessError(pdf.error, onSessionInvalid, refreshUser)
  useReportAccessError(download.error, onSessionInvalid, refreshUser)

  const metadataError = report.error?.status === 404 ? 'O relatório solicitado não foi encontrado.'
    : report.error?.status === 403 ? 'Você não tem permissão para consultar este relatório.' : report.error?.message
  const canResume = report.data?.status === 'DRAFT' && getReportPermissions(user, report.data.coordination_id).create
    && (user?.role !== 'OPERATOR' || report.data.created_by === user.id)
  const resumeHref = `/relatorios/coordenacoes/${report.data?.coordination_id}/novo?draft_id=${reportId}`

  return <ReportsShell title="Visualizar Relatório" backHref={backHref} onBack={() => onNavigate(backHref)}>
    <div className="mx-auto w-full max-w-[1600px] space-y-4 pb-8 pt-6 sm:pt-7">
      {report.isLoading ? <p role="status" className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-14 text-slate-600"><LoaderCircleIcon aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />Carregando informações do relatório…</p>
        : report.error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800"><p>{metadataError}</p><Button variant="outline" className="mt-4 h-11 bg-white" onClick={report.reload}>Tentar novamente</Button></div>
          : report.data && <>
            <ReportInformation report={report.data} />
            {canResume && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-sm text-[#073574]">Este relatório é um rascunho. Continue preenchendo as nove etapas antes de gerar o PDF.</p><Button className="h-11" onClick={() => onNavigate(resumeHref)}>Continuar preenchimento</Button></div>}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm leading-6 text-slate-500">Use os controles do visualizador para navegar pelas páginas, ajustar o zoom e imprimir.</p>
              <div className="flex flex-wrap gap-3">
                {pdf.url && <Button variant="outline" nativeButton={false} render={<a href={pdf.url} target="_blank" rel="noopener noreferrer" />} className="h-11 gap-2 px-4 text-[#073574]"><ExternalLinkIcon aria-hidden="true" className="size-5" />Abrir PDF em outra aba</Button>}
                <Button className="h-11 gap-2 bg-[#008f49] px-4 hover:bg-[#00763c]" disabled={!report.data.generated_document || Boolean(download.busyId)} onClick={() => download.download(reportId)}>
                  {download.busyId ? <LoaderCircleIcon aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" /> : <DownloadIcon aria-hidden="true" className="size-5" />}{download.busyId ? 'Baixando…' : 'Baixar PDF'}
                </Button>
              </div>
            </div>
            {download.error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>Não foi possível baixar o documento. {download.error.message}</p></div>}
            <ReportPdfViewer available={Boolean(report.data.generated_document)} url={pdf.url} error={pdf.error}
              title={`PDF do relatório de ${report.data.cover?.municipality?.name ?? reportId}`} onRetry={report.data.generated_document ? pdf.reload : report.reload} />
            {pdf.url && <p className="text-sm leading-6 text-slate-500">Se o navegador não exibir o documento nesta página, abra o PDF em outra aba ou baixe o arquivo. Os controles de impressão e zoom dependem do navegador.</p>}
          </>}
    </div>
  </ReportsShell>
}
