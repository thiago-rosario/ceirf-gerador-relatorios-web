import { useState } from 'react'
import Button from '../components/Button'
import { useAuth } from '../hooks/use-auth'
import Login from '../views/Login'

const Router = () => {
  const { session, isRestoring, restoreError, persistenceNotice, logout, retryRestore, forgetSession } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    setLogoutError('')

    try {
      await logout()
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Não foi possível sair. Tente novamente.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (!isRestoring && !restoreError && !session) return <Login />

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-5 py-8">
      <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-5 text-3xl font-semibold text-blue-900">CEIRF</h1>
        {isRestoring ? <p role="status">Validando sua sessão…</p> : restoreError ? (
          <>
            <p role="alert" className="mb-5 text-red-700">{restoreError}</p>
            <Button type="button" onClick={retryRestore}>Tentar novamente</Button>
            <button type="button" onClick={forgetSession} className="mt-5 cursor-pointer text-blue-900 underline">Voltar ao login</button>
          </>
        ) : session && (
          <>
            <h2 className="text-xl font-semibold">Olá, {session.user.name}.</h2>
            <p role="status" className="mt-3 text-gray-600">Login realizado com sucesso.</p>
            {session.user.must_change_password && <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
              Sua senha é temporária. É necessário alterá-la antes de acessar as demais funcionalidades.
            </p>}
            {persistenceNotice && <p role="status" className="mt-5 text-sm text-gray-600">{persistenceNotice}</p>}
            {logoutError && <p role="alert" className="mt-5 text-sm text-red-700">{logoutError}</p>}
            <Button type="button" className="mt-6" disabled={isLoggingOut} onClick={handleLogout}>
              {isLoggingOut ? 'Saindo…' : 'Sair'}
            </Button>
          </>
        )}
      </section>
    </main>
  )
}

export default Router
