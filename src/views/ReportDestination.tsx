import { useRef, useState } from 'react'
import { CheckIcon, FilePenLineIcon, SearchIcon } from 'lucide-react'
import { ReportsShell } from '@/components/reports/ReportsShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { presentationEnabled } from '@/service/presentation-config'
import { getReportPermissions } from '@/service/reports-access'
import { decideReviewReport, filterReviewReports, listReviewReports } from '@/service/report-review-service'
import type { Coordination, SessionUser } from '@/types/users'

const statusLabels = { PENDING: 'Em revisão', CHANGES_REQUESTED: 'Correção solicitada', APPROVED: 'Aprovado' }
const statusClasses = {
  PENDING: 'bg-violet-100 text-violet-800',
  CHANGES_REQUESTED: 'bg-amber-100 text-amber-900',
  APPROVED: 'bg-emerald-100 text-emerald-800',
}
const date = (value: string) => new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString('pt-BR')
const message = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível atualizar a revisão.'

type ReportDestinationProps = {
  screen: 'review'
  coordination?: Coordination
  user?: SessionUser
  onBack: () => void
}

function ReviewQueue({ coordination, user, onBack }: { coordination: Coordination, user: SessionUser, onBack: () => void }) {
  const [reports, setReports] = useState(() => listReviewReports(user, coordination))
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('ALL')
  const [selectedId, setSelectedId] = useState(reports[0]?.id)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const commentRef = useRef<HTMLTextAreaElement>(null)
  const filtered = filterReviewReports(reports, { query, status })
  const selected = reports.find((report) => report.id === selectedId)
  const lastReview = selected?.history.at(-1)

  const select = (id: string) => {
    setSelectedId(id)
    setComment('')
    setError('')
    setFeedback('')
  }
  const decide = (action: 'approve' | 'request_changes') => {
    if (!selected) return
    if (action === 'request_changes' && !comment.trim()) {
      setError('Informe um comentário para solicitar a correção.')
      commentRef.current?.focus()
      return
    }
    try {
      setReports(decideReviewReport(user, coordination, selected.id, { action, comment }))
      setComment('')
      setError('')
      setFeedback(action === 'approve' ? 'Relatório de apresentação aprovado.' : 'Correção solicitada no relatório de apresentação.')
    } catch (cause) { setError(message(cause)) }
  }

  return <ReportsShell coordination={coordination} onBack={onBack} backHref={`/relatorios/coordenacoes/${coordination.id}`}>
    <div className="mx-auto w-full max-w-[1440px] pb-10 pt-9 sm:pt-12">
      <h2 className="text-[26px] font-bold text-[#073574] sm:text-[30px]">Relatórios em Revisão</h2>
      <p className="mt-3 text-sm text-slate-500">Dados mockados para apresentação. As decisões ficam salvas apenas neste navegador.</p>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section aria-label="Fila de revisão" className="min-w-0 rounded-3xl border border-[#dedede] bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
            <div><label htmlFor="review-query" className="mb-2 block text-sm font-semibold text-[#073574]">Buscar na fila</label>
              <div className="relative"><SearchIcon aria-hidden="true" className="absolute left-3 top-3.5 size-4 text-slate-400" />
                <Input id="review-query" className="h-11 pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Município, tipologia ou autor" />
              </div>
            </div>
            <div><label htmlFor="review-status" className="mb-2 block text-sm font-semibold text-[#073574]">Situação</label>
              <select id="review-status" className="h-11 w-full rounded-lg border border-input bg-white px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="ALL">Todas as situações</option><option value="PENDING">Em revisão</option><option value="CHANGES_REQUESTED">Correção solicitada</option><option value="APPROVED">Aprovado</option>
              </select>
            </div>
          </div>
          <p role="status" className="mb-4 mt-5 text-sm text-slate-500">{filtered.length} {filtered.length === 1 ? 'relatório encontrado' : 'relatórios encontrados'}</p>
          {filtered.length ? <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm"><thead className="bg-[#f3f6fc] text-[#073574]"><tr><th scope="col" className="px-4 py-3">Relatório</th><th scope="col" className="px-4 py-3">Situação</th><th scope="col" className="px-4 py-3"><span className="sr-only">Ação</span></th></tr></thead>
              <tbody className="divide-y divide-slate-200">{filtered.map((report) => <tr key={report.id} className={selectedId === report.id ? 'bg-[#f2f5ff]' : 'bg-white'}>
                <td className="px-4 py-4"><span className="block font-semibold text-[#073574]">{report.municipality}</span><span className="mt-1 block text-slate-600">{report.typology}</span><span className="mt-1 block text-xs text-slate-500">{report.reference} · {report.author}</span></td>
                <td className="px-4 py-4"><span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses[report.status]}`}>{statusLabels[report.status]}</span></td>
                <td className="px-4 py-4"><Button variant="outline" className="h-10" aria-label={`Ver relatório de ${report.municipality}`} aria-pressed={selectedId === report.id} onClick={() => select(report.id)}>Ver</Button></td>
              </tr>)}</tbody>
            </table>
          </div> : <p className="rounded-xl bg-slate-50 p-6 text-sm text-slate-600">Nenhum relatório encontrado. Ajuste a busca ou a situação selecionada.</p>}
        </section>
        <section aria-label="Detalhe do relatório para revisão" className="min-w-0 rounded-3xl border border-[#dedede] bg-white p-5 shadow-sm sm:p-6">
          {selected ? <>
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-bold text-[#073574]">{selected.municipality}</h3><span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClasses[selected.status]}`}>{statusLabels[selected.status]}</span></div>
            <p className="mt-2 text-sm text-slate-600">{selected.typology} · {selected.reference}</p>
            <dl className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm"><div><dt className="text-slate-500">Autor</dt><dd className="mt-1 font-medium text-slate-800">{selected.author}</dd></div><div><dt className="text-slate-500">Enviado em</dt><dd className="mt-1 font-medium text-slate-800">{date(selected.submitted_at)}</dd></div><div><dt className="text-slate-500">Data da vistoria</dt><dd className="mt-1 font-medium text-slate-800">{date(selected.inspection_date)}</dd></div><div><dt className="text-slate-500">Revisão</dt><dd className="mt-1 font-medium text-slate-800">{selected.revision_number}</dd></div></dl>
            <div className="mt-5 space-y-4">{selected.sections.map((section) => <div key={section.title}><h4 className="text-sm font-semibold text-[#073574]">{section.title}</h4><p className="mt-1 text-sm leading-6 text-slate-600">{section.text}</p></div>)}</div>
            {lastReview && <div className="mt-5 rounded-xl border border-slate-200 p-4"><h4 className="text-sm font-semibold text-[#073574]">Último parecer</h4><p className="mt-2 text-sm leading-6 text-slate-600">{lastReview.comment || 'Relatório aprovado sem observações.'}</p><p className="mt-2 text-xs text-slate-500">{lastReview.author} · {date(lastReview.created_at)}</p></div>}
            {selected.status === 'PENDING' && <div className="mt-6 border-t border-slate-200 pt-5"><label htmlFor="review-comment" className="block text-sm font-semibold text-[#073574]">Comentário da revisão</label><p id="review-comment-help" className="mb-2 mt-1 text-xs text-slate-500">Obrigatório para solicitar correção.</p><textarea ref={commentRef} id="review-comment" rows={3} maxLength={2000} aria-describedby="review-comment-help" aria-invalid={Boolean(error)} className="w-full resize-y rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-[#073574] focus:ring-2 focus:ring-[#073574]/20" placeholder="Descreva o que precisa ser ajustado…" value={comment} onChange={(event) => { setComment(event.target.value); setError('') }} />
              <div className="mt-3 flex flex-wrap gap-3"><Button className="h-11 gap-2 bg-emerald-700 hover:bg-emerald-800" onClick={() => decide('approve')}><CheckIcon aria-hidden="true" className="size-4" />Aprovar relatório</Button><Button variant="outline" className="h-11" onClick={() => decide('request_changes')}>Solicitar correção</Button></div>
            </div>}
            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            {feedback && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{feedback}</p>}
          </> : <p className="text-sm text-slate-500">Selecione um relatório para ver o detalhe.</p>}
        </section>
      </div>
    </div>
  </ReportsShell>
}

export default function ReportDestination({ coordination, user, onBack }: ReportDestinationProps) {
  if (presentationEnabled && coordination && user && getReportPermissions(user, coordination.id).review) {
    return <ReviewQueue key={`${user.id}:${coordination.id}`} coordination={coordination} user={user} onBack={onBack} />
  }
  const Heading = coordination ? 'h2' : 'h1'
  return <ReportsShell coordination={coordination} onBack={onBack} backHref={coordination ? `/relatorios/coordenacoes/${coordination.id}` : '/relatorios'}>
    <div className="flex flex-1 items-center justify-center py-12 sm:py-16"><div className="w-full max-w-xl rounded-[32px] border border-[#dedede] bg-white p-7 text-center shadow-sm sm:p-10">
      <FilePenLineIcon aria-hidden="true" className="mx-auto mb-6 size-20 text-[#76539e]" strokeWidth={1.5} />
      <Heading className="text-2xl font-bold text-[#073574] sm:text-3xl">Relatórios em Revisão</Heading>
      {presentationEnabled ? <p role="alert" className="mt-4 text-base leading-relaxed text-slate-600">Você não tem permissão para revisar relatórios nesta coordenação.</p> : <p role="status" className="mt-4 text-base leading-relaxed text-slate-600">A fila de revisão ainda não está disponível. Quando habilitada, exibirá os relatórios que você tem permissão para revisar e acompanhar.</p>}
      <Button className="mt-7 h-11" onClick={onBack}>Voltar {coordination ? 'às ações' : 'às coordenações'}</Button>
    </div></div>
  </ReportsShell>
}
