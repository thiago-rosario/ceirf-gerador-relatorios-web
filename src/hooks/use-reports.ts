import { useCallback, useEffect, useRef, useState } from 'react'
import { findReport, getReportPdf, listReportMunicipalities, listReports } from '@/service/reports-service'
import type { Municipality, Report, ReportPdf, ReportsResult } from '@/types/reports'
import type { SessionUser } from '@/types/users'

type ApiError = Error & { status?: number }

function useReportQuery<T>(key: string, load: (signal: AbortSignal) => Promise<T>, enabled = true) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ key: string; attempt: number; data: T | null; error: ApiError | null } | null>(null)

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    load(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setResult({ key, attempt, data, error: null }) })
      .catch((error: ApiError) => {
        if (!controller.signal.aborted) setResult({ key, attempt, data: null, error })
      })
    return () => controller.abort()
  }, [key, attempt, load, enabled])

  const current = enabled && result?.key === key && result.attempt === attempt ? result : null
  return { data: current?.data ?? null, error: current?.error ?? null, isLoading: enabled && !current,
    reload: () => setAttempt((value) => value + 1) }
}

export function useReports(accessToken: string, municipalityId: number | null, typology: string, page: number) {
  const load = useCallback((signal: AbortSignal) => listReports(accessToken, { municipalityId, typology, page, signal }), [accessToken, municipalityId, typology, page])
  return useReportQuery<ReportsResult>(`${accessToken}:${municipalityId}:${typology}:${page}`, load)
}

export function useReportMunicipalities(accessToken: string) {
  const load = useCallback((signal: AbortSignal) => listReportMunicipalities(accessToken, signal), [accessToken])
  return useReportQuery<Municipality[]>(accessToken, load)
}

export function useReport(accessToken: string, id: string) {
  const load = useCallback((signal: AbortSignal) => findReport(accessToken, id, signal), [accessToken, id])
  return useReportQuery<Report>(`${accessToken}:${id}`, load)
}

export function useReportPdf(accessToken: string, id: string, enabled: boolean) {
  const load = useCallback((signal: AbortSignal) => getReportPdf(accessToken, id, { inline: true, signal }), [accessToken, id])
  const query = useReportQuery<ReportPdf>(`${accessToken}:${id}`, load, enabled)
  const [objectUrl, setObjectUrl] = useState<{ blob: Blob; url: string } | null>(null)
  const blob = query.data?.blob

  useEffect(() => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    // Synchronize React with a browser resource that must be created and revoked outside rendering.
    // oxlint-disable-next-line react/set-state-in-effect
    setObjectUrl({ blob, url })
    return () => URL.revokeObjectURL(url)
  }, [blob])

  return { ...query, url: objectUrl?.blob === blob ? objectUrl?.url : undefined }
}

export function useReportAccessError(error: ApiError | null, onSessionInvalid: () => void, refreshUser: () => Promise<SessionUser | null>) {
  const sessionInvalidRef = useRef(onSessionInvalid)
  const refreshUserRef = useRef(refreshUser)
  useEffect(() => { sessionInvalidRef.current = onSessionInvalid; refreshUserRef.current = refreshUser }, [onSessionInvalid, refreshUser])
  useEffect(() => {
    let cancelled = false
    if (error?.status === 401) sessionInvalidRef.current()
    if (error?.status === 403) {
      refreshUserRef.current().catch((refreshError: ApiError) => { if (!cancelled && refreshError.status === 401) sessionInvalidRef.current() })
    }
    return () => { cancelled = true }
  }, [error])
}

export function useReportDownload(accessToken: string) {
  const pending = useRef<AbortController | null>(null)
  const urls = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    const resources = urls.current
    return () => {
      pending.current?.abort()
      for (const [url, timer] of resources) { clearTimeout(timer); URL.revokeObjectURL(url) }
      resources.clear()
    }
  }, [accessToken])

  const download = async (id: string) => {
    if (pending.current) return
    const controller = new AbortController()
    pending.current = controller
    setBusyId(id)
    setError(null)
    try {
      const { blob, fileName } = await getReportPdf(accessToken, id, { signal: controller.signal })
      if (controller.signal.aborted) return
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.append(link)
      link.click()
      link.remove()
      urls.current.set(url, setTimeout(() => { URL.revokeObjectURL(url); urls.current.delete(url) }, 30000))
    } catch (downloadError) {
      if (!controller.signal.aborted) setError(downloadError instanceof Error ? downloadError : new Error('Não foi possível baixar o PDF. Tente novamente.'))
    } finally {
      if (pending.current === controller) pending.current = null
      if (!controller.signal.aborted) setBusyId(null)
    }
  }

  return { busyId, error, download, clearError: () => setError(null) }
}
