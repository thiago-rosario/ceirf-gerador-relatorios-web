import { useState } from 'react'
import { CheckCircle2Icon, FileTextIcon, SaveIcon, SparklesIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReportsShell } from '@/components/reports/ReportsShell'
import { FormField, reportControlClass } from '@/components/reports/wizard/FormField'
import { todayInBahia, validInspectionDate } from '@/service/report-form-model'
import { presentationReports } from '@/service/presentation-data'
import type { Coordination, SessionUser } from '@/types/users'

type Model = { title: string; typology: string; description: string; conclusion: string; fields: [string, string, string][] }

const models: Record<string, Model> = {
  COPROJ: {
    title: 'Acompanhamento de Projeto', typology: 'Projeto arquitetônico de unidade policial',
    description: 'Registre o escopo do projeto e o andamento da elaboração técnica.',
    conclusion: 'O estudo preliminar atende ao programa de necessidades. A próxima etapa contempla a compatibilização das disciplinas e a consolidação do projeto executivo.',
    fields: [['project_name', 'Projeto', 'Nova unidade de segurança pública'], ['design_stage', 'Etapa do projeto', 'Compatibilização dos projetos'], ['technical_scope', 'Escopo técnico', 'Arquitetura, instalações elétricas e hidrossanitárias, acessibilidade e prevenção de incêndio.']],
  },
  CORMAN: {
    title: 'Manutenção Predial', typology: 'Manutenção preventiva de unidade policial',
    description: 'Registre as condições da unidade e as intervenções de manutenção.',
    conclusion: 'A unidade apresenta condições de funcionamento. Recomenda-se executar as intervenções preventivas indicadas e acompanhar os serviços em uma nova vistoria.',
    fields: [['unit_name', 'Unidade atendida', 'Unidade territorial de segurança pública'], ['priority', 'Prioridade', 'Programada'], ['interventions', 'Intervenções previstas', 'Revisão da cobertura, pintura das áreas internas e manutenção das instalações elétricas.']],
  },
  CADM: {
    title: 'Acompanhamento Administrativo', typology: 'Acompanhamento de processo administrativo',
    description: 'Organize os dados do processo e as providências administrativas.',
    conclusion: 'A documentação foi conferida e o processo está apto a seguir para análise. As providências registradas serão acompanhadas pela equipe administrativa.',
    fields: [['process_number', 'Processo SEI', '012.3456.2026.0000123-45'], ['responsible_team', 'Setor responsável', 'Equipe de gestão administrativa'], ['administrative_scope', 'Providências', 'Conferência documental, atualização do cronograma e encaminhamento para análise técnica.']],
  },
  COROB: {
    title: 'Acompanhamento de Obra', typology: 'Acompanhamento da execução de obra',
    description: 'Registre a evolução dos serviços e as próximas etapas da obra.',
    conclusion: 'Os serviços vistoriados seguem o cronograma previsto. Recomenda-se manter o acompanhamento da execução e conferir os serviços antes da próxima medição.',
    fields: [['work_name', 'Obra', 'Construção de unidade de segurança pública'], ['execution_progress', 'Execução física', '65%'], ['work_stage', 'Serviços em andamento', 'Alvenaria de vedação, instalações e preparação dos revestimentos.']],
  },
}

type Values = { municipality: string; typology: string; inspectionDate: string; collaborators: string; conclusion: string; details: Record<string, string> }
type Props = {
  accessToken: string; coordination: Coordination; user: SessionUser; search: string; onBack: () => void;
  onNavigate: (href: string, replace?: boolean) => void; onSessionInvalid: () => void; refreshUser: () => Promise<SessionUser | null>
}

