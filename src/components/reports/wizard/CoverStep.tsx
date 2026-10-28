import type { Dispatch, SetStateAction } from 'react'
import { MunicipalityPicker } from '@/components/reports/MunicipalityPicker'
import { Button } from '@/components/ui/button'
import { truncateText } from '@/service/report-form-model'
import type { ReportFormOptions } from '@/types/report-catalogs'
import type { Municipality } from '@/types/reports'
import type { ReportDraft, StepIssue } from '@/types/report-draft'
import { FormField, reportControlClass } from './FormField'

export function CoverStep({ draft, onChange, issues, municipalities, isLoading, error, onRetry, options }: {
  options: ReportFormOptions; draft: ReportDraft; onChange: Dispatch<SetStateAction<ReportDraft>>; issues: StepIssue[]; municipalities: Municipality[]; isLoading: boolean; error: Error | null; onRetry: () => void
}) {
  const update = (field: string, value: string | number | null) => onChange((current) => ({ ...current, cover: { ...current.cover, [field]: value } }))
  const issue = (field: string) => issues.find((item) => item.field === field)?.message
  return <div className="grid gap-x-10 gap-y-5 md:grid-cols-2 xl:gap-x-12">
    <FormField label="Município" htmlFor="report-municipality" required error={issue('municipality_id')}>
      <MunicipalityPicker municipalities={municipalities} value={draft.cover.municipality_id} required invalid={Boolean(issue('municipality_id'))} disabled={isLoading || Boolean(error)} onChange={(id) => update('municipality_id', id)} />
      {isLoading && <p role="status" className="mt-2 text-sm text-slate-500">Carregando municípios da Bahia…</p>}
      {error && <div role="alert" className="mt-2 text-sm text-red-700">{error.message}<Button variant="outline" className="ml-2" onClick={onRetry}>Tentar novamente</Button></div>}
      {!isLoading && !error && municipalities.length === 0 && <p role="status" className="mt-2 text-sm text-amber-800">Não há municípios disponíveis no catálogo.</p>}
    </FormField>
    <FormField label="Força" htmlFor="cover-force" required error={issue('force')}>
      <select id="cover-force" className={reportControlClass} value={draft.cover.force} aria-required="true" aria-invalid={Boolean(issue('force'))} onChange={(e) => update('force', e.target.value)}>
        <option value="">Selecione a força</option>{draft.cover.force && !options.forces.some(({ key }) => key === draft.cover.force) && <option value={draft.cover.force}>{draft.cover.force} (valor cadastrado)</option>}{options.forces.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
      </select>
    </FormField>
    <div className="space-y-5">
      <FormField label="Tamanho" htmlFor="cover-size" required error={issue('size')}>
        <select id="cover-size" className={reportControlClass} value={draft.cover.size} aria-required="true" aria-invalid={Boolean(issue('size'))} onChange={(e) => update('size', e.target.value)}>
          <option value="">Selecione o tamanho</option>{draft.cover.size && !options.typologies.some(({ key }) => key === draft.cover.size) && <option value={draft.cover.size}>{draft.cover.size} (valor cadastrado)</option>}{options.typologies.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
        </select>
      </FormField>
      <FormField label="Nº SEI" htmlFor="cover-sei" required value={draft.cover.sei_number} limit={80} error={issue('sei_number')}>
        <input id="cover-sei" className={reportControlClass} placeholder="Informe o número SEI" value={draft.cover.sei_number} aria-required="true" aria-invalid={Boolean(issue('sei_number'))} onChange={(e) => update('sei_number', truncateText(e.target.value, 80))} />
      </FormField>
    </div>
    <FormField label="Tipologia" htmlFor="cover-typology" required value={draft.cover.typology} limit={100} error={issue('typology')}>
      <textarea id="cover-typology" rows={6} className={`${reportControlClass} min-h-40 resize-y md:min-h-[185px]`} placeholder="Informe a tipologia" value={draft.cover.typology} aria-required="true" aria-invalid={Boolean(issue('typology'))} onChange={(e) => update('typology', truncateText(e.target.value, 100))} />
    </FormField>
  </div>
}
