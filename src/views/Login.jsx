import { useState } from 'react'
import { LockKeyhole, ShieldCheck, UserRound } from 'lucide-react'
import Button from '../components/Button'
import Input from '../components/Input'
import logoSsp from '../assets/logo-ssp.png'
import assistenteCotec from '../assets/assistenteCotec.png'
import { useLogin } from '../hooks/use-login'

const Login = () => {
  const {
    email, setEmail, password, setPassword, remember, setRemember,
    isSubmitting, error, fieldErrors, handleSubmit,
  } = useLogin()
  const [showRecoveryHelp, setShowRecoveryHelp] = useState(false)

  return (
    <div className="login-page flex min-h-dvh flex-col bg-white text-gray-800">
      <main className="relative isolate flex flex-1 flex-col items-center justify-center overflow-hidden px-5 py-7 sm:px-8">
        <div className="login-waves pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[46%]" aria-hidden="true" />

        <header className="mb-6 flex flex-col items-center text-center">
          <img className="login-emblem mb-4 object-contain" src={logoSsp} alt="Brasão da Secretaria da Segurança Pública da Bahia" />
          <h1 className="login-title font-medium leading-none text-blue-900">CEIRF</h1>
          <p className="mt-3 max-w-4xl text-base leading-snug text-gray-950 sm:text-xl lg:text-2xl">
            Coordenação Executiva de Infraestrutura da Rede Física
          </p>
          <h2 className="mt-5 text-lg font-bold text-blue-900 sm:text-2xl lg:text-3xl">
            GERADOR AUTOMÁTICO DE RELATÓRIOS
          </h2>
        </header>

        <div className="relative w-full max-w-lg">
          <form onSubmit={handleSubmit} aria-label="Login" aria-busy={isSubmitting}
            className="w-full max-w-lg rounded-[2.5rem] border border-slate-200 bg-white/95 px-6 py-6 shadow-[0_0_8px_rgba(30,58,138,0.08)] sm:rounded-[3.5rem] sm:px-8">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-base sm:text-lg" htmlFor="email">Usuário</label>
                <Input id="email" name="email" type="email" icon={UserRound} placeholder="Digite seu e-mail"
                  autoComplete="username" autoCapitalize="none" spellCheck={false} required
                  value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'email-error' : undefined} />
                {fieldErrors.email && <p id="email-error" className="mt-2 text-sm text-red-700">{fieldErrors.email[0]}</p>}
              </div>

              <div>
                <label className="mb-2 block text-base sm:text-lg" htmlFor="password">Senha</label>
                <Input id="password" name="password" type="password" icon={LockKeyhole} placeholder="Digite sua senha"
                  autoComplete="current-password" required value={password}
                  onChange={(event) => setPassword(event.target.value)} disabled={isSubmitting}
                  aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'password-error' : undefined} />
                {fieldErrors.password && <p id="password-error" className="mt-2 text-sm text-red-700">{fieldErrors.password[0]}</p>}
              </div>
            </div>

            <label className="my-6 flex w-fit cursor-pointer items-center gap-3 text-base" htmlFor="remember">
              <input id="remember" name="remember" type="checkbox" className="h-5 w-5 accent-blue-900"
                checked={remember} onChange={(event) => setRemember(event.target.checked)} disabled={isSubmitting} />
              Lembrar-me
            </label>

            {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Entrando…' : 'Entrar'}</Button>

            <div className="mt-4 text-center">
              <button type="button" className="cursor-pointer text-base text-blue-600 underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-blue-900"
                aria-expanded={showRecoveryHelp} aria-controls="recovery-help"
                onClick={() => setShowRecoveryHelp((visible) => !visible)}>
                Esqueceu sua senha?
              </button>
              {showRecoveryHelp && <p id="recovery-help" role="status" className="mt-3 text-sm text-gray-600">
                Para redefinir sua senha, entre em contato com o administrador do sistema.
              </p>}
            </div>
          </form>

          <figure className="mt-6 flex items-center justify-center gap-3 xl:absolute xl:bottom-4 xl:left-[calc(100%+2.5rem)] xl:mt-0 xl:w-56 xl:flex-col xl:text-center">
            <img
              src={assistenteCotec}
              alt="Assistente COTEC"
              width={1024}
              height={1024}
              className="h-20 w-20 shrink-0 object-contain mix-blend-multiply sm:h-24 sm:w-24 xl:h-56 xl:w-56"
              draggable={false}
            />
            <figcaption className="max-w-56 text-sm leading-relaxed text-slate-600">
              <span className="mb-1 block text-base font-semibold text-blue-900">Bem-vindo à CEIRF!</span>
              Entre para começar seus relatórios.
            </figcaption>
          </figure>
        </div>
      </main>

      <footer className="relative flex flex-col items-center justify-center gap-3 bg-blue-900 px-5 py-6 text-white sm:min-h-20 sm:flex-row">
        <span className="flex items-center gap-2 text-sm sm:absolute sm:left-5">
          <ShieldCheck size={25} strokeWidth={1.5} aria-hidden="true" /> Sistema Restrito
        </span>
        <p className="text-center text-base font-bold sm:pl-40 sm:text-xl lg:pl-0 lg:text-2xl">
          SECRETARIA DA SEGURANÇA PÚBLICA
        </p>
      </footer>
    </div>
  )
}

export default Login
