import { LoaderCircleIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Coordination } from '@/types/users'
import { CoordinationCard } from './CoordinationCard'

type GlobalReportSearchProps = {
  onNavigate: (href: string) => void
}

type CoordinationSelectionProps = GlobalReportSearchProps & {
  coordinations: Coordination[]
  isLoading: boolean
  error: Error | null
  onRetry: () => void
}

export function GlobalReportSearch({ onNavigate }: GlobalReportSearchProps) {
  return (
    <aside aria-labelledby="global-report-search-heading" className="flex w-full flex-col items-start gap-4 rounded-2xl border border-[#cbdcf4] bg-[#f1f5fd] p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-6">
      <div className="min-w-0">
        <h2 id="global-report-search-heading" className="text-lg font-bold text-[#073575]">Pesquisa global</h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-600 sm:text-base">Consulte relatórios de todas as coordenações em um único lugar.</p>
      </div>
      <Button
        nativeButton={false}
        render={<a href="/relatorios/pesquisar" />}
        className="h-auto min-h-12 w-full max-w-md gap-2 rounded-xl border border-[#073575] bg-[#073575] px-4 py-3 text-sm font-semibold whitespace-normal shadow-sm hover:bg-[#0a448f] active:bg-[#052b60] motion-reduce:transition-none sm:w-auto sm:px-5 sm:text-base"
        onClick={(event) => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          onNavigate('/relatorios/pesquisar')
        }}
      >
        <SearchIcon aria-hidden="true" className="size-5" />
        Pesquisar todos os relatórios
      </Button>
    </aside>
  )
}

export function CoordinationSelection({ coordinations, isLoading, error, onRetry, onNavigate }: CoordinationSelectionProps) {
  const errorMessage = error && 'status' in error && error.status === 403
    ? 'Não foi possível carregar as coordenações. Tente novamente.'
    : error?.message || 'Não foi possível carregar as coordenações. Tente novamente.'

  return (
    <section aria-labelledby="coordination-selection-heading" className="mx-auto flex w-full max-w-[1008px] flex-1 flex-col justify-center gap-8 py-10 sm:gap-10 sm:py-14">
      <div className="text-center">
        <h1 id="coordination-selection-heading" className="text-[28px] font-bold leading-tight text-[#073574] sm:text-[32px]">Selecione uma coordenação</h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">Escolha uma coordenação para acessar as ações disponíveis para o seu perfil.</p>
      </div>
      <GlobalReportSearch onNavigate={onNavigate} />
      {isLoading ? <p role="status" className="flex items-center justify-center gap-3 py-8 text-slate-600">
        <LoaderCircleIcon aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
        Carregando coordenações…
      </p> : error ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
        <p>{errorMessage}</p>
        <Button variant="outline" className="mt-4 min-h-11 bg-white" onClick={onRetry}>Tentar novamente</Button>
      </div> : coordinations.length === 0 ? <p role="status" className="py-8 text-center text-slate-600">Nenhuma coordenação disponível no momento.</p> : <div className="grid w-full grid-cols-1 justify-items-center gap-6 md:grid-cols-2 lg:gap-y-10">
        {coordinations.map((coordination, index) => <div
          key={coordination.id}
          className={`flex w-full min-w-0 justify-center ${index === coordinations.length - 1 && coordinations.length % 2 === 1 ? 'md:col-span-2' : ''}`}
        >
          <CoordinationCard coordination={coordination} onNavigate={onNavigate} />
        </div>)}
      </div>}
    </section>
  )
}
