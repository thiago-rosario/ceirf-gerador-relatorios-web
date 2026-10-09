import { useEffect, useState } from 'react'
import { listUsers } from '@/service/users-service'
import type { User } from '@/types/users'

export function useUsers(accessToken: string, filter: string) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    accessToken: string
    filter: string
    attempt: number
    users: User[]
    error: Error | null
  } | null>(null)

  useEffect(() => {
    let cancelled = false

    listUsers(accessToken, { filter })
      .then((users: User[]) => {
        if (!cancelled) setResult({ accessToken, filter, attempt, users, error: null })
      })
      .catch((error: Error) => {
        if (!cancelled) setResult({ accessToken, filter, attempt, users: [], error })
      })

    return () => { cancelled = true }
  }, [accessToken, filter, attempt])

  const current = result?.accessToken === accessToken && result.filter === filter && result.attempt === attempt
    ? result : null

  return {
    users: current?.users ?? [],
    error: current?.error ?? null,
    isLoading: !current,
    reload: () => setAttempt((value) => value + 1),
  }
}
