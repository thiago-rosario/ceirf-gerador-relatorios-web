import { ASSET_CAPTIONS, MAX_FIGURES, fileMimeType, hydrateReportDraft, isAssetConfirmed, validateSelectedFile } from '../service/report-form-model.js'
import { calculateFileChecksum, MEDIA_KIND_BY_ASSET, uploadReportMedia } from '../service/report-media-service.js'

const errorMessage = (error) => {
  const details = Object.values(error?.errors ?? {}).flat().filter((value) => typeof value === 'string')
  return details.length ? details.join(' ') : error instanceof Error ? error.message : 'Não foi possível enviar o arquivo. Tente novamente.'
}
const sameFile = (left, right) => left && right && ['storage_identifier', 'file_name', 'mime_type', 'size_bytes', 'checksum'].every((key) => left[key] === right[key])

/** One controller belongs to the draft, so navigation between steps never interrupts uploads.
 * @param {{getDraft: () => import('../types/report-draft.js').ReportDraft,
 * commit: (draft: import('../types/report-draft.js').ReportDraft) => void,
 * save: (force?: boolean) => Promise<string>, accessToken: string, canEdit?: () => boolean,
 * onError?: (error: Error) => void, checksum?: typeof calculateFileChecksum, upload?: typeof uploadReportMedia}} options
 */
