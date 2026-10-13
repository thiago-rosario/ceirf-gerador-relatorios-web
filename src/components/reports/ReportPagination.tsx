import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ReportPagination as Pagination } from '@/types/reports'

export function ReportPagination({ pagination, disabled, onPage }: { pagination: Pagination; disabled?: boolean; onPage: (page: number) => void }) {
  if (pagination.last_page <= 1 && pagination.current_page <= pagination.last_page) return null
  const current = pagination.current_page
  const last = pagination.last_page
  const windowPage = Math.min(current, last)
  const pages = [...new Set([1, Math.max(1, windowPage - 1), windowPage, Math.min(last, windowPage + 1), last])].sort((a, b) => a - b)
  return (
    <nav aria-label="Paginação de relatórios" className="mt-5 flex flex-wrap items-center justify-center gap-2">
      <Button variant="outline" aria-label="Primeira página" className="size-11 text-[#4d5dff]" disabled={disabled || current <= 1} onClick={() => onPage(1)}><ChevronsLeftIcon aria-hidden="true" className="size-5" /></Button>
      <Button variant="outline" aria-label="Página anterior" className="size-11 text-[#4d5dff]" disabled={disabled || current <= 1} onClick={() => onPage(Math.max(1, Math.min(last, current - 1)))}><ChevronLeftIcon aria-hidden="true" className="size-5" /></Button>
      {pages.map((page, index) => <span key={page} className="flex items-center gap-2">
        {index > 0 && page - pages[index - 1] > 1 && <span aria-hidden="true" className="px-1 text-slate-500">…</span>}
        <Button variant="outline" aria-label={`Página ${page}`} aria-current={page === current ? 'page' : undefined}
          className={`size-11 text-base ${page === current ? 'border-[#4d5dff] bg-[#edf2ff] font-bold text-[#073574]' : 'text-[#4d5dff]'}`}
          disabled={disabled || page === current} onClick={() => onPage(page)}>{page}</Button>
      </span>)}
      <Button variant="outline" aria-label="Próxima página" className="size-11 text-[#4d5dff]" disabled={disabled || current >= last} onClick={() => onPage(current + 1)}><ChevronRightIcon aria-hidden="true" className="size-5" /></Button>
      <Button variant="outline" aria-label="Última página" className="size-11 text-[#4d5dff]" disabled={disabled || current === last} onClick={() => onPage(last)}><ChevronsRightIcon aria-hidden="true" className="size-5" /></Button>
      <p className="w-full text-center text-xs text-slate-500">{current > last ? `A página ${current} não possui resultados. Última página disponível: ${last}.` : `Página ${current} de ${last}`}</p>
    </nav>
  )
}