export default function CreatePresentationReport({ coordination, user, onBack, onNavigate }: Props) {
  const model = models[coordination.code.toUpperCase()] ?? models.CADM
  const example = presentationReports.find((report) => report.coordination.code === coordination.code.toUpperCase())
  const sample = (): Values => ({ municipality: example?.cover?.municipality?.name ?? 'Salvador', typology: example?.cover?.typology ?? model.typology, inspectionDate: todayInBahia(), collaborators: user.name,
    conclusion: model.conclusion, details: Object.fromEntries(model.fields.map(([key, , example]) => [key, example])) })
  const [values, setValues] = useState<Values>(sample)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState('Dados de exemplo disponíveis para apresentação.')

  const update = <K extends keyof Values>(key: K, value: Values[K]) => { setValues((current) => ({ ...current, [key]: value })); setError(null); setNotice('Alterações prontas para salvar.') }
  const fillExample = () => {
    setValues(sample())
    setError(null)
    setNotice('Exemplo preenchido. Você pode ajustar os dados antes de salvar.')
  }
  const apply = (action: 'save' | 'exit' | 'finish') => {
    if (action === 'finish' && (!values.municipality.trim() || !values.typology.trim() || !values.collaborators.trim() || !values.conclusion.trim() || !validInspectionDate(values.inspectionDate))) {
      setError('Preencha o município, a tipologia, os colaboradores, a conclusão e uma data válida para finalizar.'); return
    }
    setError(null)
    if (action === 'finish' && example) onNavigate(`/relatorios/${example.id}`)
    else if (action === 'exit') onBack()
    else setNotice(action === 'finish' ? 'Relatório de exemplo finalizado.' : 'Alterações aplicadas à apresentação.')
  }

  return <ReportsShell coordination={coordination} onBack={onBack} backHref={`/relatorios/coordenacoes/${coordination.id}`}>
    <div className="mx-auto w-full max-w-[1100px] py-7 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div><h2 className="flex items-center gap-3 text-2xl font-bold text-[#073574]"><FileTextIcon aria-hidden="true" className="size-7" />{model.title}</h2><p className="mt-2 text-slate-600">{model.description}</p></div>
        <Button variant="outline" className="h-11 bg-white" onClick={fillExample}><SparklesIcon aria-hidden="true" className="size-4" />Preencher exemplo</Button>
      </div>
      <p className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">Dados ilustrativos para apresentação.</p>
      <form className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7" onSubmit={(event) => { event.preventDefault(); apply('finish') }}>
        <fieldset className="grid min-w-0 gap-6 md:grid-cols-2">
          <FormField label="Município" htmlFor="report-municipality" required>
            <input id="report-municipality" className={reportControlClass} maxLength={100} value={values.municipality} onChange={(event) => update('municipality', event.target.value)} required />
          </FormField>
          <FormField label="Data do acompanhamento" htmlFor="presentation-date" required><input id="presentation-date" type="date" className={reportControlClass} max={todayInBahia()} value={values.inspectionDate} onChange={(event) => update('inspectionDate', event.target.value)} required /></FormField>
          <FormField label="Tipologia" htmlFor="presentation-typology" required><input id="presentation-typology" className={reportControlClass} maxLength={100} value={values.typology} onChange={(event) => update('typology', event.target.value)} required /></FormField>
          <FormField label="Colaboradores" htmlFor="presentation-collaborators" required><input id="presentation-collaborators" className={reportControlClass} maxLength={1000} value={values.collaborators} onChange={(event) => update('collaborators', event.target.value)} required /></FormField>
          {model.fields.map(([key, label], index) => <div key={key} className={index === 2 ? 'md:col-span-2' : ''}><FormField label={label} htmlFor={`presentation-${key}`}>
            {index === 2 ? <textarea id={`presentation-${key}`} rows={3} maxLength={1500} className={`${reportControlClass} resize-y`} value={values.details[key] ?? ''} onChange={(event) => update('details', { ...values.details, [key]: event.target.value })} />
              : <input id={`presentation-${key}`} maxLength={250} className={reportControlClass} value={values.details[key] ?? ''} onChange={(event) => update('details', { ...values.details, [key]: event.target.value })} />}
          </FormField></div>)}
          <div className="md:col-span-2"><FormField label="Conclusão" htmlFor="presentation-conclusion" required><textarea id="presentation-conclusion" rows={5} maxLength={3000} className={`${reportControlClass} resize-y`} value={values.conclusion} onChange={(event) => update('conclusion', event.target.value)} required /></FormField></div>
        </fieldset>
        {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
          <p role="status" className="text-sm text-slate-500">{notice}</p>
          <div className="flex flex-wrap gap-3"><Button type="button" variant="outline" className="h-11" onClick={() => apply('save')}><SaveIcon aria-hidden="true" className="size-4" />Salvar rascunho</Button><Button type="button" variant="secondary" className="h-11" onClick={() => apply('exit')}>Salvar e sair</Button><Button type="submit" className="h-11"><CheckCircle2Icon aria-hidden="true" className="size-4" />Finalizar relatório</Button></div>
        </div>
      </form>
    </div>
  </ReportsShell>
}
