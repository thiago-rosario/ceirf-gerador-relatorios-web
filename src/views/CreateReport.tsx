import { useEffect, useRef, useState } from 'react'
import { ArrowLeftIcon, ArrowRightIcon, CheckCircle2Icon, LoaderCircleIcon, SaveIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReportsShell } from '@/components/reports/ReportsShell'
import { CoverStep } from '@/components/reports/wizard/CoverStep'
import { GeneralInformationStep } from '@/components/reports/wizard/GeneralInformationStep'
import { QuestionForm } from '@/components/reports/wizard/QuestionForm'
import { ConclusionStep } from '@/components/reports/wizard/ConclusionStep'
import { ReviewStep } from '@/components/reports/wizard/ReviewStep'
import { WizardNavigation } from '@/components/reports/wizard/WizardNavigation'
import { AttachmentDocuments, LocationStep, PhotographsStep, PreImplementationStep } from '@/components/reports/wizard/MediaSteps'
import { useReportDraft } from '@/hooks/use-report-draft'
import { useReportAccessError, useReportMunicipalities } from '@/hooks/use-reports'
import { CHECKLIST, INFRASTRUCTURE, REPORT_STEPS, getStepIssues } from '@/service/report-form-model'
import { isReportId } from '@/service/reports-navigation'
import type { Coordination, SessionUser } from '@/types/users'

type CreateReportProps = {
  accessToken: string; coordination: Coordination; search: string; onBack: () => void; onNavigate: (href: string, replace?: boolean) => void;
  onSessionInvalid: () => void; refreshUser: () => Promise<SessionUser | null>
}

