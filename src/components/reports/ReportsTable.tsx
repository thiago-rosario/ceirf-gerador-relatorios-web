import { DownloadIcon, EyeIcon, LoaderCircleIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { reportDateLabel, reportViewHref } from '@/service/reports-navigation'
import type { Report } from '@/types/reports'

type ReportsTableProps = {
  reports: Report[]
  isLoading: boolean
  searchHref: string
  busyId: string | null
  onNavigate: (href: string) => void
  onDownload: (id: string) => void
}

function ReportActions({ report, searchHref, busyId, onNavigate, onDownload }: Omit<ReportsTableProps, 'reports' | 'isLoading'> & { report: Report }) {
  const href = reportViewHref(report.id, searchHref)
  return <div className="flex flex-wrap justify-start gap-2 md:justify-center">
    <Button nativeButton={false} render={<a href={href} />} variant="outline" className="h-11 gap-2 border-[#4d5dff] bg-white px-4 font-semibold text-[#4d5dff] hover:bg-[#edf2ff]"
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
        event.preventDefault(); onNavigate(href)
      }}><EyeIcon aria-hidden="true" className="size-5" />Visualizar</Button>
    <Button variant="outline" className="h-11 gap-2 border-[#00ad4d] bg-white px-4 font-semibold text-[#008d40] hover:bg-green-50"
      disabled={busyId !== null || !report.generated_document} onClick={() => onDownload(report.id)}
      aria-label={`Baixar relatório de ${report.cover?.municipality?.name ?? 'município não informado'}`}>
      {busyId === report.id ? <LoaderCircleIcon aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" /> : <DownloadIcon aria-hidden="true" className="size-5" />}
      {busyId === report.id ? 'Baixando…' : 'Baixar'}
    </Button>
    {!report.generated_document && <span className="w-full text-center text-xs text-slate-500">PDF ainda indisponível</span>}
  </div>
}

export function ReportsTable({ reports, isLoading, ...actions }: ReportsTableProps) {
  if (!isLoading && reports.length === 0) return <div role="status" className="flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-12 text-center">
    <SearchIcon aria-hidden="true" className="size-10 text-[#073574]" /><h2 className="text-lg font-semibold text-[#073574]">Nenhum relatório encontrado</h2>
    <p className="max-w-md text-sm text-slate-600">Não há relatórios disponíveis para estes filtros. Limpe o filtro ou tente outro município ou tipologia.</p>
  </div>
  return <div aria-busy={isLoading} className="overflow-hidden rounded-xl border border-[#d8d8d8] bg-white">
    {isLoading && <p role="status" className="sr-only">Carregando relatórios…</p>}
    <div className="hidden md:block">
      <Table aria-label="Relatórios disponíveis" className="min-w-[820px]"
        containerProps={{ tabIndex: 0, role: 'region', 'aria-label': 'Relatórios, tabela com rolagem horizontal', className: 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary' }}>
        <TableHeader><TableRow className="hover:bg-transparent">{['Município', 'Data do Relatório', 'Pleito / Tipologia', 'Ação'].map((heading) => <TableHead scope="col" key={heading} className="h-14 px-5 text-base font-bold text-[#073574] last:text-center">{heading}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{isLoading ? Array.from({ length: 4 }, (_, index) => <TableRow key={index}>{[1, 2, 3, 4].map((column) => <TableCell key={column} className="h-20 px-5"><Skeleton className="h-5 w-28" /></TableCell>)}</TableRow>)
          : reports.map((report) => <TableRow key={report.id} className="odd:bg-slate-50/60 hover:bg-slate-50">
            <TableCell className="max-w-72 px-5 py-3 whitespace-normal text-base">{report.cover?.municipality?.name ?? 'Não informado'}</TableCell>
            <TableCell className="px-5 py-3 text-base">{reportDateLabel(report)}</TableCell>
            <TableCell className="max-w-64 px-5 py-3 whitespace-normal text-base">{report.cover?.typology ?? 'Não informada'}</TableCell>
            <TableCell className="px-4 py-3"><ReportActions report={report} {...actions} /></TableCell>
          </TableRow>)}</TableBody>
      </Table>
    </div>
    <div className="divide-y divide-slate-200 md:hidden">
      {isLoading ? Array.from({ length: 3 }, (_, index) => <div key={index} className="space-y-4 p-5"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-24" /><Skeleton className="h-11 w-full" /></div>)
        : reports.map((report) => <article key={report.id} className="space-y-4 p-5">
          <h2 className="break-words text-lg font-bold text-[#073574]">{report.cover?.municipality?.name ?? 'Município não informado'}</h2>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm"><dt className="text-slate-500">Data</dt><dd>{reportDateLabel(report)}</dd><dt className="text-slate-500">Tipologia</dt><dd className="break-words">{report.cover?.typology ?? 'Não informada'}</dd></dl>
          <ReportActions report={report} {...actions} />
        </article>)}
    </div>
  </div>
}
