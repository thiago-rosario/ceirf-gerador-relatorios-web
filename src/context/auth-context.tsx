import { createContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { authenticateUser, findCurrentUser, logoutUser } from '../service/auth-service'

type User = {
  id: string
  name: string
  email: string
  role: string
  must_change_password: boolean
}

type Session = {
  access_token: string
  user: User
}

type AuthContextValue = {
  session: Session | null
  isRestoring: boolean
  restoreError: string
  persistenceNotice: string
  login: (credentials: { email: string; password: string }, remember: boolean) => Promise<void>
  logout: () => Promise<void>
  retryRestore: () => void
  forgetSession: () => void
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
  const [isRestoring, setIsRestoring] = useState(() => Boolean(readAccessToken()))
  const [restoreError, setRestoreError] = useState('')
  const [persistenceNotice, setPersistenceNotice] = useState('')
  const [restoreAttempt, setRestoreAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    const accessToken = readAccessToken()

    const currentUser = accessToken ? findCurrentUser(accessToken) : Promise.resolve(null)

    currentUser
      .then((user) => {
        if (!cancelled) {
          setSession(accessToken && user ? { access_token: accessToken, user } : null)
        }
      })
      .catch((error) => {
        if (cancelled) return

        if (error.status === 401) {
          clearStoredSession()
          setSession(null)
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
    setSession(authenticatedSession)
  }

  const forgetSession = () => {
    clearStoredSession()
    setSession(null)
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

  return (
    <AuthContext.Provider value={{
      session,
      isRestoring,
      restoreError,
      persistenceNotice,
      login,
      logout,
      retryRestore: () => {
        setIsRestoring(true)
        setRestoreError('')
        setRestoreAttempt((attempt) => attempt + 1)
      },
      forgetSession,
    }}>
      {children}
    </AuthContext.Provider>
  )
}
