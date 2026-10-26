import { CheckCircle2Icon, CircleAlertIcon, PencilIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CHECKLIST, INFRASTRUCTURE, REPORT_STEPS, figureNumber, isAssetConfirmed } from '@/service/report-form-model'
import type { ReportDraft, StepIssue } from '@/types/report-draft'
import type { Municipality } from '@/types/reports'

export function ReviewStep({ draft, issues, municipalities, onSelect }: { draft: ReportDraft; issues: StepIssue[][]; municipalities: Municipality[]; onSelect: (step: number) => void }) {
  const missing = issues.reduce((total, section) => total + section.length, 0)
  const municipality = municipalities.find((item) => item.id === draft.cover.municipality_id)?.name || (draft.cover.municipality_id ? `Município #${draft.cover.municipality_id}` : 'Não informado')
  const date = draft.general_information.inspection_date
  const readableDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split('-').reverse().join('/') : 'Não informada'
  const media = (kinds: string[]) => draft.assets.filter((asset) => kinds.includes(asset.kind))
  const assetSummary = (kinds: string[]) => media(kinds).length ? media(kinds).map((asset) => {
    const confirmed = isAssetConfirmed(asset)
    const status = confirmed ? 'referência confirmada no servidor'
      : asset.uploadStatus === 'error' ? 'envio não confirmado; tente novamente'
        : asset.uploadStatus === 'hashing' ? 'calculando checksum SHA-256'
          : asset.uploadStatus === 'uploading' ? 'envio em andamento'
            : asset.uploadStatus === 'processing' ? 'processamento e vínculo pendentes'
              : 'arquivo local, envio pendente'
    return <li key={asset.id} className="break-words">Figura {figureNumber(draft.assets, asset.id)} — {asset.name}{asset.caption && ` · ${asset.caption}`}{asset.description && ` · ${asset.description}`} <span className={confirmed ? 'text-green-700' : 'text-amber-800'}>({status})</span></li>
  }) : <li>Nenhum arquivo adicionado.</li>
  const answers = (items: string[][], values: ReportDraft['checklist']) => <dl className="grid gap-2 sm:grid-cols-2">{items.map(([key, label]) => <div key={key}><dt className="text-xs text-slate-500">{label}</dt><dd className={values[key] ? 'font-medium' : 'text-amber-800'}>{values[key] || 'Resposta pendente'}</dd></div>)}</dl>
  const summaries = [
    <dl key="cover" className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs text-slate-500">Município</dt><dd>{municipality}</dd></div><div><dt className="text-xs text-slate-500">Força / Tamanho</dt><dd>{draft.cover.force || 'Não informada'} / {draft.cover.size || 'Não informado'}</dd></div><div><dt className="text-xs text-slate-500">Tipologia</dt><dd className="break-words">{draft.cover.typology || 'Não informada'}</dd></div><div><dt className="text-xs text-slate-500">Nº SEI</dt><dd className="break-words">{draft.cover.sei_number || 'Não informado'}</dd></div></dl>,
    <dl key="general" className="space-y-3"><div><dt className="text-xs text-slate-500">Data da vistoria</dt><dd>{readableDate}</dd></div><div><dt className="text-xs text-slate-500">Colaboradores presentes</dt><dd className="whitespace-pre-wrap break-words">{draft.general_information.collaborators || 'Não informados'}</dd></div></dl>,
    <ul key="location" className="space-y-2">{assetSummary(['location_map', 'state_map'])}</ul>,
    answers(INFRASTRUCTURE, draft.infrastructure),
    <ul key="pre" className="space-y-2">{assetSummary(['pre_implementation'])}</ul>,
    <ul key="photos" className="space-y-2">{assetSummary(['photograph'])}</ul>,
    <div key="attachments" className="space-y-4">{answers(CHECKLIST, draft.checklist)}<ul className="space-y-2 border-t pt-4">{assetSummary(['municipality_map', 'topographic_plan', 'other'])}</ul></div>,
    <p key="conclusion" className="whitespace-pre-wrap break-words">{draft.conclusion || 'Conclusão não preenchida.'}</p>,
  ]
  return <div className="space-y-4">
    <div role="status" className={`flex gap-3 rounded-xl border p-4 ${missing ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-green-200 bg-green-50 text-green-800'}`}>
      {missing ? <CircleAlertIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" /> : <CheckCircle2Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />}
      <div><p className="font-bold">{missing ? `${missing} pendências para finalizar` : 'Todas as seções estão preenchidas'}</p><p className="mt-1 text-sm">Confira os campos e o envio dos arquivos. Esta revisão do formulário precede a revisão institucional.</p></div>
    </div>
    {REPORT_STEPS.slice(0, 8).map(([title], index) => <section key={title} aria-labelledby={`review-section-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div><h3 id={`review-section-${index}`} className="text-lg font-bold text-[#073574]">{index + 1}. {title}</h3><p className={`mt-1 text-xs ${issues[index].length ? 'text-amber-800' : 'text-green-700'}`}>{issues[index].length ? `${issues[index].length} pendência(s)` : index === 4 || index === 5 ? 'Sem pendências · envio opcional' : 'Seção preenchida'}</p></div>
        <Button variant="outline" className="h-10" onClick={() => onSelect(index)} aria-label={`Editar ${title}`}><PencilIcon aria-hidden="true" className="size-4" />Editar</Button>
      </div>
      <div className="text-sm leading-relaxed text-slate-600">{summaries[index]}</div>
      {issues[index].length > 0 && <ul className="mt-4 space-y-1 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900" aria-label={`Pendências de ${title}`}>{issues[index].map((issue, issueIndex) => <li key={`${issue.field}-${issueIndex}`}>• {issue.message}</li>)}</ul>}
    </section>)}
  </div>
}
