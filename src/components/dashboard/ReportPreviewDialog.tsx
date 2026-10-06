import { Dialog } from '@base-ui/react/dialog'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReportDate, ReportStatusBadge } from './report-presentation'
import type { RecentReport } from '@/types/dashboard'

export function ReportPreviewDialog({ report, onClose }: { report: RecentReport | null; onClose: () => void }) {
  return (
    <Dialog.Root open={report !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-slate-900/25" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border bg-card p-6 shadow-sm outline-none">
          <p className="mb-2 text-xs font-medium text-muted-foreground">DADOS DEMONSTRATIVOS</p>
          <Dialog.Title className="pr-8 text-xl font-semibold text-primary">Visualizar relatório</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted-foreground">Prévia dos dados do relatório. O conteúdo completo será disponibilizado com a integração dos relatórios.</Dialog.Description>
          {report && (
            <dl className="mt-6 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-4 text-sm">
              <dt className="text-muted-foreground">Município</dt><dd className="break-words font-medium">{report.municipality}</dd>
              <dt className="text-muted-foreground">Coordenação</dt><dd>{report.coordination || 'Não informado'}</dd>
              <dt className="text-muted-foreground">Autor</dt><dd className="break-words">{report.author || 'Não informado'}</dd>
              <dt className="text-muted-foreground">Data</dt><dd><ReportDate date={report.date} /></dd>
              <dt className="text-muted-foreground">Status</dt><dd><ReportStatusBadge status={report.status} /></dd>
            </dl>
          )}
          <Dialog.Close render={<Button variant="ghost" className="absolute top-3 right-3 size-11" aria-label="Fechar prévia" />}><XIcon aria-hidden="true" /></Dialog.Close>
          <Dialog.Close render={<Button variant="outline" className="mt-6 h-11 w-full" />}>Fechar</Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
