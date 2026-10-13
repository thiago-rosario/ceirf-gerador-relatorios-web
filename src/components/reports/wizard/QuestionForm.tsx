import { ANSWERS } from '@/service/report-form-model'
import type { Answer } from '@/types/report-draft'

export function QuestionForm({ items, values, onChange, prefix, showPending }: {
  items: string[][]; values: Record<string, Answer>; onChange: (key: string, answer: Answer) => void; prefix: string; showPending: boolean
}) {
  const answered = items.filter(([key]) => ANSWERS.includes(values[key] ?? '')).length
  return <div>
    <div className="mb-6 rounded-xl border border-blue-100 bg-[#f5f8ff] p-4">
      <div className="flex flex-wrap justify-between gap-2 text-sm"><p className="font-semibold text-[#073574]">{answered} de {items.length} respostas preenchidas</p><p className="text-slate-600">Todas são obrigatórias para finalizar</p></div>
      <progress aria-label="Progresso das respostas" value={answered} max={items.length} className="mt-3 h-2 w-full accent-[#073574]" />
      <p className="mt-2 text-xs text-slate-500">Responda em qualquer ordem. As pendências não impedem a navegação.</p>
    </div>
    <div className="space-y-3">{items.map(([key, label], index) => <fieldset key={key} className={`rounded-xl border px-4 pb-4 pt-2 sm:px-5 ${showPending && !values[key] ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-white'}`}>
      <legend className="max-w-full px-1 text-base font-semibold text-[#073574]">{index + 1}. {label}<span className="ml-1 text-red-600" aria-label="obrigatório">*</span></legend>
      <div className="mt-1 flex flex-wrap gap-2 sm:gap-3">{ANSWERS.map((answer) => <label key={answer} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${values[key] === answer ? 'border-[#073574] bg-blue-50 font-bold text-[#073574]' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
        <input type="radio" name={`${prefix}-${key}`} value={answer} checked={values[key] === answer} aria-required="true" onChange={() => onChange(key, answer as Answer)} className="size-4 accent-[#073574]" />{answer}
      </label>)}</div>
      {showPending && !values[key] && <p className="mt-2 text-xs text-amber-900">Resposta pendente</p>}
    </fieldset>)}</div>
  </div>
}
