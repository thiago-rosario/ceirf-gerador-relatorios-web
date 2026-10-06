import { useId } from "react"
import { FileTextIcon } from "lucide-react"

import { ReportActions, ReportDate, ReportStatusBadge } from "@/components/dashboard/report-presentation"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { DashboardState, RecentReport } from "@/types/dashboard"

interface DataTableProps {
  reports: RecentReport[]
  state: DashboardState
  onViewReport?: (report: RecentReport) => void
}

const columns = ["Município", "Coordenação", "Autor", "Data", "Status", "Ações"]

function ReportEmptyState({ state }: Pick<DataTableProps, "state">) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-lg bg-blue-50 text-primary"><FileTextIcon className="size-6" aria-hidden="true" /></span>
      <div className="max-w-sm space-y-1">
        <h3 className="font-semibold text-slate-800">{state === "ready" ? "Nenhum relatório recente" : "Relatórios ainda não disponíveis"}</h3>
        <p className="text-sm leading-6 text-slate-600">{state === "ready" ? "Os relatórios criados recentemente aparecerão aqui." : "Os relatórios aparecerão aqui quando os dados estiverem disponíveis."}</p>
      </div>
    </div>
  )
}

function MobileReportCard({ report, onViewReport }: { report: RecentReport; onViewReport?: DataTableProps["onViewReport"] }) {
  return (
    <article className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="min-w-0 break-words font-semibold text-primary">{report.municipality || "Não informado"}</h3>
        <ReportStatusBadge status={report.status} />
      </div>
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
        <dt className="text-slate-600">Coordenação</dt><dd className="break-words text-slate-800">{report.coordination || "Não informado"}</dd>
        <dt className="text-slate-600">Autor</dt><dd className="break-words text-slate-800">{report.author || "Não informado"}</dd>
        <dt className="text-slate-600">Data</dt><dd className="text-slate-800 tabular-nums"><ReportDate date={report.date} /></dd>
      </dl>
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="text-xs text-slate-600">Ações do relatório</span><ReportActions report={report} onViewReport={onViewReport} />
      </div>
    </article>
  )
}

export function DataTable({ reports, state, onViewReport }: DataTableProps) {
  const id = useId()
  const titleId = `recent-reports-${id}`
  const isLoading = state === "loading"
  const visibleReports = state === "ready" ? reports : []

  return (
    <section id="relatorios-recentes" aria-labelledby={titleId} aria-busy={isLoading} className="flex min-w-0 scroll-mt-24 flex-col gap-4">
      <h2 id={titleId} className="text-lg font-semibold text-primary">Relatórios Recentes</h2>
      <TooltipProvider delay={250}>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="hidden md:block">
            <Table
              aria-labelledby={titleId}
              className="min-w-[720px]"
              containerProps={{ tabIndex: 0, role: "region", "aria-label": "Relatórios recentes, tabela com rolagem horizontal", className: "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary" }}
            >
              <TableHeader className="bg-slate-50">
                <TableRow className="hover:bg-transparent">
                  {columns.map((column) => <TableHead key={column} scope="col" className="h-12 px-4 text-xs text-slate-600">{column}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? Array.from({ length: 3 }, (_, row) => (
                  <TableRow key={row}>
                    {columns.map((column) => <TableCell key={column} className="h-16 px-4"><Skeleton className="h-4 w-20" /></TableCell>)}
                  </TableRow>
                )) : visibleReports.length > 0 ? visibleReports.map((report) => (
                  <TableRow key={report.id} className="hover:bg-slate-50/80">
                    <TableCell className="max-w-56 px-4 py-3 font-medium whitespace-normal text-slate-800">{report.municipality || "Não informado"}</TableCell>
                    <TableCell className="px-4 py-3 text-sm font-medium text-primary">{report.coordination || "Não informado"}</TableCell>
                    <TableCell className="max-w-56 px-4 py-3 whitespace-normal text-slate-700">{report.author || "Não informado"}</TableCell>
                    <TableCell className="px-4 py-3 text-sm text-slate-600 tabular-nums"><ReportDate date={report.date} /></TableCell>
                    <TableCell className="px-4 py-3"><ReportStatusBadge status={report.status} /></TableCell>
                    <TableCell className="px-3 py-2"><ReportActions report={report} onViewReport={onViewReport} /></TableCell>
                  </TableRow>
                )) : (
                  <TableRow className="hover:bg-transparent"><TableCell colSpan={columns.length} className="p-0 whitespace-normal"><ReportEmptyState state={state} /></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="divide-y divide-border md:hidden">
            {isLoading ? Array.from({ length: 3 }, (_, row) => <div key={row} className="space-y-4 p-5"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-1/2" /></div>) : visibleReports.length > 0 ? visibleReports.map((report) => <MobileReportCard key={report.id} report={report} onViewReport={onViewReport} />) : <ReportEmptyState state={state} />}
          </div>
        </div>
      </TooltipProvider>
      {isLoading && <p role="status" className="sr-only">Carregando relatórios recentes…</p>}
    </section>
  )
}
