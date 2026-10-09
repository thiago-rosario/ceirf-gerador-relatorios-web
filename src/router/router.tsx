import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Button from '../components/Button'
import { Button as UiButton } from '../components/ui/button'
import { useAuth } from '../hooks/use-auth'
import Login from '../views/Login'
import ChangePassword from '../views/ChangePassword'
import Home from '../views/Home'
import Reports from '../views/Reports'
import Users from '../views/Users'
import CreateUser from '../views/CreateUser'
import { AppLayout } from '../components/layout/AppLayout'
import { loadDashboardDemo } from '../service/dashboard-demo'
import type { NavigationId } from '../components/layout/navigation'
import { canManageUsers, getUsersRoute } from '../service/users-access'
import type { User } from '../types/users'

const dashboardDemoEnabled = import.meta.env.VITE_DASHBOARD_DEMO !== 'false'

function subscribeLocation(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  return () => window.removeEventListener('popstate', onChange)
}

function getPathname() {
  return window.location.pathname.replace(/\/+$/, '') || '/'
}

function navigate(href: string, replace = false) {
  if (getPathname() === href) return
  if (replace) window.history.replaceState(null, '', href)
  else window.history.pushState(null, '', href)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

const Router = () => {
  const { session, isRestoring, restoreError, persistenceNotice, logout, retryRestore, forgetSession, refreshUser, updateSessionUser } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')
  const [loginNotice, setLoginNotice] = useState('')
  const [userNotice, setUserNotice] = useState('')
  const [deniedToken, setDeniedToken] = useState('')
  const [isCheckingAccess, setIsCheckingAccess] = useState(false)
  const [accessError, setAccessError] = useState('')
  const redirectAfterSave = useRef(false)
  const pathname = useSyncExternalStore(subscribeLocation, getPathname, () => '/dashboard')
  const isUsersPath = pathname === '/usuarios' || pathname.startsWith('/usuarios/')
  const usersRoute = getUsersRoute(pathname)
  const activeItem: NavigationId = isUsersPath ? 'users' : pathname === '/relatorios' ? 'reports' : 'overview'
  const userManagementAllowed = canManageUsers(session?.user) && deniedToken !== session?.access_token

  const handleSessionInvalid = useCallback(() => {
    if (!session) return
    forgetSession(session.access_token)
    setUserNotice('')
    setLoginNotice('Sua sessão expirou. Entre novamente para continuar.')
  }, [session, forgetSession])

  const handlePermissionDenied = useCallback(() => {
    if (!session) return
    setDeniedToken(session.access_token)
    refreshUser().catch((error: Error & { status?: number }) => {
      if (error.status === 401) handleSessionInvalid()
    })
  }, [session, refreshUser, handleSessionInvalid])

  const clearUserNotice = useCallback(() => setUserNotice(''), [])

  const handleCurrentUserUpdated = (user: User) => {
    if (session && updateSessionUser(user, session.access_token)) {
      redirectAfterSave.current = !canManageUsers({ ...session.user, ...user })
    }
  }

  const handleUserSaved = (message: string) => {
    setUserNotice(message)
    navigate(redirectAfterSave.current ? '/dashboard' : '/usuarios')
    redirectAfterSave.current = false
  }

  const verifyUsersAccess = async () => {
    if (isCheckingAccess) return
    setIsCheckingAccess(true)
    setAccessError('')
    try {
      const user = await refreshUser()
      if (canManageUsers(user)) setDeniedToken('')
    } catch (error) {
      if (error instanceof Error && 'status' in error && error.status === 401) handleSessionInvalid()
      else setAccessError(error instanceof Error ? error.message : 'Não foi possível verificar o acesso. Tente novamente.')
    } finally {
      setIsCheckingAccess(false)
    }
  }

  useEffect(() => {
    if (!session || isRestoring || restoreError) return
    if (session.user.must_change_password) {
      navigate('/alterar-senha', true)
      return
    }
    if (pathname === '/alterar-senha') navigate('/dashboard', true)
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    document.getElementById('main-content')?.focus({ preventScroll: true })
  }, [pathname, session, isRestoring, restoreError])

  const handleLogout = async () => {
    if (isLoggingOut) return
    setIsLoggingOut(true)
    setLogoutError('')

    try {
      await logout()
      setLoginNotice('')
      setUserNotice('')
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Não foi possível sair. Tente novamente.')
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (!isRestoring && !restoreError && !session) return <Login notice={loginNotice} />

  if (!isRestoring && !restoreError && session?.user.must_change_password) {
    return <ChangePassword key={session.access_token} user={session.user} isLoggingOut={isLoggingOut}
      logoutError={logoutError} persistenceNotice={persistenceNotice} onLogout={handleLogout} onSessionInvalid={handleSessionInvalid}
      onSuccess={() => { setUserNotice('Senha alterada com sucesso.'); navigate('/dashboard', true) }} />
  }

  if (!isRestoring && !restoreError && session) {
    return (
      <AppLayout user={session.user} isLoggingOut={isLoggingOut} onLogout={handleLogout}
        activeItem={activeItem} userManagementAllowed={userManagementAllowed} onNavigate={navigate}>
        <div className={activeItem === 'reports' ? 'flex flex-1 flex-col' : 'flex flex-col gap-6'}>
          <div className={activeItem === 'reports' ? 'empty:hidden space-y-3 px-5 pt-5 sm:px-8' : 'empty:hidden space-y-3'}>
            {persistenceNotice && <p role="status" className="text-sm text-gray-600">{persistenceNotice}</p>}
            {logoutError && <p role="alert" className="text-sm text-red-700">{logoutError}</p>}
            {userNotice && activeItem !== 'users' && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{userNotice}</p>}
          </div>
          {isUsersPath ? !userManagementAllowed ? (
            <section aria-labelledby="users-access-heading" className="rounded-xl border border-border bg-card p-6 sm:p-8">
              <h1 id="users-access-heading" className="text-2xl font-semibold text-primary">Acesso restrito</h1>
              <p role="alert" className="mt-3 text-sm text-muted-foreground">O gerenciamento de usuários está disponível apenas para superusuários com permissão ativa.</p>
              {accessError && <p role="alert" className="mt-3 text-sm text-red-700">{accessError}</p>}
              <div className="mt-5 flex flex-wrap gap-4">
                <UiButton type="button" className="h-11" onClick={() => navigate('/dashboard')}>Voltar à visão geral</UiButton>
                <UiButton type="button" variant="outline" className="h-11" disabled={isCheckingAccess} onClick={verifyUsersAccess}>{isCheckingAccess ? 'Verificando…' : 'Verificar acesso novamente'}</UiButton>
              </div>
            </section>
          ) : !usersRoute ? (
            <section className="rounded-xl border border-border bg-card p-6">
              <h1 className="text-2xl font-semibold text-primary">Página não encontrada</h1>
              <p className="my-4 text-sm text-muted-foreground">Este endereço de gerenciamento de usuários é inválido.</p>
              <UiButton type="button" className="h-11" onClick={() => navigate('/usuarios')}>Voltar aos usuários</UiButton>
            </section>
          ) : usersRoute.screen === 'list' ? (
            <Users key={session.access_token} accessToken={session.access_token} currentUserId={session.user.id} notice={userNotice}
              onBack={() => navigate('/dashboard')} onCreate={() => { clearUserNotice(); navigate('/usuarios/novo') }}
              onEdit={(user) => { clearUserNotice(); navigate(`/usuarios/${user.id}/editar`) }}
              onSessionInvalid={handleSessionInvalid} onPermissionDenied={handlePermissionDenied} onClearNotice={clearUserNotice} />
          ) : (
            <CreateUser key={`${session.access_token}:${pathname}`} accessToken={session.access_token}
              userId={usersRoute.screen === 'edit' ? usersRoute.id : undefined} currentUserId={session.user.id}
              onBack={() => navigate('/usuarios')} onSaved={handleUserSaved} onCurrentUserUpdated={handleCurrentUserUpdated}
              onSessionInvalid={handleSessionInvalid} onPermissionDenied={handlePermissionDenied} />
          ) : activeItem === 'reports' ? (
            <Reports onBack={() => navigate('/dashboard')} />
          ) : (
            <Home accessToken={session.access_token} loadData={dashboardDemoEnabled ? loadDashboardDemo : undefined} isDemo={dashboardDemoEnabled} onNavigateReports={() => navigate('/relatorios')} />
          )}
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
            <button type="button" onClick={() => forgetSession()} className="mt-5 cursor-pointer text-blue-900 underline">Voltar ao login</button>
          </>
        ) : null}
      </section>
    </main>
  )
}

export default Router
