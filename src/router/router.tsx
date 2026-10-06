import { useEffect, useState, useSyncExternalStore } from 'react'
import Button from '../components/Button'
import { useAuth } from '../hooks/use-auth'
import Login from '../views/Login'
import Home from '../views/Home'
import { AppLayout } from '../components/layout/AppLayout'
import { loadDashboardDemo } from '../service/dashboard-demo'
import type { NavigationItem } from '../components/layout/navigation'

const dashboardDemoEnabled = import.meta.env.VITE_DASHBOARD_DEMO !== 'false'

function subscribeLocation(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  return () => window.removeEventListener('popstate', onChange)
}

function getPathname() {
  return window.location.pathname.replace(/\/+$/, '') || '/'
}

function navigate(href: NavigationItem['href']) {
  if (getPathname() === href) return
  window.history.pushState(null, '', href)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const Router = () => {
  const { session, isRestoring, restoreError, persistenceNotice, logout, retryRestore, forgetSession } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const pathname = useSyncExternalStore(subscribeLocation, getPathname, () => '/dashboard')

  useEffect(() => {
    if (!session || isRestoring || restoreError) return
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    document.getElementById('main-content')?.focus({ preventScroll: true })
  }, [pathname, session, isRestoring, restoreError])

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

  if (!isRestoring && !restoreError && session) {
    return (
      <AppLayout user={session.user} isLoggingOut={isLoggingOut} onLogout={handleLogout}
        activeItem="overview" onNavigate={navigate}>
        <div className="flex flex-col gap-6">
          {session.user.must_change_password && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            Sua senha é temporária. É necessário alterá-la antes de acessar as demais funcionalidades.
          </p>}
          {persistenceNotice && <p role="status" className="text-sm text-gray-600">{persistenceNotice}</p>}
          {logoutError && <p role="alert" className="text-sm text-red-700">{logoutError}</p>}
          <Home accessToken={session.access_token} loadData={dashboardDemoEnabled ? loadDashboardDemo : undefined} isDemo={dashboardDemoEnabled} />
        </div>
      </AppLayout>
    )
  }

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
        ) : null}
      </section>
    </main>
  )
}

export default Router
