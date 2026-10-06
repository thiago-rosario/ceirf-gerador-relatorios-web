import { useEffect, useState } from 'react'
import type { DashboardData, DashboardLoader, DashboardState } from '@/types/dashboard'

const unavailableData: DashboardData = {
  metrics: { municipalities: null, forces: null, reports: null },
  inspectionPeriods: {},
  recentReports: [],
}

export function useDashboardData(accessToken: string, load?: DashboardLoader) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{
    data: DashboardData
    state: DashboardState
    error: string
    accessToken: string
    load?: DashboardLoader
    attempt: number
  }>({ data: unavailableData, state: 'unavailable', error: '', accessToken, attempt: -1 })

  useEffect(() => {
    if (!load) return

    const controller = new AbortController()
    Promise.resolve()
      .then(() => load({ accessToken, signal: controller.signal }))
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult({ data, state: 'ready', error: '', accessToken, load, attempt })
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResult({
            data: unavailableData,
            state: 'error',
            error: 'Não foi possível carregar os dados do dashboard. Tente novamente.',
            accessToken,
            load,
            attempt,
          })
        }
      })

    return () => controller.abort()
  }, [accessToken, load, attempt])

  // Never expose the previous user's data while a new session starts loading.
  if (!load) return { data: unavailableData, state: 'unavailable' as const, error: '', retry: () => {} }
  if (result.accessToken !== accessToken || result.load !== load || result.attempt !== attempt) {
    return { data: unavailableData, state: 'loading' as const, error: '', retry: () => setAttempt((value) => value + 1) }
  }

  return { ...result, retry: () => setAttempt((value) => value + 1) }
}
