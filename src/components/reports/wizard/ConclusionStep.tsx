import { truncateText } from '@/service/report-form-model'
import type { ReportDraft } from '@/types/report-draft'
import { FormField, reportControlClass } from './FormField'

export function ConclusionStep({ draft, onChange, error }: { draft: ReportDraft; onChange: (draft: ReportDraft) => void; error?: string }) {
  return <div className="space-y-5">
    <p className="rounded-xl border border-blue-100 bg-[#f5f8ff] p-4 text-sm leading-relaxed text-slate-600">A conclusão é apresentada como texto no relatório institucional. Registre a avaliação técnica conforme a vistoria realizada, preservando os parágrafos.</p>
    <FormField label="Conclusão técnica" htmlFor="report-conclusion" required error={error} value={draft.conclusion} limit={3000}>
      <textarea id="report-conclusion" rows={13} spellCheck lang="pt-BR" className={`${reportControlClass} min-h-72 resize-y leading-relaxed`} placeholder="Preencha a conclusão da vistoria" value={draft.conclusion} aria-required="true" aria-invalid={Boolean(error)} onChange={(e) => onChange({ ...draft, conclusion: truncateText(e.target.value, 3000) })} />
    </FormField>
    <p className="text-xs leading-relaxed text-slate-500">O modelo fornecido apresenta uma conclusão já preenchida. A definição dos trechos institucionais fixos e variáveis ainda precisa ser confirmada. Até essa definição, preencha a conclusão técnica em texto livre.</p>
  </div>
}
