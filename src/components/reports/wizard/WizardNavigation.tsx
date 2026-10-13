import { CheckIcon } from 'lucide-react'
import { REPORT_STEPS } from '@/service/report-form-model'
import type { StepIssue } from '@/types/report-draft'

export function WizardNavigation({ active, onSelect, issues, visited }: { active: number; onSelect: (step: number) => void; issues: StepIssue[][]; visited: number[] }) {
  return <nav aria-label="Etapas de criação do relatório" className="min-w-0 lg:w-[260px] lg:shrink-0 xl:w-[285px]">
    <ol className="flex gap-2 overflow-x-auto pb-3 lg:flex-col lg:gap-2 lg:overflow-visible">{REPORT_STEPS.map(([title], index) => {
      const complete = index < 8 && issues[index].length === 0
      const pending = index < 8 && issues[index].length > 0 && (visited.includes(index) || active === 8)
      return <li key={title} className="shrink-0 lg:w-full">
        <button type="button" onClick={() => onSelect(index)} aria-current={active === index ? 'step' : undefined}
          className={`flex min-h-14 w-full items-center gap-3 rounded-xl px-1 pr-3 text-left transition-colors hover:bg-blue-50 lg:min-h-[58px] ${active === index ? 'font-bold text-[#073574]' : 'text-slate-500'}`}>
          <span className={`flex size-11 shrink-0 items-center justify-center rounded-full border-[2.5px] border-[#073574] text-xl font-bold sm:size-12 ${active === index ? 'bg-[#073574] text-white' : 'bg-white text-[#073574]'}`}>{index + 1}</span>
          <span className="max-w-48 text-sm leading-snug sm:text-base">{title}
            {active !== index && complete && <span className="ml-1 inline-flex align-middle text-green-700"><CheckIcon aria-hidden="true" className="size-3.5" /><span className="sr-only">Preenchida</span></span>}
            {pending && <span className="mt-0.5 block text-xs font-normal text-amber-800">{issues[index].length} {issues[index].length === 1 ? 'pendência' : 'pendências'}</span>}
          </span>
        </button>
      </li>
    })}</ol>
  </nav>
}
