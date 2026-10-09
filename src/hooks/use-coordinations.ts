import { useEffect, useRef, useState } from 'react'
import { listCoordinations } from '@/service/users-service'
import type { Coordination, SessionUser } from '@/types/users'

export function useCoordinations(accessToken: string, enabled: boolean, refreshUser: () => Promise<SessionUser | null>) {
  const refreshUserRef = useRef(refreshUser)
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    accessToken: string
    attempt: number
    coordinations: Coordination[]
    error: Error | null
  } | null>(null)

  useEffect(() => { refreshUserRef.current = refreshUser }, [refreshUser])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    listCoordinations(accessToken)
      .then((coordinations) => {
        if (!cancelled) setResult({ accessToken, attempt, coordinations, error: null })
      })
      .catch(async (error: Error) => {
        if (cancelled) return
        if ('status' in error && error.status === 403) {
          // Revalidate the session because a 403 can require a password change.
          try {
            await refreshUserRef.current()
          } catch (refreshError) {
            if (!cancelled) setResult({ accessToken, attempt, coordinations: [], error: refreshError instanceof Error
              ? refreshError : new Error('Não foi possível verificar seu acesso. Tente novamente.') })
            return
          }
        }
        if (!cancelled) setResult({ accessToken, attempt, coordinations: [], error })
      })
    return () => { cancelled = true }
  }, [accessToken, enabled, attempt])

  const current = result?.accessToken === accessToken && result.attempt === attempt ? result : null
  return {
    coordinations: current?.coordinations ?? [],
    error: enabled ? current?.error ?? null : null,
    isLoading: enabled && !current,
    reload: () => setAttempt((value) => value + 1),
  }
}
