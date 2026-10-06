import { Dialog } from '@base-ui/react/dialog'
import { FilePlus2Icon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ReportEntryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-slate-900/25" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-sm outline-none">
          <div className="mb-5 flex size-12 items-center justify-center rounded-lg bg-accent text-primary">
            <FilePlus2Icon aria-hidden="true" className="size-6" />
          </div>
          <Dialog.Title className="pr-8 text-xl font-semibold text-primary">Novo Relatório</Dialog.Title>
          <Dialog.Description className="mt-3 text-sm leading-relaxed text-muted-foreground">
            A criação de relatórios ainda não está disponível nesta versão. Quando estiver disponível, você poderá iniciar seu relatório por aqui.
          </Dialog.Description>
          <Dialog.Close render={<Button variant="ghost" size="icon" className="absolute top-3 right-3 size-11" aria-label="Fechar" />}>
            <XIcon aria-hidden="true" />
          </Dialog.Close>
          <Dialog.Close render={<Button className="mt-6 h-11 w-full" />}>Entendi</Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
