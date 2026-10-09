import type { ReactNode } from 'react'
import { ArrowLeftIcon } from 'lucide-react'
import type { Coordination } from '@/types/users'

type ReportsShellProps = {
  children: ReactNode
  coordination?: Coordination | null
  onBack: () => void
  backHref?: string
}

export function ReportsShell({ children, coordination, onBack, backHref = '/relatorios' }: ReportsShellProps) {
  return (
    <section
      aria-labelledby={coordination ? 'coordination-heading' : undefined}
      className="relative isolate flex min-h-[calc(100dvh-220px)] flex-1 flex-col overflow-hidden bg-white px-5 sm:px-8"
    >
      <div className="flex shrink-0 items-center gap-4 pt-5 sm:gap-5 sm:pt-6">
        <a
          href={backHref}
          aria-label={coordination ? backHref === '/relatorios' ? 'Voltar para as coordenações' : 'Voltar para as ações da coordenação' : undefined}
          className={coordination
            ? 'flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-[#073574] text-[#073574] transition-colors hover:bg-[#edf2ff] focus-visible:outline-[#073574] motion-reduce:transition-none sm:size-12'
            : 'flex min-h-11 items-center gap-2 rounded-lg px-3 text-[#073574] transition-colors hover:bg-[#edf2ff] focus-visible:outline-[#073574] motion-reduce:transition-none'}
          onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            event.preventDefault()
            onBack()
          }}
        >
          <ArrowLeftIcon aria-hidden="true" className={coordination ? 'size-8' : 'size-5'} strokeWidth={2} />
          {!coordination && 'Voltar'}
        </a>
        {coordination && <div className="min-w-0">
          <h1 id="coordination-heading" className="break-words text-[32px] font-bold leading-tight text-[#073574] sm:text-[40px]">{coordination.code}</h1>
          <p className="mt-1 text-lg leading-snug text-slate-600 sm:text-xl">{coordination.name}</p>
        </div>}
      </div>
      <svg aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[48%] w-full" viewBox="0 0 1554 320" fill="none" preserveAspectRatio="none">
        <path d="M0 0C213 205 448 110 704 173C1012 251 1240-9 1554 81V320H0V0Z" fill="#edf2ff" fillOpacity=".65" />
        <path d="M0 97C326 285 553 64 806 181C1091 313 1191 34 1554 117V320H0V97Z" fill="#e5edfc" fillOpacity=".55" />
        <path d="M0 119C342 220 477 245 755 168C1108 69 1288 88 1554 316V320H0V119Z" fill="white" fillOpacity=".65" />
        <path d="M0 278C276 291 480 136 735 181C1058 239 1265 139 1554 319H0V278Z" fill="#f5f8ff" fillOpacity=".85" />
      </svg>
      {children}
    </section>
  )
}
