import { useEffect, useState } from 'react'
import { loadDashboardIndicators } from '@/service/dashboard-indicators-service'
import type { DashboardIndicatorPeriod, DashboardIndicatorsLoader, DashboardIndicatorsQuery } from '@/types/dashboard'

export function useDashboardIndicators(
  accessToken: string,
  period: DashboardIndicatorPeriod,
  load: DashboardIndicatorsLoader = loadDashboardIndicators,
): DashboardIndicatorsQuery {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<(Omit<DashboardIndicatorsQuery, 'retry'> & {
    accessToken: string
    period: DashboardIndicatorPeriod
    load: DashboardIndicatorsLoader
    attempt: number
  }) | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    // Defer dispatch so a StrictMode effect replay cancels before sending.
    Promise.resolve()
      .then(() => controller.signal.aborted ? null : load({ accessToken, period, signal: controller.signal }))
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult({ data, state: data === null ? 'unavailable' : 'ready', error: null, accessToken, period, load, attempt })
        }
      })
      .catch((failure: unknown) => {
        if (controller.signal.aborted) return
        const error = failure instanceof Error ? failure : new Error('Não foi possível carregar os indicadores. Tente novamente.')
        setResult({ data: null, state: (error as { status?: number }).status === 404 ? 'unavailable' : 'error', error, accessToken, period, load, attempt })
      })
    return () => controller.abort()
  }, [accessToken, period, load, attempt])

  const current = result?.accessToken === accessToken && result.period === period && result.load === load && result.attempt === attempt ? result : null
  return {
    data: current?.data ?? null,
    state: current?.state ?? 'loading',
    error: current?.error ?? null,
    retry: () => setAttempt((value) => value + 1),
  }
}
