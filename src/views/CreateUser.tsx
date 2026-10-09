import { ArrowLeftIcon, RefreshCwIcon } from 'lucide-react'
import { UserForm } from '@/components/users/UserForm'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useUserForm } from '@/hooks/use-user-form'
import type { UserFormOptions } from '@/hooks/use-user-form'

type CreateUserProps = UserFormOptions & { onBack: () => void }

function UserEditor(props: CreateUserProps) {
  const form = useUserForm(props)
  const isEditing = Boolean(props.userId)

  return (
    <section aria-labelledby="user-form-heading" className="flex min-w-0 flex-col gap-6 lg:gap-7">
      <div>
        <Button variant="ghost" nativeButton={false} render={<a href="/usuarios" />} className="mb-4 h-11 gap-2 px-3 text-primary" onClick={(event) => {
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          if (!form.isSubmitting) props.onBack()
        }} aria-disabled={form.isSubmitting}>
          <ArrowLeftIcon aria-hidden="true" />Voltar para usuários
        </Button>
        <h1 id="user-form-heading" className="text-2xl font-semibold tracking-tight text-primary lg:text-3xl">{isEditing ? 'Editar usuário' : 'Criar usuário'}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{isEditing ? 'Atualize os dados, o perfil de acesso e a coordenação do usuário.' : 'Cadastre um usuário e configure seu perfil de acesso e sua coordenação.'}</p>
      </div>

      {form.userLoading ? <div role="status" aria-label="Carregando dados do usuário" className="w-full max-w-3xl space-y-6 rounded-xl border border-border bg-card p-6"><Skeleton className="h-6 w-44" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /><p className="sr-only">Carregando dados do usuário…</p></div> : form.userError ? <div role="alert" className="flex w-full max-w-3xl flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
        <p>{form.userError}</p>
        <Button variant="outline" className="h-11 gap-2 bg-card" onClick={form.retryUser}><RefreshCwIcon aria-hidden="true" />Tentar novamente</Button>
      </div> : <UserForm values={form.values} fieldErrors={form.fieldErrors} error={form.error} isEditing={isEditing} isSubmitting={form.isSubmitting} canSubmit={form.canSubmit} roles={form.roles} rolesLoading={form.rolesLoading} rolesError={form.rolesError} onRetryRoles={form.retryRoles} coordinations={form.coordinations} currentCoordination={form.currentCoordination} coordinationRequired={form.coordinationRequired} coordinationDisabled={form.coordinationDisabled} coordinationsLoading={form.coordinationsLoading} coordinationsError={form.coordinationsError} onRetryCoordinations={form.retryCoordinations} onChange={form.setFieldValue} onSubmit={form.handleSubmit} onCancel={props.onBack} />}
    </section>
  )
}

export default function CreateUser(props: CreateUserProps) {
  // A new session or target user must never inherit another form's data or password.
  return <UserEditor key={`${props.accessToken}:${props.userId ?? 'new'}`} {...props} />
}
