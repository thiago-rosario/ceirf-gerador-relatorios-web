import { useEffect, useState } from 'react'
import type { DashboardData, DashboardLoader, DashboardState } from '@/types/dashboard'
import { loadDashboard } from '@/service/dashboard-service'

const unavailableData: DashboardData = {
  metrics: { municipalities: null, forces: null, reports: null },
  inspectionPeriods: {},
  recentReports: [],
}

type ApiError = Error & { status?: number }

export function useDashboardData(accessToken: string, load: DashboardLoader = loadDashboard) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    data: DashboardData
    state: DashboardState
    error: ApiError | null
    accessToken: string
    load?: DashboardLoader
    attempt: number
  }>({ data: unavailableData, state: 'unavailable', error: null, accessToken, attempt: -1 })

  useEffect(() => {
    const controller = new AbortController()
    Promise.resolve()
      .then(() => load({ accessToken, signal: controller.signal }))
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult({ data, state: 'ready', error: null, accessToken, load, attempt })
        }
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          const error = failure instanceof Error ? failure : new Error('Não foi possível carregar os dados do dashboard. Tente novamente.')
          setResult({
            data: unavailableData,
            state: 'error',
            error,
            accessToken,
            load,
            attempt,
          })
        }
      })

    return () => controller.abort()
  }, [accessToken, load, attempt])

  // Never expose the previous user's data while a new session starts loading.
  if (result.accessToken !== accessToken || result.load !== load || result.attempt !== attempt) {
    return { data: unavailableData, state: 'loading' as const, error: null, retry: () => setAttempt((value) => value + 1) }
  }

  return { ...result, retry: () => setAttempt((value) => value + 1) }
}
