import { FilePenLineIcon, FilePlus2Icon, LoaderCircleIcon, SearchIcon } from 'lucide-react'
import { ReportActionCard } from '@/components/reports/ReportActionCard'
import { ReportsShell } from '@/components/reports/ReportsShell'
import { getReportPermissions } from '@/service/reports-access'
import type { Coordination, SessionUser } from '@/types/users'

type CoordinationActionsProps = {
  coordination: Coordination
  user: SessionUser
  onBack: () => void
  onNavigate: (href: string) => void
  isLoading?: boolean
}

export default function CoordinationActions({ coordination, user, onBack, onNavigate, isLoading = false }: CoordinationActionsProps) {
  const permissions = getReportPermissions(user, coordination.id, isLoading)
  const coordinationHref = `/relatorios/coordenacoes/${coordination.id}`

  return (
    <ReportsShell coordination={coordination} onBack={onBack}>
      <div className="flex flex-1 flex-col items-center justify-center py-12 sm:py-14 lg:py-16">
        <h2 className="text-center text-[26px] font-bold leading-tight text-[#073574] sm:text-[32px]">O que você deseja fazer?</h2>
        <span aria-hidden="true" className="mt-5 h-1.5 w-9 rounded-full bg-[#073574]" />
        {isLoading ? <p role="status" className="mt-12 flex items-center gap-3 text-slate-600">
          <LoaderCircleIcon aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none" />
          Carregando permissões…
        </p> : <div className="mt-10 flex w-full max-w-7xl flex-wrap justify-center gap-6 sm:mt-12 lg:gap-8">
          {permissions.create && <ReportActionCard
            title="Novo Relatório"
            description="Crie um novo relatório desta coordenação"
            href={`${coordinationHref}/novo`}
            Icon={FilePlus2Icon}
            color="#3564ad"
            onNavigate={onNavigate}
          />}
          {permissions.search && <ReportActionCard
            title="Pesquisar Relatório"
            description="Pesquise, visualize e baixe relatórios de todas as coordenações"
            href="/relatorios/pesquisar"
            Icon={SearchIcon}
            color="#008f49"
            onNavigate={onNavigate}
          />}
          {permissions.review && <ReportActionCard
            title="Relatórios em Revisão"
            description="Acompanhe relatórios pendentes de revisão e correções"
            href={`${coordinationHref}/revisao`}
            Icon={FilePenLineIcon}
            color="#76539e"
            onNavigate={onNavigate}
          />}
        </div>}
      </div>
    </ReportsShell>
  )
}
