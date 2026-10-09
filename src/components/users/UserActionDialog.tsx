import { useRef } from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { KeyRoundIcon, LoaderCircleIcon, UserRoundXIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { User } from '@/types/users'

export type UserAction = { type: 'deactivate' | 'reset-password'; user: User }

type UserActionDialogProps = {
  action: UserAction | null
  isSubmitting: boolean
  error: string
  currentUserId: string
  onClose: () => void
  onConfirm: () => void
}

export function UserActionDialog({ action, isSubmitting, error, currentUserId, onClose, onConfirm }: UserActionDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const isReset = action?.type === 'reset-password'
  const isCurrentUser = action?.user.id === currentUserId

  return (
    <Dialog.Root open={Boolean(action)} disablePointerDismissal onOpenChange={(open) => {
      if (!open && !isSubmitting) onClose()
    }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-slate-900/25" />
        <Dialog.Popup initialFocus={() => {
          returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          return cancelRef.current
        }} finalFocus={() => returnFocusRef.current?.isConnected ? returnFocusRef.current : document.getElementById('users-heading')}
          aria-busy={isSubmitting}
          className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-sm outline-none">
          <div className={`mb-5 flex size-12 items-center justify-center rounded-lg ${isReset ? 'bg-accent text-primary' : 'bg-red-50 text-destructive'}`}>
            {isReset ? <KeyRoundIcon aria-hidden="true" className="size-6" /> : <UserRoundXIcon aria-hidden="true" className="size-6" />}
          </div>
          <Dialog.Title className="text-xl font-semibold text-primary">{isReset ? 'Redefinir senha' : 'Desativar usuário'}</Dialog.Title>
          <Dialog.Description className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {isReset ? 'Tem certeza de que deseja redefinir a senha deste usuário?' : 'Tem certeza de que deseja desativar este usuário? Ele perderá o acesso ao sistema.'}
          </Dialog.Description>
          <p className="mt-3 break-words text-sm font-medium text-foreground">{action?.user.name}<span className="mt-1 block font-normal text-muted-foreground">{action?.user.email}</span></p>
          {isCurrentUser && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Esta é a sua conta. Ao confirmar, sua sessão será encerrada.</p>}
          {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button ref={cancelRef} type="button" variant="outline" className="h-11" disabled={isSubmitting} onClick={onClose}>Cancelar</Button>
            <Button type="button" variant={isReset ? 'default' : 'destructive'} className="h-11 gap-2" disabled={isSubmitting} onClick={onConfirm}>
              {isSubmitting && <LoaderCircleIcon aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}
              {isSubmitting ? 'Aguarde…' : isReset ? 'Redefinir senha' : 'Desativar usuário'}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
