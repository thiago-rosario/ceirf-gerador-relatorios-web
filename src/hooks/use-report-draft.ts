import { useCallback, useEffect, useRef, useState } from 'react'
import { createReportDraft, generateReportDraft, loadReportDraft, updateReportDraft } from '@/service/report-draft-service'
import { draftFieldsPayload, emptyReportDraft, getStepIssues, hydrateReportDraft, isAssetConfirmed, validInspectionDate } from '@/service/report-form-model'
import { createReportMediaController } from '@/controller/report-media-controller'
import type { ReportDraft } from '@/types/report-draft'

type SavedDraft = { draft: ReportDraft; id: string | null; fingerprint: string; step: number; modified?: boolean; pending?: Promise<string>; finalized?: boolean; generating?: boolean; generation?: Promise<unknown>; error?: ApiError; mediaError?: ApiError; media?: ReturnType<typeof createReportMediaController>; notify?: () => void }
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
  const [mediaError, setMediaError] = useState<ApiError | null>(start.current?.mediaError ?? null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [savedFingerprint, setSavedFingerprint] = useState(start.current?.fingerprint ?? '')
  const [generating, setGenerating] = useState(Boolean(start.current?.generating))
  const entry = useRef<SavedDraft>(start.current ?? { draft, id, fingerprint: savedFingerprint, step })
  const onIdRef = useRef(onId)
  const alive = useRef(true)
  const startedEditing = useRef(Boolean(start.current?.modified))
  onIdRef.current = onId

  useEffect(() => {
    alive.current = true
    const savedEntry = entry.current
    const synchronizeEntry = () => {
      setDraft(entry.current.draft)
      setId(entry.current.id)
      setSavedFingerprint(entry.current.fingerprint)
      setSaveError(entry.current.error ?? null)
      setMediaError(entry.current.mediaError ?? null)
      setSaving(Boolean(entry.current.pending))
      if (entry.current.id) onIdRef.current(entry.current.id)
    }
    entry.current.notify = synchronizeEntry
    synchronizeEntry()
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
    return () => {
      alive.current = false
      if (savedEntry.notify === synchronizeEntry) delete savedEntry.notify
    }
  }, [])

  useEffect(() => {
    if (!initialId || (start.current && loadAttempt === 0)) return
    const controller = new AbortController()
    loadReportDraft(accessToken, initialId, controller.signal).then((report) => {
      if (controller.signal.aborted) return
      if (report.status !== 'DRAFT') throw new Error('Este relatório já foi gerado e não pode ser editado como rascunho.')
      if (report.coordination_id !== coordinationId) throw new Error('Este rascunho pertence a outra coordenação.')
      const restored = hydrateReportDraft(report)
      entry.current.draft = restored
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
      entry.current.step = step
      const cacheKey = `${sessionKey}:${entry.current.id ?? 'new'}`
      draftCache.set(cacheKey, entry.current)
      if (cacheKey !== key && draftCache.get(key) === entry.current) draftCache.delete(key)
    }
  }, [key, sessionKey, draft, id, savedFingerprint, step, loading, loadError])

  const updateDraft = useCallback((change: ReportDraft | ((current: ReportDraft) => ReportDraft)) => {
    if (entry.current.finalized || entry.current.generating) return
    const next = typeof change === 'function' ? change(entry.current.draft) : change
    startedEditing.current = true
    entry.current.modified = true
    delete entry.current.error
    entry.current.draft = next
    setDraft(next)
    setSaveError(null)
  }, [])

  const save = useCallback(async (force = false): Promise<string> => {
    // Serialize requests and capture the newest form only after a preceding request completes.
    if (entry.current.pending) { await entry.current.pending; return save(force) }
    if (entry.current.finalized) throw new Error('Este relatório já foi finalizado.')
    const snapshot = entry.current
    const reportId = snapshot.id
    if (snapshot.draft.general_information.inspection_date && !validInspectionDate(snapshot.draft.general_information.inspection_date)) {
      const error = new Error('Corrija a data da vistoria antes de salvar. Os demais valores continuam disponíveis nesta sessão.')
      entry.current.error = error
      entry.current.notify?.()
      throw error
    }
    const payload = draftFieldsPayload(snapshot.draft)
    const fingerprint = JSON.stringify(payload)
    if (!force && reportId && fingerprint === entry.current.fingerprint) {
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
        entry.current.id = result.id
        // Creation deliberately omits all media sections; the next save must PATCH them.
        entry.current.fingerprint = reportId ? fingerprint : ''
        entry.current.media?.confirm(result)
        if (draftCache.get(key) === entry.current) {
          draftCache.set(`${sessionKey}:${result.id}`, entry.current)
          if (!initialId) draftCache.delete(key)
        }
        if (alive.current) {
          setId(result.id)
          setSavedFingerprint(entry.current.fingerprint)
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
        entry.current.notify?.()
        if (alive.current) setSaving(false)
      }
    })()
    entry.current.pending = operation
    entry.current.notify?.()
    return operation
  }, [accessToken, coordinationId, key, sessionKey, initialId])

  if (!entry.current.media) entry.current.media = createReportMediaController({
    accessToken, getDraft: () => entry.current.draft, save,
    canEdit: () => !entry.current.generating && !entry.current.finalized,
    commit: (next) => {
      entry.current.draft = next
      entry.current.modified = true
      startedEditing.current = true
      entry.current.notify?.()
    },
    onError: (error) => { entry.current.mediaError = error; entry.current.notify?.() },
  })

  const fingerprint = JSON.stringify(draftFieldsPayload(draft))
  const dirty = fingerprint !== savedFingerprint && (Boolean(id) || startedEditing.current)
  useEffect(() => {
    if (loading || loadError || generating || !startedEditing.current || !dirty) return
    const timer = setTimeout(() => { if (!entry.current.generating) save().catch(() => {}) }, 1200)
    return () => clearTimeout(timer)
  }, [fingerprint, dirty, loading, loadError, save, generating])

  const localFiles = draft.assets.filter((asset) => !isAssetConfirmed(asset)).length
  useEffect(() => {
    if ((!dirty || !startedEditing.current) && !localFiles) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, localFiles])

  const generate = () => {
    if (generating || entry.current.generating) return null
    if (getStepIssues(entry.current.draft).some((issues) => issues.length)) {
      const error = new Error('Preencha as pendências e confirme o envio de todos os arquivos antes de finalizar.')
      entry.current.error = error
      setSaveError(error)
      return null
    }
    entry.current.generating = true
    delete entry.current.error
    setGenerating(true)
    setSaveError(null)
    const operation = (async () => {
      try {
        const reportId = await save()
        if (getStepIssues(entry.current.draft).some((issues) => issues.length)) throw new Error('Existem arquivos ou campos pendentes de confirmação. Confira o relatório antes de finalizar.')
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

  return { draft, updateDraft, id, step, setStep, loading, loadError, saveError, mediaError, saving, savedAt, dirty, localFiles, save, generate, generating,
    selectMedia: entry.current.media.select, removeMedia: entry.current.media.remove, retryMedia: entry.current.media.retry,
    retryLoad: () => { setLoading(true); setLoadError(null); setLoadAttempt((value) => value + 1) } }
}
