import { useState } from 'react'
import { KeyRound, LockKeyhole, LogOut, ShieldCheck } from 'lucide-react'
import Button from '../components/Button'
import Input from '../components/Input'
import logoSsp from '../assets/logo-ssp.png'
import { useChangePassword } from '../hooks/use-change-password'

type ChangePasswordProps = {
  user: { name: string; email: string }
  isLoggingOut: boolean
  logoutError: string
  persistenceNotice: string
  onLogout: () => void
  onSuccess: () => void
  onSessionInvalid: () => void
}

export default function ChangePassword({ user, isLoggingOut, logoutError, persistenceNotice, onLogout, onSuccess, onSessionInvalid }: ChangePasswordProps) {
  const { values, updateField, fieldErrors, error, isSubmitting, handleSubmit } = useChangePassword({ isLoggingOut, onSuccess, onSessionInvalid })
  const [showPasswords, setShowPasswords] = useState(false)
  const isBusy = isSubmitting || isLoggingOut
  const passwordType = showPasswords ? 'text' : 'password'

  return (
    <div className="login-page flex min-h-dvh flex-col bg-white text-gray-800">
      <main className="relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden px-5 py-7 sm:px-8">
        <div className="login-waves pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[46%]" aria-hidden="true" />

        <header className="mb-6 flex flex-col items-center text-center">
          <img className="h-28 w-28 object-contain sm:h-36 sm:w-36" src={logoSsp} alt="Brasão da Secretaria da Segurança Pública da Bahia" />
          <p className="mt-3 text-4xl font-medium text-blue-900 sm:text-5xl">CEIRF</p>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">Gerador Automático de Relatórios</p>
        </header>

        <section aria-labelledby="change-password-heading" className="w-full max-w-lg rounded-[2.5rem] border border-slate-200 bg-white/95 px-6 py-6 shadow-[0_0_8px_rgba(30,58,138,0.08)] sm:px-8">
          <div className="mb-5">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-900">
              <ShieldCheck size={16} aria-hidden="true" /> Troca de senha obrigatória
            </span>
            <h1 id="change-password-heading" className="text-2xl font-bold text-blue-900">Crie sua nova senha</h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">Sua senha foi redefinida pelo administrador. Escolha uma nova senha para continuar no sistema.</p>
            <p className="mt-3 break-words text-sm font-medium text-gray-800">{user.name} <span className="block font-normal text-gray-500">{user.email}</span></p>
          </div>

          <form onSubmit={handleSubmit} aria-label="Alteração obrigatória de senha" aria-busy={isBusy} noValidate>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="current-password">Senha temporária</label>
                <Input id="current-password" name="current_password" type={passwordType} icon={KeyRound} placeholder="Senha utilizada para entrar"
                  autoComplete="current-password" autoFocus required value={values.current_password} disabled={isBusy}
                  onChange={(event) => updateField('current_password', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.current_password)} aria-describedby={fieldErrors.current_password ? 'current-password-error' : undefined} />
                {fieldErrors.current_password && <p id="current-password-error" className="mt-2 text-sm text-red-700">{fieldErrors.current_password}</p>}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="new-password">Nova senha</label>
                <Input id="new-password" name="password" type={passwordType} icon={LockKeyhole} placeholder="Escolha sua nova senha"
                  autoComplete="new-password" required minLength={8} value={values.password} disabled={isBusy}
                  onChange={(event) => updateField('password', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.password)} aria-describedby={`new-password-help${fieldErrors.password ? ' new-password-error' : ''}`} />
                <p id="new-password-help" className="mt-2 text-xs text-gray-500">Use pelo menos 8 caracteres e uma senha diferente da temporária.</p>
                {fieldErrors.password && <p id="new-password-error" className="mt-2 text-sm text-red-700">{fieldErrors.password}</p>}
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium" htmlFor="password-confirmation">Confirmar nova senha</label>
                <Input id="password-confirmation" name="password_confirmation" type={passwordType} icon={LockKeyhole} placeholder="Digite a nova senha novamente"
                  autoComplete="new-password" required value={values.password_confirmation} disabled={isBusy}
                  onChange={(event) => updateField('password_confirmation', event.target.value)}
                  aria-invalid={Boolean(fieldErrors.password_confirmation)} aria-describedby={fieldErrors.password_confirmation ? 'password-confirmation-error' : undefined} />
                {fieldErrors.password_confirmation && <p id="password-confirmation-error" className="mt-2 text-sm text-red-700">{fieldErrors.password_confirmation}</p>}
              </div>
            </div>

            <label htmlFor="show-passwords" className="my-5 flex w-fit cursor-pointer items-center gap-2 text-sm text-gray-600">
              <input id="show-passwords" type="checkbox" className="h-4 w-4 accent-blue-900" checked={showPasswords}
                onChange={(event) => setShowPasswords(event.target.checked)} disabled={isBusy} />
              Mostrar senhas
            </label>

            {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            {logoutError && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{logoutError}</p>}
            {persistenceNotice && <p role="status" className="mb-4 text-sm text-gray-600">{persistenceNotice}</p>}

            <Button type="submit" disabled={isBusy}>{isSubmitting ? 'Salvando nova senha…' : 'Salvar senha e continuar'}</Button>
            <button type="button" onClick={onLogout} disabled={isBusy}
              className="mx-auto mt-4 flex items-center gap-2 rounded px-3 py-2 text-sm text-blue-900 disabled:cursor-not-allowed disabled:opacity-50">
              <LogOut size={16} aria-hidden="true" /> {isLoggingOut ? 'Saindo…' : 'Sair da conta'}
            </button>
          </form>
        </section>
      </main>

      <footer className="flex flex-wrap items-center justify-center gap-3 bg-blue-900 px-5 py-5 text-white">
        <ShieldCheck size={22} strokeWidth={1.5} aria-hidden="true" />
        <p className="text-center text-sm font-bold sm:text-base">SECRETARIA DA SEGURANÇA PÚBLICA</p>
      </footer>
    </div>
  )
}
