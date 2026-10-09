import { KeyRoundIcon, PencilIcon, UserRoundXIcon, UsersIcon } from 'lucide-react'
import { getRoleLabel } from '@/components/layout/navigation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { User } from '@/types/users'
import type { UserAction } from './UserActionDialog'

type UsersTableProps = {
  users: User[]
  isLoading: boolean
  isFiltered: boolean
  disabled: boolean
  onEdit: (user: User) => void
  onAction: (action: UserAction) => void
}

function UserStatus({ user }: { user: User }) {
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${user.is_active ? 'bg-green-50 text-green-800' : 'bg-muted text-muted-foreground'}`}>{user.is_active ? 'Ativo' : 'Inativo'}</span>
}

function UserActions({ user, disabled, onEdit, onAction }: Pick<UsersTableProps, 'disabled' | 'onEdit' | 'onAction'> & { user: User }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Button nativeButton={false} render={<a href={`/usuarios/${user.id}/editar`} />} variant="ghost" size="icon" className="size-11 text-primary"
        aria-label={`Editar ${user.name}`} title={`Editar ${user.name}`} aria-disabled={disabled || undefined}
        onClick={(event) => {
          if (disabled) { event.preventDefault(); return }
          if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          onEdit(user)
        }}>
        <PencilIcon aria-hidden="true" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-11 text-primary" disabled={disabled}
        aria-label={`Redefinir senha de ${user.name}`} title={`Redefinir senha de ${user.name}`} onClick={() => onAction({ type: 'reset-password', user })}>
        <KeyRoundIcon aria-hidden="true" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="size-11 text-destructive" disabled={disabled || !user.is_active}
        aria-label={`Desativar ${user.name}`} title={user.is_active ? `Desativar ${user.name}` : 'Usuário já está inativo'} onClick={() => onAction({ type: 'deactivate', user })}>
        <UserRoundXIcon aria-hidden="true" />
      </Button>
    </div>
  )
}

export function UsersTable({ users, isLoading, isFiltered, disabled, onEdit, onAction }: UsersTableProps) {
  if (!isLoading && users.length === 0) {
    return (
      <div role="status" className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-5 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-lg bg-accent text-primary"><UsersIcon aria-hidden="true" className="size-6" /></span>
        <h2 className="font-semibold text-foreground">{isFiltered ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}</h2>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">{isFiltered ? 'Tente buscar por outro nome ou e-mail.' : 'Use o botão Novo usuário para cadastrar o primeiro usuário.'}</p>
      </div>
    )
  }

  const columns = ['Usuário', 'Perfil', 'Coordenação', 'Status', 'Senha', 'Ações']

  return (
    <div aria-busy={isLoading} className="overflow-hidden rounded-xl border border-border bg-card">
      {isLoading && <p role="status" className="sr-only">Carregando usuários…</p>}
      <div className="hidden md:block">
        <Table className="min-w-[960px]" aria-label="Usuários cadastrados"
          containerProps={{ tabIndex: 0, role: 'region', 'aria-label': 'Usuários, tabela com rolagem horizontal', className: 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary' }}>
          <TableHeader className="bg-slate-50"><TableRow className="hover:bg-transparent">
            {columns.map((column) => <TableHead scope="col" key={column} className="h-12 px-4 text-xs text-muted-foreground">{column}</TableHead>)}
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? Array.from({ length: 3 }, (_, row) => <TableRow key={row}>{columns.map((column) => <TableCell key={column} className="h-20 px-4"><Skeleton className="h-4 w-24" /></TableCell>)}</TableRow>) : users.map((user) => (
              <TableRow key={user.id} className="hover:bg-slate-50/80">
                <TableCell className="max-w-80 px-4 py-4 whitespace-normal"><span className="block break-words font-medium text-primary">{user.name}</span><span className="mt-1 block break-all text-sm text-muted-foreground">{user.email}</span></TableCell>
                <TableCell className="px-4 py-4">{getRoleLabel(user.role)}</TableCell>
                <TableCell className="max-w-64 px-4 py-4 whitespace-normal"><span className="block text-sm font-medium">{user.coordination?.code ?? 'Sem coordenação'}</span>{user.coordination && <span className="mt-1 block text-sm text-muted-foreground">{user.coordination.name}</span>}</TableCell>
                <TableCell className="px-4 py-4"><UserStatus user={user} /></TableCell>
                <TableCell className="max-w-44 px-4 py-4 whitespace-normal text-sm text-muted-foreground">{user.must_change_password ? 'Troca obrigatória' : 'Definida'}</TableCell>
                <TableCell className="px-3 py-2"><UserActions user={user} disabled={disabled} onEdit={onEdit} onAction={onAction} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="divide-y divide-border md:hidden">
        {isLoading ? Array.from({ length: 3 }, (_, row) => <div key={row} className="space-y-4 p-5"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-1/2" /></div>) : users.map((user) => (
          <article key={user.id} className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><h2 className="min-w-0 break-words font-semibold text-primary">{user.name}</h2><UserStatus user={user} /></div>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">E-mail</dt><dd className="break-all">{user.email}</dd>
              <dt className="text-muted-foreground">Perfil</dt><dd>{getRoleLabel(user.role)}</dd>
              <dt className="text-muted-foreground">Coordenação</dt><dd className="break-words">{user.coordination ? `${user.coordination.code} — ${user.coordination.name}` : 'Sem coordenação'}</dd>
              <dt className="text-muted-foreground">Senha</dt><dd>{user.must_change_password ? 'Troca obrigatória' : 'Definida'}</dd>
            </dl>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3"><span className="text-xs text-muted-foreground">Ações do usuário</span><UserActions user={user} disabled={disabled} onEdit={onEdit} onAction={onAction} /></div>
          </article>
        ))}
      </div>
    </div>
  )
}
