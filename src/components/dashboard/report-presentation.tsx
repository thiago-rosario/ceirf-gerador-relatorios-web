import { BadgeCheckIcon, CircleCheckIcon, CircleDashedIcon, Clock3Icon, DownloadIcon, EyeIcon, PencilLineIcon } from "lucide-react"

import { formatReportDate, safeReportHref } from "@/components/dashboard/report-format"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { RecentReport } from "@/types/dashboard"

const statusStyles = {
  draft: { label: "Em elaboração", icon: PencilLineIcon, className: "border-slate-200 bg-slate-50 text-slate-700" },
  review: { label: "Em revisão", icon: Clock3Icon, className: "border-amber-200 bg-amber-50 text-amber-900" },
  approved: { label: "Aprovado", icon: BadgeCheckIcon, className: "border-blue-200 bg-blue-50 text-blue-900" },
  completed: { label: "Concluído", icon: CircleCheckIcon, className: "border-emerald-200 bg-emerald-50 text-emerald-900" },
}

const statusAliases: Record<string, keyof typeof statusStyles> = {
  draft: "draft", in_progress: "draft", "em elaboração": "draft", "em elaboracao": "draft",
  in_review: "review", under_review: "review", "em revisão": "review", "em revisao": "review",
  approved: "approved", aprovado: "approved",
  completed: "completed", concluded: "completed", concluído: "completed", concluido: "completed",
}

export function ReportStatusBadge({ status }: { status: RecentReport["status"] }) {
  const value = status?.trim()
  const style = value ? statusStyles[statusAliases[value.toLocaleLowerCase("pt-BR")]] : undefined
  const Icon = style?.icon ?? CircleDashedIcon

  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium leading-5 ${style?.className ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0 break-words whitespace-normal">{style?.label ?? (value || "Não informado")}</span>
    </span>
  )
}

export function ReportDate({ date }: { date: RecentReport["date"] }) {
  const label = formatReportDate(date)
  return label ? <time dateTime={date ?? undefined}>{label}</time> : <span>Não informado</span>
}

export function ReportActions({ report, onViewReport }: { report: RecentReport; onViewReport?: (report: RecentReport) => void }) {
  const viewHref = safeReportHref(report.viewHref)
  const downloadHref = safeReportHref(report.downloadHref)
  const actionClassName = "inline-flex size-11 cursor-pointer items-center justify-center rounded-lg text-primary transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:bg-blue-100"

  if (!onViewReport && !viewHref && !downloadHref) return <span className="text-xs text-slate-600">Indisponível</span>

  return (
    <div className="flex items-center gap-1">
      {(onViewReport || viewHref) && <Tooltip>
        <TooltipTrigger render={onViewReport
          ? <button type="button" onClick={() => onViewReport(report)} className={actionClassName} aria-label="Visualizar relatório" />
          : <a href={viewHref} className={actionClassName} aria-label="Visualizar relatório" />
        }>
          <EyeIcon className="size-5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>Visualizar relatório</TooltipContent>
      </Tooltip>}
      {downloadHref && <Tooltip>
        <TooltipTrigger render={<a href={downloadHref} download className={actionClassName} aria-label="Baixar relatório" />}>
          <DownloadIcon className="size-5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent>Baixar relatório</TooltipContent>
      </Tooltip>}
    </div>
  )
}
