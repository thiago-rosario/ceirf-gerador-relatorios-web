import { useCallback, useEffect, useRef, useState } from 'react'
import { createReportDraft, generateReportDraft, loadReportDraft, updateReportDraft } from '@/service/report-draft-service'
import { draftFieldsPayload, emptyReportDraft, hydrateReportDraft, validInspectionDate } from '@/service/report-form-model'
import type { ReportDraft } from '@/types/report-draft'

type SavedDraft = { draft: ReportDraft; id: string | null; fingerprint: string; step: number; modified?: boolean; pending?: Promise<string>; finalized?: boolean; generating?: boolean; generation?: Promise<unknown>; error?: ApiError }
type ApiError = Error & { status?: number; errors?: Record<string, string[]> }
const draftCache = new Map<string, SavedDraft>()
// Memory is scoped to the authenticated session; it is never presented as server persistence.
export function clearReportDraftCache() { draftCache.clear() }

export function useReportDraft(accessToken: string, coordinationId: number, initialId: string | null, onId: (id: string) => void) {
  const sessionKey = `${accessToken}:${coordinationId}`
  const key = `${sessionKey}:${initialId ?? 'new'}`
  const cached = draftCache.get(key)
  const start = useRef(cached && (!initialId || cached.id === initialId) ? cached : null)
  const [draft, setDraft] = useState<ReportDraft>(() => start.current?.draft ?? emptyReportDraft())
  const [id, setId] = useState<string | null>(start.current?.id ?? initialId)
  const [step, setStep] = useState(start.current?.step ?? 0)
  const [loading, setLoading] = useState(Boolean(initialId && !start.current))
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [loadError, setLoadError] = useState<ApiError | null>(null)
  const [saveError, setSaveError] = useState<ApiError | null>(start.current?.error ?? null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [savedFingerprint, setSavedFingerprint] = useState(start.current?.fingerprint ?? '')
  const [generating, setGenerating] = useState(Boolean(start.current?.generating))
  const entry = useRef<SavedDraft>(start.current ?? { draft, id, fingerprint: savedFingerprint, step })
  const current = useRef({ draft, id, fingerprint: savedFingerprint, step })
  const onIdRef = useRef(onId)
  const alive = useRef(true)
  const startedEditing = useRef(Boolean(start.current?.modified))
  current.current = { draft, id, fingerprint: savedFingerprint, step }
  onIdRef.current = onId

  useEffect(() => {
    alive.current = true
    if (entry.current.pending) {
      const synchronize = () => {
        if (!alive.current) return
        setId(entry.current.id)
        setSavedFingerprint(entry.current.fingerprint)
        setSaveError(entry.current.error ?? null)
        if (entry.current.id) onIdRef.current(entry.current.id)
      }
      entry.current.pending.then(synchronize, synchronize)
    }
    if (entry.current.generation) {
      entry.current.generation.finally(() => {
        if (!alive.current) return
        setGenerating(false)
        setSaveError(entry.current.error ?? null)
        if (entry.current.finalized) setLoadError(new Error('Este relatório foi finalizado. Consulte o documento pela listagem de relatórios.'))
      }).catch(() => {})
    }
    return () => { alive.current = false }
  }, [])

  useEffect(() => {
    if (!initialId || (start.current && loadAttempt === 0)) return
    const controller = new AbortController()
    loadReportDraft(accessToken, initialId, controller.signal).then((report) => {
      if (controller.signal.aborted) return
      if (report.status !== 'DRAFT') throw new Error('Este relatório já foi gerado e não pode ser editado como rascunho.')
      if (report.coordination_id !== coordinationId) throw new Error('Este rascunho pertence a outra coordenação.')
      const restored = hydrateReportDraft(report)
      entry.current.fingerprint = JSON.stringify(draftFieldsPayload(restored))
      entry.current.id = report.id
      setDraft(restored)
      setSavedFingerprint(entry.current.fingerprint)
      setLoadError(null)
      setLoading(false)
    }).catch((error: ApiError) => {
      if (!controller.signal.aborted) { setLoadError(error); setLoading(false) }
    })
    return () => controller.abort()
    // initialId is the URL at mount; a confirmed create updates the URL without reloading local files.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, coordinationId, loadAttempt])

  useEffect(() => {
    if (!loading && !loadError && !entry.current.finalized) {
      // Share the entry across remounts; delayed saves only update metadata, never newer form values.
      entry.current.draft = draft
      entry.current.step = step
      const cacheKey = `${sessionKey}:${entry.current.id ?? 'new'}`
      draftCache.set(cacheKey, entry.current)
      if (cacheKey !== key && draftCache.get(key) === entry.current) draftCache.delete(key)
    }
  }, [key, sessionKey, draft, id, savedFingerprint, step, loading, loadError])

  const updateDraft = useCallback((next: ReportDraft) => {
    if (entry.current.finalized || entry.current.generating) return
    startedEditing.current = true
    entry.current.modified = true
    delete entry.current.error
    setDraft(next)
    setSaveError(null)
  }, [])

  const save = useCallback(async (): Promise<string> => {
    // Serialize requests and capture the newest form only after a preceding request completes.
    if (entry.current.pending) { await entry.current.pending; return save() }
    if (entry.current.finalized) throw new Error('Este relatório já foi finalizado.')
    const snapshot = current.current
    const reportId = snapshot.id ?? entry.current.id
    if (snapshot.draft.general_information.inspection_date && !validInspectionDate(snapshot.draft.general_information.inspection_date)) {
      const error = new Error('Corrija a data da vistoria antes de salvar. Os demais valores continuam disponíveis nesta sessão.')
      setSaveError(error)
      throw error
    }
    const payload = draftFieldsPayload(snapshot.draft)
    const fingerprint = JSON.stringify(payload)
    if (reportId && fingerprint === entry.current.fingerprint) {
      if (alive.current) { setId(reportId); setSavedFingerprint(fingerprint); onIdRef.current(reportId) }
      return reportId
    }
    if (alive.current) { setSaving(true); setSaveError(null) }
    delete entry.current.error
    const operation = (async () => {
      try {
        const result = reportId
          ? await updateReportDraft(accessToken, reportId, payload)
          : await createReportDraft(accessToken, coordinationId, payload)
        // Update the ref immediately: a following save must use PATCH even before React commits.
        current.current = { ...current.current, id: result.id, fingerprint }
        entry.current.id = result.id
        entry.current.fingerprint = fingerprint
        if (draftCache.get(key) === entry.current) {
          draftCache.set(`${sessionKey}:${result.id}`, entry.current)
          if (!initialId) draftCache.delete(key)
        }
        if (alive.current) {
          setId(result.id)
          setSavedFingerprint(fingerprint)
          setSavedAt(new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bahia' }).format(new Date()))
          onIdRef.current(result.id)
        }
        return result.id
      } catch (error) {
        entry.current.error = error instanceof Error ? error : new Error('Não foi possível salvar o rascunho.')
        if (alive.current) setSaveError(entry.current.error)
        throw error
      } finally {
        delete entry.current.pending
        if (alive.current) setSaving(false)
      }
    })()
    entry.current.pending = operation
    return operation
  }, [accessToken, coordinationId, key, sessionKey, initialId])

  const fingerprint = JSON.stringify(draftFieldsPayload(draft))
  const dirty = fingerprint !== savedFingerprint && (Boolean(id) || startedEditing.current)
  useEffect(() => {
    if (loading || loadError || generating || !startedEditing.current || !dirty) return
    const timer = setTimeout(() => { if (!entry.current.generating) save().catch(() => {}) }, 1200)
    return () => clearTimeout(timer)
  }, [fingerprint, dirty, loading, loadError, save, generating])

  const localFiles = draft.assets.filter((asset) => asset.file).length
  useEffect(() => {
    if ((!dirty || !startedEditing.current) && !localFiles) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, localFiles])

  const generate = () => {
    if (generating || entry.current.generating) return null
    entry.current.generating = true
    delete entry.current.error
    setGenerating(true)
    setSaveError(null)
    const operation = (async () => {
      try {
        const reportId = await save()
        const result = await generateReportDraft(accessToken, reportId)
        entry.current.finalized = true
        const completedKey = `${sessionKey}:${reportId}`
        if (draftCache.get(completedKey) === entry.current) draftCache.delete(completedKey)
        return alive.current ? result : null
      } catch (error) {
        entry.current.error = error instanceof Error ? error : new Error('Não foi possível finalizar o relatório.')
        if (alive.current) setSaveError(entry.current.error)
        return null
      } finally { entry.current.generating = false; delete entry.current.generation; if (alive.current) setGenerating(false) }
    })()
    entry.current.generation = operation
    return operation
  }

  return { draft, updateDraft, id, step, setStep, loading, loadError, saveError, saving, savedAt, dirty, localFiles, save, generate, generating,
    retryLoad: () => { setLoading(true); setLoadError(null); setLoadAttempt((value) => value + 1) } }
}
