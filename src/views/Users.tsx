import { useEffect, useRef, useState } from 'react'
import { ArrowLeftIcon, RefreshCwIcon, SearchIcon, UserPlusIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { UserActionDialog } from '@/components/users/UserActionDialog'
import type { UserAction } from '@/components/users/UserActionDialog'
import { UsersTable } from '@/components/users/UsersTable'
import { useUsers } from '@/hooks/use-users'
import { deactivateUser, resetUserPassword } from '@/service/users-service'
import type { User } from '@/types/users'

type UsersProps = {
  accessToken: string
  currentUserId: string
  notice: string
  onBack: () => void
  onCreate: () => void
  onEdit: (user: User) => void
  onSessionInvalid: () => void
  onPermissionDenied: () => void
  onClearNotice: () => void
}

export default function Users({ accessToken, currentUserId, notice, onBack, onCreate, onEdit, onSessionInvalid, onPermissionDenied, onClearNotice }: UsersProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')
  const [action, setAction] = useState<UserAction | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState('')
  const submittingRef = useRef(false)
  const mountedRef = useRef(true)
  const { users, error, isLoading, reload } = useUsers(accessToken, filter)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    if (!error || !('status' in error)) return
    if (error.status === 401) onSessionInvalid()
    if (error.status === 403) onPermissionDenied()
  }, [error, onSessionInvalid, onPermissionDenied])

  const confirmAction = async () => {
    if (!action || submittingRef.current) return
    submittingRef.current = true
    setIsSubmitting(true)
    setActionError('')
    setSuccess('')
    onClearNotice()

    try {
      if (action.type === 'reset-password') await resetUserPassword(accessToken, action.user.id)
      else await deactivateUser(accessToken, action.user.id)
      if (action.user.id === currentUserId) {
        onSessionInvalid()
        return
      }
      if (!mountedRef.current) return

      setSuccess(action.type === 'reset-password'
        ? 'Senha redefinida com sucesso. O usuário deverá alterá-la no próximo acesso.'
        : 'Usuário desativado com sucesso.')
      setAction(null)
      reload()
    } catch (caught) {
      if (!mountedRef.current) return
      if (caught instanceof Error && 'status' in caught) {
        if (caught.status === 401) { onSessionInvalid(); return }
        if (caught.status === 403) { onPermissionDenied(); return }
      }
      setActionError(caught instanceof Error ? caught.message : 'Não foi possível concluir a operação. Tente novamente.')
    } finally {
      submittingRef.current = false
      if (mountedRef.current) setIsSubmitting(false)
    }
  }

  return (
    <section aria-labelledby="users-heading" className="flex min-w-0 flex-col gap-6 lg:gap-7">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <Button nativeButton={false} render={<a href="/dashboard" />} variant="ghost" className="mb-3 h-11 gap-2 px-0 text-primary" onClick={(event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
            event.preventDefault(); onBack()
          }}><ArrowLeftIcon aria-hidden="true" />Voltar</Button>
          <h1 id="users-heading" tabIndex={-1} className="text-2xl font-semibold tracking-tight text-primary outline-none lg:text-3xl">Usuários</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Gerencie os usuários e seus perfis de acesso à CEIRF.</p>
        </div>
        <Button nativeButton={false} render={<a href="/usuarios/novo" />} className="h-11 gap-2 px-5" onClick={(event) => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault(); onCreate()
        }}><UserPlusIcon aria-hidden="true" />Novo usuário</Button>
      </div>

      {(success || notice) && <p role="status" className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{success || notice}</p>}
      <form aria-label="Buscar usuários" className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(event) => {
        event.preventDefault()
        if (submittingRef.current) return
        setFilter(search.trim())
      }}>
        <div className="w-full sm:max-w-md">
          <label htmlFor="users-search" className="mb-2 block text-sm font-medium">Buscar por nome ou e-mail</label>
          <Input id="users-search" type="search" maxLength={255} value={search} disabled={isSubmitting} onChange={(event) => setSearch(event.target.value)} className="h-11 bg-card" placeholder="Nome ou e-mail" />
        </div>
        <Button type="submit" variant="outline" className="h-11 gap-2 bg-card" disabled={isSubmitting}><SearchIcon aria-hidden="true" />Buscar</Button>
        {filter && <Button type="button" variant="ghost" className="h-11" disabled={isSubmitting} onClick={() => { setSearch(''); setFilter('') }}>Limpar busca</Button>}
      </form>

      {error ? <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
        <p>{error.message}</p>
        <Button type="button" variant="outline" className="h-11 gap-2 bg-card" onClick={reload}><RefreshCwIcon aria-hidden="true" />Tentar novamente</Button>
      </div> : <>
        {!isLoading && <p role="status" className="text-sm text-muted-foreground">{users.length} {users.length === 1 ? 'usuário encontrado' : 'usuários encontrados'}</p>}
        <UsersTable users={users} isLoading={isLoading} isFiltered={Boolean(filter)} disabled={isSubmitting} onEdit={onEdit}
          onAction={(next) => { setActionError(''); setAction(next) }} />
      </>}

      <UserActionDialog action={action} isSubmitting={isSubmitting} error={actionError} currentUserId={currentUserId}
        onClose={() => { if (!submittingRef.current) { setAction(null); setActionError('') } }} onConfirm={confirmAction} />
    </section>
  )
}
