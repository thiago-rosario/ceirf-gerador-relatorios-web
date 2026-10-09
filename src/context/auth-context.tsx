import { createContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { authenticateUser, changePassword as changeUserPassword, findCurrentUser, logoutUser } from '../service/auth-service'
import type { SessionUser as User } from '../types/users'

type Session = {
  access_token: string
  user: User
}

type PasswordChange = {
  current_password: string
  password: string
  password_confirmation: string
}

type AuthContextValue = {
  session: Session | null
  isRestoring: boolean
  restoreError: string
  persistenceNotice: string
  login: (credentials: { email: string; password: string }, remember: boolean) => Promise<void>
  logout: () => Promise<void>
  changePassword: (credentials: PasswordChange) => Promise<boolean>
  retryRestore: () => void
  forgetSession: (expectedToken?: string) => void
  refreshUser: () => Promise<User | null>
  updateSessionUser: (user: Pick<User, 'id' | 'name' | 'email' | 'role' | 'coordination_id' | 'coordination' | 'is_active'>, expectedToken: string) => boolean
}

const storageKey = 'ceirf.auth'

const readAccessToken = (): string | null => {
  try {
    const stored = sessionStorage.getItem(storageKey) || localStorage.getItem(storageKey)
    const token = stored ? JSON.parse(stored).access_token : null
    return typeof token === 'string' && token ? token : null
  } catch {
    return null
  }
}

const clearStoredSession = () => {
  for (const storageName of ['localStorage', 'sessionStorage'] as const) {
    try {
      window[storageName].removeItem(storageKey)
    } catch {
      // Browsers may disable storage; the in-memory session still works.
    }
  }
}

// The existing auth hook shares this context with the provider.
// oxlint-disable-next-line react/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null)
  const sessionRef = useRef<Session | null>(null)
  const [isRestoring, setIsRestoring] = useState(() => Boolean(readAccessToken()))
  const [restoreError, setRestoreError] = useState('')
  const [persistenceNotice, setPersistenceNotice] = useState('')
  const [restoreAttempt, setRestoreAttempt] = useState(0)

  const setCurrentSession = (next: Session | null) => {
    sessionRef.current = next
    setSession(next)
  }

  useEffect(() => {
    let cancelled = false
    const accessToken = readAccessToken()

    const currentUser = accessToken ? findCurrentUser(accessToken) : Promise.resolve(null)

    currentUser
      .then((user) => {
        if (!cancelled) {
          setCurrentSession(accessToken && user ? { access_token: accessToken, user } : null)
        }
      })
      .catch((error) => {
        if (cancelled) return

        if (error.status === 401) {
          clearStoredSession()
          setCurrentSession(null)
        } else {
          setRestoreError(error.message)
        }
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false)
      })

    return () => { cancelled = true }
  }, [restoreAttempt])

  const login: AuthContextValue['login'] = async (credentials, remember) => {
    const authenticatedSession = await authenticateUser(credentials)
    clearStoredSession()
    setPersistenceNotice('')

    try {
      const storage = remember ? localStorage : sessionStorage
      storage.setItem(storageKey, JSON.stringify({ access_token: authenticatedSession.access_token }))
    } catch {
      setPersistenceNotice('Seu navegador não permitiu salvar a sessão. Ao recarregar a página, entre novamente.')
    }

    setRestoreError('')
    setCurrentSession(authenticatedSession)
  }

  const forgetSession = (expectedToken?: string) => {
    if (expectedToken !== undefined && sessionRef.current?.access_token !== expectedToken) return
    clearStoredSession()
    setCurrentSession(null)
    setRestoreError('')
    setPersistenceNotice('')
  }

  const logout = async () => {
    if (session) {
      try {
        await logoutUser(session.access_token)
      } catch (error) {
        if (!(error instanceof Error) || !('status' in error) || error.status !== 401) {
          throw error
        }
      }
    }

    forgetSession()
  }

  const refreshUser = async () => {
    const current = sessionRef.current
    if (!current) return null
    const user = await findCurrentUser(current.access_token)
    if (sessionRef.current?.access_token === current.access_token) setCurrentSession({ ...current, user })
    return user
  }

  const changePassword: AuthContextValue['changePassword'] = async (credentials) => {
    const current = sessionRef.current
    if (!current) throw new Error('Sua sessão expirou. Entre novamente para alterar a senha.')

    const user = await changeUserPassword(current.access_token, credentials)
    if (user.id !== current.user.id) {
      throw new Error('Não foi possível confirmar a alteração da senha. Tente novamente.')
    }
    if (sessionRef.current?.access_token !== current.access_token) return false

    setCurrentSession({ ...current, user })
    return true
  }

  const updateSessionUser: AuthContextValue['updateSessionUser'] = (user, expectedToken) => {
    const current = sessionRef.current
    if (current?.user.id !== user.id || current.access_token !== expectedToken) return false
    setCurrentSession({ ...current, user: { ...current.user, name: user.name, email: user.email, role: user.role,
      coordination_id: user.coordination_id, coordination: user.coordination, is_active: user.is_active } })
    return true
  }

  return (
    <AuthContext.Provider value={{
      session,
      isRestoring,
      restoreError,
      persistenceNotice,
      login,
      logout,
      changePassword,
      retryRestore: () => {
        setIsRestoring(true)
        setRestoreError('')
        setRestoreAttempt((attempt) => attempt + 1)
      },
      forgetSession,
      refreshUser,
      updateSessionUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