export function createReportMediaController({ getDraft, commit, save, accessToken, canEdit = () => true, onError = () => {}, checksum = calculateFileChecksum, upload = uploadReportMedia }) {
  let selecting = false
  const jobs = new Map()
  const mediaHistory = (draft) => ({ ...draft.mediaHistory, ...Object.fromEntries(draft.assets.filter(isAssetConfirmed).map((asset) => [asset.checksum.toLowerCase(), asset])) })
  const find = (id) => getDraft().assets.find((asset) => asset.id === id)
  const update = (id, transform) => {
    const draft = getDraft()
    commit({ ...draft, assets: draft.assets.map((asset) => asset.id === id ? transform(asset) : asset) })
  }

  // Confirm only references actually echoed by the report API, never just an HTTP success.
  const confirm = (report) => {
    const restored = hydrateReportDraft(report)
    const remote = restored.assets
    const draft = getDraft()
    let changed = false
    const assets = draft.assets.map((asset) => {
      if (isAssetConfirmed(asset) || !asset.reference) return asset
      const persisted = remote.find((item) => item.id === asset.id && item.kind === asset.kind)
      if (!persisted || !sameFile(persisted.reference, asset.reference) || (['location_map', 'state_map', 'pre_implementation', 'photograph'].includes(asset.kind) && persisted.order !== asset.order)) return asset
      changed = true
      const { file: _file, previous: _previous, uploadError: _error, ...confirmed } = asset
      return { ...confirmed, uploadStatus: 'success' }
    })
    if (changed) commit({ ...draft, assets, mediaHistory: { ...mediaHistory(draft), ...restored.mediaHistory } })
  }

  const run = (initialId) => {
    if (jobs.has(initialId)) return jobs.get(initialId)
    const asset = find(initialId)
    if (!asset) return Promise.resolve()
    update(initialId, (item) => ({ ...item, uploadStatus: item.reference ? 'processing' : 'uploading', uploadError: undefined }))
    let assetId = initialId
    const operation = Promise.resolve().then(async () => {
      try {
        if (!find(assetId)) return
        // A server UUID is required even when media is the first field selected in a new draft.
        const reportId = await save()
        if (!find(assetId)) return
        if (!asset.reference) {
          const result = await upload(accessToken, reportId, asset.file, MEDIA_KIND_BY_ASSET[asset.kind], asset.checksum, undefined, asset.previous?.id)
          if (!find(assetId)) return
          const previousId = assetId
          assetId = result.id
          update(previousId, (item) => ({ ...item, id: result.id, reference: result.file, name: result.file.file_name, mimeType: result.file.mime_type, size: result.file.size_bytes, checksum: result.file.checksum, uploadStatus: 'processing' }))
        }
        await save(true)
        const latest = find(assetId)
        if (latest && !isAssetConfirmed(latest)) throw new Error('O servidor não confirmou o vínculo do arquivo com o relatório. Tente novamente.')
      } catch (error) {
        const latest = find(assetId)
        if (latest && !isAssetConfirmed(latest)) {
          update(assetId, (item) => ({ ...item, uploadStatus: 'error', uploadError: errorMessage(error) }))
          onError(error)
        }
      } finally {
        jobs.delete(initialId)
      }
    })
    jobs.set(initialId, operation)
    return operation
  }

  const select = async (kind, file, existing) => {
    if (!canEdit()) return 'Aguarde a finalização do relatório.'
    if (selecting) return 'Aguarde a verificação do arquivo anterior.'
    const validation = validateSelectedFile(file)
    if (validation) return validation
    const draft = getDraft()
    if (!existing && !['photograph', 'other'].includes(kind) && draft.assets.some((asset) => asset.kind === kind)) return 'Este campo já possui um arquivo. Use a opção de substituição.'
    if (existing) {
      existing = draft.assets.find((asset) => asset.id === existing.id || (existing.clientId && asset.clientId === existing.clientId))
      if (!existing) return 'O arquivo foi removido. Selecione-o novamente.'
    }
    if (existing?.uploadStatus && !['success', 'error'].includes(existing.uploadStatus)) return 'Aguarde o envio do arquivo anterior.'
    if (existing?.reference && !isAssetConfirmed(existing)) return 'Confirme o vínculo deste arquivo antes de substituí-lo. Tente o envio novamente.'
    if (!existing && draft.assets.length >= MAX_FIGURES) return 'O relatório admite no máximo 20 figuras.'
    if (kind === 'photograph' && !existing && draft.assets.some((asset) => asset.kind === kind && !asset.caption.trim())) return 'Informe a legenda da fotografia adicionada antes de selecionar outra.'
    let temporaryId
    try {
      temporaryId = globalThis.crypto.randomUUID()
    } catch {
      return 'Não foi possível preparar o envio do arquivo. Acesse o sistema por uma conexão segura e tente novamente.'
    }
    selecting = true
    const previous = existing?.reference ? existing : existing?.previous
    const order = existing?.order ?? (kind === 'photograph' ? draft.nextPhotoOrder : Math.max(0, ...draft.assets.filter((asset) => asset.kind === kind).map((asset) => asset.order)) + 1)
    const pending = { id: temporaryId, clientId: temporaryId, kind, file, name: file.name, mimeType: fileMimeType(file), size: file.size, checksum: '', order,
      caption: existing?.caption ?? ASSET_CAPTIONS[kind] ?? '', description: existing?.description ?? '', previous, uploadStatus: 'hashing' }
    commit({ ...draft, mediaHistory: mediaHistory(draft), assets: existing ? draft.assets.map((asset) => asset.id === existing.id ? pending : asset) : [...draft.assets, pending] })
    const rollback = () => {
      const latest = getDraft()
      commit({ ...latest, assets: latest.assets.flatMap((asset) => asset.id === temporaryId ? existing ? [{ ...existing, caption: asset.caption, description: asset.description }] : [] : [asset]) })
    }
    try {
      const digest = await checksum(file)
      if (!find(temporaryId)) return null
      const latest = getDraft()
      if (latest.assets.some((asset) => asset.id !== temporaryId && (asset.checksum.toLowerCase() === digest || asset.previous?.checksum.toLowerCase() === digest)) || previous?.checksum.toLowerCase() === digest) {
        rollback()
        return 'Este arquivo já está no relatório. Não é permitido adicionar arquivos duplicados.'
      }
      const previousOrder = latest.photoHistory[digest]
      if (kind === 'photograph' && previousOrder !== undefined && ((existing && previousOrder !== existing.order) || latest.assets.some((asset) => asset.id !== temporaryId && asset.kind === kind && asset.order === previousOrder))) {
        rollback()
        return 'Esta fotografia já foi adicionada em outra posição. Preserve a ordem original ao reinseri-la.'
      }
      const photoOrder = kind === 'photograph' ? previousOrder ?? order : order
      const historical = latest.mediaHistory?.[digest]
      // The API rejects a second POST of an existing checksum, even after removal.
      // Relink the original UUID and metadata, preserving an image's immutable order.
      const imageKind = !['municipality_map', 'topographic_plan', 'other'].includes(kind)
      const historicalOrder = (imageKind ? previousOrder : undefined) ?? historical?.order ?? photoOrder
      if (historical && kind === 'photograph' && ((existing && existing.order !== historicalOrder) || latest.assets.some((asset) => asset.id !== temporaryId && asset.kind === kind && asset.order === historicalOrder))) {
        rollback()
        return 'Esta fotografia já foi adicionada em outra posição. Preserve a ordem original ao reinseri-la.'
      }
      commit({ ...latest, assets: latest.assets.map((asset) => asset.id === temporaryId ? { ...asset, checksum: digest, order: historicalOrder,
        ...(historical && { id: historical.id, reference: historical.reference, name: historical.name, mimeType: historical.mimeType, size: historical.size }),
        uploadStatus: historical ? 'processing' : 'uploading' } : asset),
        photoHistory: kind === 'photograph' ? { ...latest.photoHistory, [digest]: historicalOrder } : latest.photoHistory,
        nextPhotoOrder: kind === 'photograph' ? Math.max(latest.nextPhotoOrder, historicalOrder + 1) : latest.nextPhotoOrder })
      void run(historical?.id ?? temporaryId)
      return null
    } catch (error) {
      update(temporaryId, (asset) => ({ ...asset, uploadStatus: 'error', uploadError: errorMessage(error) }))
      return null
    } finally {
      selecting = false
    }
  }

  const retry = (asset) => {
    if (!canEdit() || !find(asset.id)) return
    if (!asset.checksum && asset.file) { void select(asset.kind, asset.file, asset); return }
    void run(asset.id)
  }
  const remove = (asset) => {
    if (!canEdit()) return
    const key = `remove:${asset.clientId ?? asset.id}`
    if (jobs.has(key)) return
    const operation = Promise.resolve().then(async () => {
      try {
        // A successful POST reserves a server slot until its reference is linked.
        // Complete that link before removing it, including after a failed PATCH.
        if (jobs.has(asset.id)) await jobs.get(asset.id)
        let currentAsset = getDraft().assets.find((item) => item.id === asset.id || (asset.clientId && item.clientId === asset.clientId))
        if (!currentAsset) return
        if (currentAsset.reference && !isAssetConfirmed(currentAsset)) {
          await run(currentAsset.id)
          currentAsset = find(currentAsset.id)
          if (!currentAsset || !isAssetConfirmed(currentAsset)) return
        }
        const draft = getDraft()
        commit({ ...draft, mediaHistory: mediaHistory(draft), assets: draft.assets.filter((item) => item.id !== currentAsset.id) })
        await save()
      } catch (error) {
        onError(error)
      } finally {
        jobs.delete(key)
      }
    })
    jobs.set(key, operation)
    return operation
  }
  return { select, remove, retry, confirm, waitForIdle: async () => { while (jobs.size) await Promise.all([...jobs.values()]) } }
}
