import { useEffect, useId, useRef } from 'react'
import type { FormEvent } from 'react'
import { InfoIcon, LoaderCircleIcon, RefreshCwIcon, SaveIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Coordination, FieldErrors, Role, UserFormValues } from '@/types/users'

type UserFormProps = {
  values: UserFormValues
  fieldErrors: FieldErrors
  error: string
  isEditing: boolean
  isSubmitting: boolean
  canSubmit: boolean
  roles: Role[]
  rolesLoading: boolean
  rolesError: string
  onRetryRoles: () => void
  coordinations: Coordination[]
  currentCoordination: Coordination | null
  coordinationRequired: boolean
  coordinationDisabled: boolean
  coordinationsLoading: boolean
  coordinationsError: string
  onRetryCoordinations: () => void
  onChange: (field: keyof UserFormValues, value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}

const selectClassName = 'h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive'

export function UserForm({ values, fieldErrors, error, isEditing, isSubmitting, canSubmit, roles, rolesLoading, rolesError, onRetryRoles, coordinations, currentCoordination, coordinationRequired, coordinationDisabled, coordinationsLoading, coordinationsError, onRetryCoordinations, onChange, onSubmit, onCancel }: UserFormProps) {
  const id = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const fieldId = (field: string) => `user-${field}-${id}`
  const errorId = (field: string) => `${fieldId(field)}-error`
  const currentRoleUnavailable = values.role && !roles.some((role) => role.role === values.role)
  const currentCoordinationUnavailable = currentCoordination && !coordinations.some((coordination) => coordination.id === currentCoordination.id)

  useEffect(() => {
    const firstInvalid = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
    if (firstInvalid) firstInvalid.focus()
    else if (error) errorRef.current?.focus()
  }, [error])

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader className="border-b px-5 pb-5 sm:px-6">
        <CardTitle><h2 className="text-lg font-semibold text-primary">Dados do usuário</h2></CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">Os campos marcados com * são obrigatórios.</p>
      </CardHeader>
      <CardContent className="px-5 sm:px-6">
        <form ref={formRef} onSubmit={onSubmit} aria-label={isEditing ? 'Editar usuário' : 'Criar usuário'} aria-busy={isSubmitting} className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor={fieldId('name')} className="mb-2 block text-sm font-medium">Nome completo *</label>
              <Input id={fieldId('name')} name="name" value={values.name} onChange={(event) => onChange('name', event.target.value)} autoComplete="name" required maxLength={100} disabled={isSubmitting} placeholder="Digite o nome completo" className="h-11 px-3" aria-invalid={Boolean(fieldErrors.name?.length)} aria-describedby={fieldErrors.name?.length ? errorId('name') : undefined} />
              {fieldErrors.name && <p id={errorId('name')} className="mt-2 text-sm text-red-700">{fieldErrors.name}</p>}
            </div>
            <div className="sm:col-span-2">
              <label htmlFor={fieldId('email')} className="mb-2 block text-sm font-medium">E-mail *</label>
              <Input id={fieldId('email')} name="email" type="email" value={values.email} onChange={(event) => onChange('email', event.target.value)} autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength={150} disabled={isSubmitting} placeholder="Digite o e-mail" className="h-11 px-3" aria-invalid={Boolean(fieldErrors.email?.length)} aria-describedby={fieldErrors.email?.length ? errorId('email') : undefined} />
              {fieldErrors.email && <p id={errorId('email')} className="mt-2 text-sm text-red-700">{fieldErrors.email}</p>}
            </div>
            {!isEditing && <div className="sm:col-span-2">
              <label htmlFor={fieldId('password')} className="mb-2 block text-sm font-medium">Senha inicial *</label>
              <Input id={fieldId('password')} name="password" type="password" value={values.password} onChange={(event) => onChange('password', event.target.value)} autoComplete="new-password" required disabled={isSubmitting} placeholder="Digite a senha inicial" className="h-11 px-3" aria-invalid={Boolean(fieldErrors.password?.length)} aria-describedby={fieldErrors.password?.length ? errorId('password') : undefined} />
              {fieldErrors.password && <p id={errorId('password')} className="mt-2 text-sm text-red-700">{fieldErrors.password}</p>}
            </div>}
            <div className="sm:col-span-2">
              <label htmlFor={fieldId('role')} className="mb-2 block text-sm font-medium">Perfil</label>
              <select id={fieldId('role')} name="role" value={values.role} onChange={(event) => onChange('role', event.target.value)} disabled={isSubmitting || rolesLoading || Boolean(rolesError)} className={selectClassName} aria-invalid={Boolean(fieldErrors.role?.length)} aria-describedby={`${fieldId('role')}-help${fieldErrors.role?.length ? ` ${errorId('role')}` : ''}`}>
                <option value="">{rolesLoading ? 'Carregando perfis…' : isEditing ? 'Manter o perfil atual' : 'Usar o perfil padrão do sistema'}</option>
                {currentRoleUnavailable && !rolesLoading && <option value={values.role}>Perfil atual: {values.role}</option>}
                {roles.map((role) => <option key={role.id} value={role.role}>{role.name}</option>)}
              </select>
              <p id={`${fieldId('role')}-help`} className="mt-2 text-sm leading-relaxed text-muted-foreground">{isEditing ? 'O perfil define as permissões de acesso do usuário.' : 'Se nenhum perfil for selecionado, será usado o perfil padrão do sistema.'}</p>
              {fieldErrors.role && <p id={errorId('role')} className="mt-2 text-sm text-red-700">{fieldErrors.role}</p>}
              {rolesError && <div role="alert" className="mt-3 flex flex-col items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
                <p>{rolesError} Carregue os perfis para salvar o usuário.</p>
                <Button type="button" variant="outline" className="h-11 gap-2 bg-card" onClick={onRetryRoles} disabled={isSubmitting}><RefreshCwIcon aria-hidden="true" />Tentar novamente</Button>
              </div>}
              {!rolesLoading && !rolesError && roles.length === 0 && <p role="status" className="mt-2 text-sm text-muted-foreground">Nenhum perfil disponível para seleção.</p>}
            </div>
          </div>

          <section aria-labelledby={`${fieldId('coordination_id')}-heading`} className="space-y-3 rounded-lg border border-blue-100 bg-blue-50/60 p-4">
            <div className="flex items-start gap-3">
              <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <h3 id={`${fieldId('coordination_id')}-heading`} className="text-sm font-semibold text-primary">Coordenação do usuário</h3>
                <p id={`${fieldId('coordination_id')}-help`} className="mt-1 text-sm leading-relaxed text-muted-foreground">{coordinationDisabled ? 'Superusuários têm acesso global e não possuem vínculo com coordenação.' : coordinationRequired ? 'Selecione a coordenação vinculada ao usuário. Este campo é obrigatório para o perfil selecionado.' : 'O vínculo com coordenação é opcional para o perfil selecionado.'}</p>
              </div>
            </div>
            <label htmlFor={fieldId('coordination_id')} className="block text-sm font-medium">Coordenação{coordinationRequired ? ' *' : ''}</label>
            <select id={fieldId('coordination_id')} name="coordination_id" value={values.coordination_id} onChange={(event) => onChange('coordination_id', event.target.value)} required={coordinationRequired} disabled={coordinationDisabled || isSubmitting || coordinationsLoading || Boolean(coordinationsError)} className={selectClassName} aria-invalid={Boolean(fieldErrors.coordination_id?.length)} aria-describedby={`${fieldId('coordination_id')}-help${fieldErrors.coordination_id?.length ? ` ${errorId('coordination_id')}` : ''}`}>
              <option value="">{coordinationsLoading ? 'Carregando coordenações…' : coordinationRequired ? 'Selecione a coordenação' : 'Sem coordenação'}</option>
              {currentCoordinationUnavailable && !coordinationsLoading && <option value={String(currentCoordination.id)}>{currentCoordination.code} — {currentCoordination.name} (coordenação atual)</option>}
              {coordinations.map((coordination) => <option key={coordination.id} value={String(coordination.id)}>{coordination.code} — {coordination.name}</option>)}
            </select>
            {fieldErrors.coordination_id && <p id={errorId('coordination_id')} className="text-sm text-red-700">{fieldErrors.coordination_id}</p>}
            {currentCoordinationUnavailable && !coordinationsLoading && !coordinationsError && !coordinationDisabled && <p className="text-sm text-muted-foreground">A coordenação atual não está disponível para novos vínculos. Você pode mantê-la ou selecionar outra coordenação.</p>}
            {coordinationsError && <div role="alert" className="flex flex-col items-start gap-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
              <p>{coordinationsError} Carregue as coordenações para salvar o usuário.</p>
              <Button type="button" variant="outline" className="h-11 gap-2 bg-card" onClick={onRetryCoordinations} disabled={isSubmitting}><RefreshCwIcon aria-hidden="true" />Tentar novamente</Button>
            </div>}
            {!coordinationsLoading && !coordinationsError && coordinations.length === 0 && <p role="status" className="text-sm text-muted-foreground">Nenhuma coordenação ativa disponível para novos vínculos.</p>}
          </section>

          {error && <p ref={errorRef} role="alert" tabIndex={-1} className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 outline-none focus-visible:ring-2 focus-visible:ring-red-700">{error}</p>}
          <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="h-11 px-5" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
            <Button type="submit" className="h-11 gap-2 px-5" disabled={!canSubmit}>
              {isSubmitting ? <LoaderCircleIcon aria-hidden="true" className="animate-spin motion-reduce:animate-none" /> : <SaveIcon aria-hidden="true" />}
              {isSubmitting ? 'Salvando…' : isEditing ? 'Salvar alterações' : 'Criar usuário'}
            </Button>
          </div>
          {(rolesLoading || coordinationsLoading) && <p role="status" className="sr-only">Carregando {rolesLoading ? 'perfis' : 'coordenações'}…</p>}
        </form>
      </CardContent>
    </Card>
  )
}
