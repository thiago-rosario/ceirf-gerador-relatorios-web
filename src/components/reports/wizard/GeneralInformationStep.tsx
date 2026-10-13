import { todayInBahia, truncateText, validInspectionDate } from '@/service/report-form-model'
import type { ReportDraft, StepIssue } from '@/types/report-draft'
import { FormField, reportControlClass } from './FormField'

export function GeneralInformationStep({ draft, onChange, issues }: { draft: ReportDraft; onChange: (draft: ReportDraft) => void; issues: StepIssue[] }) {
  const update = (field: string, value: string) => onChange({ ...draft, general_information: { ...draft.general_information, [field]: value } })
  const date = draft.general_information.inspection_date
  const dateError = issues.find((item) => item.field === 'inspection_date')?.message || (date && !validInspectionDate(date) ? 'A data deve ser válida e não pode ser futura.' : '')
  return <div className="space-y-7">
    <div className="max-w-sm"><FormField label="Data da vistoria" htmlFor="inspection-date" required error={dateError} hint="Formato: DD/MM/AAAA. Não é permitida uma data futura.">
      <input id="inspection-date" type="date" lang="pt-BR" max={todayInBahia()} className={reportControlClass} value={date} aria-required="true" aria-invalid={Boolean(dateError)} onInput={(e) => update('inspection_date', e.currentTarget.value)} onChange={(e) => update('inspection_date', e.target.value)} />
    </FormField></div>
    <FormField label="Colaborador(es) presente(s)" htmlFor="collaborators" required value={draft.general_information.collaborators} limit={1000} error={issues.find((item) => item.field === 'collaborators')?.message} hint="Informe os colaboradores que participaram da vistoria.">
      <textarea id="collaborators" rows={7} className={`${reportControlClass} resize-y`} placeholder="Informe os colaboradores presentes" value={draft.general_information.collaborators} aria-required="true" onChange={(e) => update('collaborators', truncateText(e.target.value, 1000))} />
    </FormField>
  </div>
}