export default function CreateReport({ accessToken, coordination, search, onBack, onNavigate, onSessionInvalid, refreshUser }: CreateReportProps) {
  const requestedId = new URLSearchParams(search).get('draft_id')
  const idIsValid = !requestedId || isReportId(requestedId)
  const baseUrl = `/relatorios/coordenacoes/${coordination.id}/novo`
  const form = useReportDraft(accessToken, coordination.id, idIsValid ? requestedId : null, (id) => onNavigate(`${baseUrl}?draft_id=${id}`, true))
  const municipalities = useReportMunicipalities(accessToken)
  useReportAccessError(municipalities.error, onSessionInvalid, refreshUser)
  useReportAccessError(form.loadError, onSessionInvalid, refreshUser)
  useReportAccessError(form.saveError, onSessionInvalid, refreshUser)
  useReportAccessError(form.mediaError, onSessionInvalid, refreshUser)
  const [visited, setVisited] = useState<number[]>([])
  const [exiting, setExiting] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const issues = getStepIssues(form.draft)
  const { draft, updateDraft, step } = form
  const stepIssues = visited.includes(step) ? issues[step] ?? [] : []
  const mediaProps = { draft, onChange: updateDraft, onSelectMedia: form.selectMedia, onRemoveMedia: form.removeMedia, onRetryMedia: form.retryMedia }
  const selectStep = (next: number) => { setVisited((values) => [...new Set([...values, step])]); form.setStep(next) }
  useEffect(() => { heading.current?.focus({ preventScroll: true }) }, [step])

  const saveAndExit = async () => {
    if (exiting || form.localFiles > 0) return
    setExiting(true)
    try { await form.save(); onBack() } catch { /* The form stays open and shows the actual API error. */ }
    finally { setExiting(false) }
  }
  const finish = async () => {
    if (issues.some((section) => section.length)) return
    const report = await form.generate()
    if (report) onNavigate(`/relatorios/${report.id}`)
  }

  const errorMessages = Object.values(form.saveError?.errors ?? {}).flat()
  const contents = [
    <CoverStep key="cover" {...mediaProps} issues={stepIssues} municipalities={municipalities.data ?? []} isLoading={municipalities.isLoading} error={municipalities.error} onRetry={municipalities.reload} />,
    <GeneralInformationStep key="general" {...mediaProps} issues={stepIssues} />,
    <LocationStep key="location" {...mediaProps} />,
    <QuestionForm key="infrastructure" items={INFRASTRUCTURE} values={draft.infrastructure} prefix="infrastructure" showPending={visited.includes(3)} onChange={(key, answer) => updateDraft((current) => ({ ...current, infrastructure: { ...current.infrastructure, [key]: answer } }))} />,
    <PreImplementationStep key="pre" {...mediaProps} />,
    <PhotographsStep key="photos" {...mediaProps} />,
    <div key="attachments" className="space-y-9"><section aria-labelledby="land-checklist"><h3 id="land-checklist" className="mb-4 text-xl font-bold text-[#073574]">Checklist do Terreno</h3><QuestionForm items={CHECKLIST} values={draft.checklist} prefix="checklist" showPending={visited.includes(6)} onChange={(key, answer) => updateDraft((current) => ({ ...current, checklist: { ...current.checklist, [key]: answer } }))} /></section><AttachmentDocuments {...mediaProps} /></div>,
    <ConclusionStep key="conclusion" {...mediaProps} error={stepIssues[0]?.message} />,
    <ReviewStep key="review" draft={draft} issues={issues} municipalities={municipalities.data ?? []} onSelect={selectStep} />,
  ]

  return <ReportsShell title="Novo Relatório" onBack={onBack} backLabel="Voltar às ações da coordenação" backHref={`/relatorios/coordenacoes/${coordination.id}`}>
    {!idIsValid || coordination.code.toUpperCase() !== 'COTEC' ? <div className="my-10 rounded-xl border bg-white p-6"><p role="alert">{!idIsValid ? 'O identificador do rascunho é inválido.' : 'O formulário de vistoria técnica de terreno está disponível para a COTEC. O modelo desta coordenação ainda não foi disponibilizado.'}</p><Button className="mt-4 h-11" onClick={onBack}>Voltar às ações</Button></div>
      : form.loading ? <p role="status" className="my-16 flex items-center justify-center gap-3 text-slate-600"><LoaderCircleIcon aria-hidden="true" className="size-5 animate-spin" />Recuperando rascunho…</p>
      : form.loadError ? <div role="alert" className="my-10 rounded-xl border border-red-200 bg-red-50 p-6"><p>{form.loadError.message}</p><div className="mt-4 flex gap-3"><Button className="h-11" onClick={form.retryLoad}>Tentar novamente</Button><Button variant="outline" className="h-11" onClick={onBack}>Voltar</Button></div></div>
      : <div className="flex flex-1 flex-col gap-5 pb-8 pt-5 lg:flex-row lg:items-start lg:gap-6 lg:pt-6 xl:gap-8">
        <WizardNavigation active={step} onSelect={selectStep} issues={issues} visited={visited} />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <section aria-labelledby="report-step-heading" className="flex min-h-[590px] flex-col border border-[#d8d8d8] bg-white p-5 shadow-[0_4px_28px_#07357406] sm:p-7 xl:p-8">
            <div className="mb-7"><h2 ref={heading} tabIndex={-1} id="report-step-heading" className="text-2xl font-bold leading-snug text-[#073574] outline-none xl:text-[28px]">Etapa {step + 1} de 9 – {REPORT_STEPS[step][0]}</h2><p className="mt-1 text-sm font-medium text-slate-500 sm:text-base">{REPORT_STEPS[step][1]}</p><p className="mt-3 text-xs text-slate-500"><span className="text-red-600">*</span> Obrigatório para finalizar. Você pode navegar com campos pendentes.</p></div>
            <fieldset disabled={form.generating || exiting} className="min-w-0 flex-1">{contents[step]}</fieldset>
            {form.saveError && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p>{form.saveError.message}</p>{errorMessages.length > 0 && <ul className="mt-2 list-disc pl-5">{errorMessages.map((message, index) => <li key={index}>{message}</li>)}</ul>}<Button variant="outline" className="mt-3 h-10 bg-white" disabled={form.saving} onClick={() => { form.save().catch(() => {}) }}>Tentar salvar novamente</Button></div>}
            <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <div>{step > 0 && <Button variant="outline" className="h-12 px-5 text-[#073574]" onClick={() => selectStep(step - 1)}><ArrowLeftIcon aria-hidden="true" className="size-5" />Anterior</Button>}</div>
              <div className="flex w-full flex-wrap gap-3 sm:w-auto"><Button variant="secondary" className="h-12 flex-1 bg-[#e8e8e8] px-5 font-bold text-[#073574] sm:min-w-40" disabled={exiting || form.generating || form.localFiles > 0} onClick={saveAndExit}>{exiting ? <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" /> : <SaveIcon aria-hidden="true" className="size-4" />}{exiting ? 'Salvando…' : 'Salvar e Sair'}</Button>
                {step < 8 ? <Button className="h-12 flex-1 bg-[#4058f4] px-6 font-bold text-white hover:bg-[#3046d6] sm:min-w-40" onClick={() => selectStep(step + 1)}>Próximo<ArrowRightIcon aria-hidden="true" className="size-5" /></Button> : <Button className="h-12 flex-1 bg-[#4058f4] px-6 font-bold text-white sm:min-w-40" disabled={issues.some((section) => section.length) || form.generating || exiting} onClick={finish}>{form.generating ? <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin" /> : <CheckCircle2Icon aria-hidden="true" className="size-4" />}{form.generating ? 'Finalizando…' : 'Finalizar relatório'}</Button>}
              </div>
            </div>
            {step === 8 && issues.some((section) => section.length) && <p className="mt-3 text-right text-xs text-amber-900">Seu relatório não poderá ser finalizado pois ainda existem campos obrigatórios, pendentes de preenchimento</p>}
          </section>
          <div className="flex flex-wrap items-start justify-between gap-2 text-xs leading-relaxed text-slate-500">
            <p role="status">{form.saving ? 'Salvando campos no servidor…' : form.saveError ? 'Salvamento não confirmado. Seus valores continuam nesta sessão.' : form.dirty ? 'Alterações aguardando salvamento automático.' : form.savedAt ? `Campos salvos no servidor às ${form.savedAt}.` : form.id ? 'Rascunho recuperado do servidor.' : 'Novo rascunho · salvamento automático ao preencher.'}</p>
            <p>{draft.assets.length}/20 figuras · {form.localFiles} arquivo(s) com envio pendente</p>
          </div>
          {form.localFiles > 0 && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs leading-relaxed text-amber-900">Há arquivos com envio ou vínculo pendente. Aguarde a confirmação ou tente novamente nos arquivos com erro antes de sair. A finalização exige a confirmação de todos os arquivos selecionados.</p>}
        </div>
      </div>}
  </ReportsShell>
}
