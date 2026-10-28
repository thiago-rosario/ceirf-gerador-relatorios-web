import type { Dispatch, SetStateAction } from 'react'
import { createCollaborator, createInstitutionalRepresentative, getGeneralInformationSaveIssues, serializeCollaborators, textLength, todayInBahia, validInspectionDate } from '@/service/report-form-model'
import type { InstitutionalRepresentative, ReportCollaborator, ReportDraft, StepIssue } from '@/types/report-draft'
import { DynamicFields } from './DynamicFields'
import { FormField, reportControlClass } from './FormField'

export function GeneralInformationStep({ draft, onChange, issues }: { draft: ReportDraft; onChange: Dispatch<SetStateAction<ReportDraft>>; issues: StepIssue[] }) {
  const updateDate = (value: string) => onChange((current) => ({ ...current, general_information: { ...current.general_information, inspection_date: value } }))
  const date = draft.general_information.inspection_date
  const dateError = issues.find((item) => item.field === 'inspection_date')?.message || (date && !validInspectionDate(date) ? 'A data deve ser válida e não pode ser futura.' : '')
  const collaborators = draft.general_information.collaborators
  const representatives = draft.general_information.institutional_representatives
  const collaboratorsLength = textLength(serializeCollaborators(collaborators))
  const collaboratorsError = issues.find((item) => item.field === 'collaborators')?.message || (collaboratorsLength > 1000 ? 'Informe até 1.000 caracteres no total dos colaboradores.' : '')
  const hasRepresentative = (row: InstitutionalRepresentative) => Boolean(row.name.trim() || row.position.trim())
  const saveIssues = getGeneralInformationSaveIssues(draft)
  const representativeError = (row: InstitutionalRepresentative, field: 'name' | 'position') => saveIssues.find((item) => item.field === `institutional_representatives.${row.id}.${field}`)?.message

  return <div className="space-y-8">
    <div className="max-w-sm"><FormField label="Data da vistoria" htmlFor="inspection-date" required error={dateError} hint="Formato: DD/MM/AAAA. Não é permitida uma data futura.">
      <input id="inspection-date" type="date" lang="pt-BR" max={todayInBahia()} className={reportControlClass} value={date} aria-required="true" aria-invalid={Boolean(dateError)} aria-describedby={`inspection-date-${dateError ? 'error' : 'hint'}`} onInput={(e) => updateDate(e.currentTarget.value)} onChange={(e) => updateDate(e.target.value)} />
    </FormField></div>
    <DynamicFields<ReportCollaborator> prefix="collaborators" title="Colaboradores presentes" description="Informe um colaborador por campo. Use + para adicionar participantes." rowLabel="Colaborador" rows={collaborators} fields={[{ name: 'name', label: 'Nome do colaborador', placeholder: 'Informe o nome do colaborador', limit: 1000 }]} required compactAdd addLabel="Adicionar colaborador" error={collaboratorsError} summary={`${collaboratorsLength}/1000 caracteres no total`} summaryLabel={`${collaboratorsLength} de 1000 caracteres`} requiredForRow={(row) => row.id === collaborators[0]?.id && !collaborators.some((item) => item.name.trim())} onAdd={() => {
      const row = createCollaborator()
      onChange((current) => ({ ...current, general_information: { ...current.general_information, collaborators: [...current.general_information.collaborators, row] } }))
    }} onEdit={(id, field, value) => onChange((current) => ({ ...current, general_information: { ...current.general_information, collaborators: current.general_information.collaborators.map((row) => row.id === id ? { ...row, [field]: value } : row) } }))} onRemove={(id) => onChange((current) => ({ ...current, general_information: { ...current.general_information, collaborators: current.general_information.collaborators.length > 1 ? current.general_information.collaborators.filter((row) => row.id !== id) : current.general_information.collaborators } }))} />
    <div className="border-t border-slate-100 pt-7"><DynamicFields<InstitutionalRepresentative> prefix="institutional_representatives" title="Representantes Institucionais" description="Opcional. Ao informar um representante, preencha o nome e o cargo." rowLabel="Representante" rows={representatives} fields={[{ name: 'name', label: 'Nome do representante', placeholder: 'Informe o nome do representante', limit: 255 }, { name: 'position', label: 'Cargo', placeholder: 'Informe o cargo ou função', limit: 255 }]} addLabel="Adicionar representante" canRemove={(row) => representatives.length > 1 || hasRepresentative(row)} requiredForRow={hasRepresentative} validate={representativeError} fieldError={(id, field) => issues.find((item) => item.field === `institutional_representatives.${id}.${field}`)?.message} onAdd={() => {
      const row = createInstitutionalRepresentative()
      onChange((current) => ({ ...current, general_information: { ...current.general_information, institutional_representatives: [...current.general_information.institutional_representatives, row] } }))
    }} onEdit={(id, field, value) => onChange((current) => ({ ...current, general_information: { ...current.general_information, institutional_representatives: current.general_information.institutional_representatives.map((row) => row.id === id ? { ...row, [field]: value } : row) } }))} onRemove={(id) => {
      const emptyRow = createInstitutionalRepresentative()
      onChange((current) => {
        const rows = current.general_information.institutional_representatives
        return { ...current, general_information: { ...current.general_information, institutional_representatives: rows.length > 1 ? rows.filter((row) => row.id !== id) : rows[0]?.id === id ? [emptyRow] : rows } }
      })
    }} /></div>
  </div>
}
