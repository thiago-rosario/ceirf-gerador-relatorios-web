import { FilePenLineIcon, FilePlus2Icon, SearchIcon } from 'lucide-react'
import { ReportsShell } from '@/components/reports/ReportsShell'
import { Button } from '@/components/ui/button'
import type { Coordination } from '@/types/users'

const destinations = {
  create: {
    title: 'Novo Relatório', Icon: FilePlus2Icon, color: '#3564ad',
    description: 'A criação de relatórios ainda não está disponível nesta versão.',
  },
  search: {
    title: 'Pesquisar Relatório', Icon: SearchIcon, color: '#008f49',
    description: 'A tela de pesquisa ainda está em preparação. A consulta permitirá pesquisar, visualizar e baixar relatórios de todas as coordenações.',
  },
  review: {
    title: 'Relatórios em Revisão', Icon: FilePenLineIcon, color: '#76539e',
    description: 'A fila de revisão ainda não está disponível. Quando habilitada, exibirá os relatórios que você tem permissão para revisar e acompanhar.',
  },
}

type ReportDestinationProps = {
  screen: keyof typeof destinations
  coordination?: Coordination
  onBack: () => void
}

export default function ReportDestination({ screen, coordination, onBack }: ReportDestinationProps) {
  const { title, Icon, color, description } = destinations[screen]
  const Heading = coordination ? 'h2' : 'h1'
  return (
    <ReportsShell coordination={coordination} onBack={onBack}
      backHref={coordination ? `/relatorios/coordenacoes/${coordination.id}` : '/relatorios'}>
      <div className="flex flex-1 items-center justify-center py-12 sm:py-16">
        <div className="w-full max-w-xl rounded-[32px] border border-[#dedede] bg-white p-7 text-center shadow-[0_2px_12px_rgba(0,0,0,0.08)] sm:p-10">
          <Icon aria-hidden="true" className="mx-auto mb-6 size-20" style={{ color }} strokeWidth={1.5} />
          <Heading className="text-2xl font-bold text-[#073574] sm:text-3xl">{title}</Heading>
          <p role="status" className="mt-4 text-base leading-relaxed text-slate-600">{description}</p>
          <Button className="mt-7 h-11" onClick={onBack}>Voltar {coordination ? 'às ações' : 'às coordenações'}</Button>
        </div>
      </div>
    </ReportsShell>
  )
}
