import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { createReportMediaController } from '../src/controller/report-media-controller.js'
import { draftFieldsPayload, emptyReportDraft, getStepIssues, hydrateReportDraft, isAssetConfirmed } from '../src/service/report-form-model.js'

const reportId = '550e8400-e29b-41d4-a716-446655440000'
const uuid = (index) => `660e8400-e29b-41d4-a716-${String(index).padStart(12, '0')}`
const selectedFile = (content = 'nova imagem', name = 'terreno.png') => new File([content], name, { type: name.endsWith('.pdf') ? 'application/pdf' : 'image/png' })
const digest = async (file) => createHash('sha256').update(new Uint8Array(await file.arrayBuffer())).digest('hex')
const deferred = () => {
  let resolve, reject
  const promise = new Promise((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise })
  return { promise, resolve, reject }
}
const remoteAsset = (kind, index, order = 1) => {
  const file = { storage_identifier: `reports/${reportId}/media/${uuid(index)}.png`, file_name: `imagem-${index}.png`, mime_type: 'image/png', size_bytes: 42, checksum: index.toString(16).padStart(64, '0') }
  return { id: uuid(index), kind, name: file.file_name, mimeType: file.mime_type, size: file.size_bytes, checksum: file.checksum,
    order, caption: 'Legenda existente', description: 'Documento existente', reference: file }
}

const harness = (options = {}) => {
  let draft = options.draft ?? emptyReportDraft()
  let persistedId = options.reportId ?? null
  let uploadedCount = 100
  const uploadStarted = deferred()
  const states = [], saves = [], uploads = [], events = [], errors = []
  let controller
  const save = async () => {
    const payload = structuredClone(draftFieldsPayload(draft))
    saves.push(payload)
    const creating = !persistedId
    events.push(creating ? 'create' : 'patch')
    await options.beforeSave?.(payload, saves.length)
    persistedId = reportId
    const report = creating ? { id: reportId, status: 'DRAFT' } : { id: reportId, status: 'DRAFT', ...payload }
    controller.confirm(options.echo ? options.echo(report, saves.length) : report)
    return persistedId
  }
  const upload = async (...args) => {
    uploads.push(args)
    events.push('upload')
    uploadStarted.resolve(args)
    if (options.upload) return options.upload(...args)
    const [, , file, , checksum] = args
    return { id: uuid(++uploadedCount), file: { storage_identifier: `reports/${reportId}/media/${uuid(uploadedCount)}.png`, file_name: file.name, mime_type: file.type, size_bytes: file.size, checksum } }
  }
  controller = createReportMediaController({
    getDraft: () => draft,
    commit: (next) => { draft = next; states.push(next) },
    save, accessToken: 'token-da-sessao',
    checksum: options.checksum ?? digest, upload,
    canEdit: options.canEdit, onError: (error) => errors.push(error),
  })
  return { controller, get draft() { return draft }, set draft(next) { draft = next }, states, saves, uploads, events, errors, whenUpload: uploadStarted.promise }
}

const mediaAt = {
  location_map: (payload) => payload.location.location_map,
  state_map: (payload) => payload.location.municipality_in_state_map,
  pre_implementation: (payload) => payload.pre_implementation.image,
  photograph: (payload) => payload.photographic_documentation.images[0],
  municipality_map: (payload) => payload.attachments.municipality_location_map,
  topographic_plan: (payload) => payload.attachments.topographic_plan,
  other: (payload) => payload.attachments.others[0],
}

for (const kind of Object.keys(mediaAt)) {
  test(`envia e confirma a mídia na seção correta: ${kind}`, async () => {
    const h = harness()
    const file = selectedFile()
    assert.equal(await h.controller.select(kind, file), null)
    await h.controller.waitForIdle()
    assert.equal(h.uploads.length, 1)
    const [token, id, submittedFile, submittedKind, checksum] = h.uploads[0]
    assert.equal(token, 'token-da-sessao')
    assert.equal(id, reportId)
    assert.equal(submittedFile, file)
    assert.equal(submittedKind, ['municipality_map', 'topographic_plan', 'other'].includes(kind) ? 'attachment' : 'image')
    assert.equal(checksum, await digest(file))
    assert.deepEqual(h.events, ['create', 'upload', 'patch'])
    const asset = h.draft.assets[0]
    const saved = mediaAt[kind](h.saves.at(-1))
    assert.equal(saved.id, asset.id)
    assert.deepEqual(saved.file, asset.reference)
    assert.equal(isAssetConfirmed(asset), true)
    assert.equal(asset.file, undefined)
    assert.equal(asset.uploadStatus, 'success')
    assert.ok(h.states.some((state) => state.assets[0]?.uploadStatus === 'uploading'))
    assert.ok(h.states.some((state) => state.assets[0]?.uploadStatus === 'processing'))
    assert.deepEqual(h.errors, [])
  })
}

for (const kind of ['location_map', 'state_map', 'pre_implementation', 'municipality_map', 'topographic_plan']) {
  test(`seleção desatualizada não acrescenta outro arquivo ao campo confirmado: ${kind}`, async () => {
    const draft = emptyReportDraft()
    const existing = remoteAsset(kind, 1)
    draft.assets = [existing]
    const h = harness({ draft, reportId })

    assert.equal(await h.controller.select(kind, selectedFile('segundo arquivo')), 'Este campo já possui um arquivo. Use a opção de substituição.')
    assert.deepEqual(h.draft.assets, [existing])
    assert.equal(h.saves.length, 0)
    assert.equal(h.uploads.length, 0)
  })

  test(`seleção desatualizada não acrescenta outro arquivo durante o upload do campo: ${kind}`, async () => {
    const posting = deferred()
    const h = harness({ upload: () => posting.promise })
    const file = selectedFile('primeiro arquivo')
    await h.controller.select(kind, file)
    await h.whenUpload
    const existing = h.draft.assets[0]

    assert.equal(await h.controller.select(kind, selectedFile('segundo arquivo')), 'Este campo já possui um arquivo. Use a opção de substituição.')
    assert.deepEqual(h.draft.assets, [existing])
    assert.equal(h.uploads.length, 1)
    posting.resolve({ id: uuid(101), file: { storage_identifier: `reports/${reportId}/media/${uuid(101)}.png`, file_name: file.name, mime_type: file.type, size_bytes: file.size, checksum: await digest(file) } })
    await h.controller.waitForIdle()
    assert.equal(h.draft.assets.length, 1)
    assert.equal(isAssetConfirmed(h.draft.assets[0]), true)
  })
}

for (const kind of ['photograph', 'other']) {
  test(`continua permitindo vários arquivos no mesmo campo: ${kind}`, async () => {
    const draft = emptyReportDraft()
    const existing = remoteAsset(kind, 1)
    draft.assets = [existing]
    const h = harness({ draft, reportId })

    assert.equal(await h.controller.select(kind, selectedFile('arquivo adicional')), null)
    await h.controller.waitForIdle()
    assert.equal(h.draft.assets.length, 2)
    assert.deepEqual(h.draft.assets[0], existing)
    assert.equal(h.uploads.length, 1)
    assert.equal(isAssetConfirmed(h.draft.assets[1]), true)
  })
}

test('arquivo obrigatório permanece pendente durante SHA-256 e não finaliza antes do PATCH confirmado', async () => {
  const hashing = deferred()
  const posting = deferred()
  const h = harness({ checksum: () => hashing.promise, upload: () => posting.promise })
  const file = selectedFile()
  const selection = h.controller.select('state_map', file)
  assert.equal(h.draft.assets[0].uploadStatus, 'hashing')
  assert.equal(isAssetConfirmed(h.draft.assets[0]), false)
  assert.ok(getStepIssues(h.draft)[2].some(({ message }) => /aguardando envio/.test(message)))
  assert.deepEqual(h.events, [])
  hashing.resolve(await digest(file))
  await selection
  assert.equal(h.draft.assets[0].uploadStatus, 'uploading')
  assert.equal(isAssetConfirmed(h.draft.assets[0]), false)
  posting.resolve({ id: uuid(101), file: { storage_identifier: 'reports/confirmado.png', file_name: file.name, mime_type: file.type, size_bytes: file.size, checksum: await digest(file) } })
  await h.controller.waitForIdle()
  assert.equal(isAssetConfirmed(h.draft.assets[0]), true)
  assert.equal(getStepIssues(h.draft)[2].length, 0)
})

test('substitui no limite global mantendo a referência anterior até o POST e envia replaces_id', async () => {
  const draft = emptyReportDraft()
  draft.assets = [remoteAsset('state_map', 1), ...Array.from({ length: 19 }, (_, index) => remoteAsset('other', index + 2))]
  const previous = draft.assets[0]
  const posting = deferred()
  const h = harness({ draft, reportId, upload: () => posting.promise })
  const file = selectedFile('substituição no limite')
  assert.equal(await h.controller.select('state_map', file, previous), null)
  await h.whenUpload
  assert.equal(h.draft.assets.length, 20)
  assert.equal(h.uploads[0][6], previous.id)
  assert.deepEqual(h.saves[0].location.municipality_in_state_map.file, previous.reference)
  assert.deepEqual(draftFieldsPayload(h.draft).location.municipality_in_state_map.file, previous.reference)
  assert.match(await h.controller.select('other', selectedFile('figura excedente')), /20 figuras/)
  posting.resolve({ id: uuid(101), file: { storage_identifier: 'reports/nova.png', file_name: file.name, mime_type: file.type, size_bytes: file.size, checksum: await digest(file) } })
  await h.controller.waitForIdle()
  assert.equal(h.draft.assets[0].id, uuid(101))
  assert.equal(h.draft.assets[0].previous, undefined)
  assert.equal(h.saves.at(-1).attachments.others.length, 19)
  assert.equal(h.saves.at(-1).location.municipality_in_state_map.id, uuid(101))
})

test('verificação simultânea não adiciona outra seleção e preserva edições feitas durante mudança de etapa', async () => {
  const hashing = deferred()
  const h = harness({ checksum: () => hashing.promise })
  const file = selectedFile()
  const selecting = h.controller.select('state_map', file)
  assert.match(await h.controller.select('pre_implementation', selectedFile('outro arquivo')), /verificação/)
  assert.equal(h.draft.assets.length, 1)
  // A step may unmount while another step updates the same draft.
  h.draft = { ...h.draft, conclusion: 'Conclusão editada em outra etapa', checklist: { ...h.draft.checklist, state_owned_land: 'SIM' } }
  hashing.resolve(await digest(file))
  await selecting
  await h.controller.waitForIdle()
  assert.equal(h.draft.conclusion, 'Conclusão editada em outra etapa')
  assert.equal(h.saves.at(-1).conclusion.content, h.draft.conclusion)
  assert.equal(h.saves.at(-1).attachments.checklist.state_owned_land, 'SIM')
})

test('impede conteúdo duplicado entre seções mesmo enquanto o primeiro upload está em andamento', async () => {
  const posting = deferred()
  const h = harness({ upload: () => posting.promise })
  const file = selectedFile('conteúdo compartilhado')
  await h.controller.select('state_map', file)
  assert.match(await h.controller.select('pre_implementation', selectedFile('conteúdo compartilhado', 'outro-nome.png')), /duplicados/)
  assert.equal(h.draft.assets.length, 1)
  assert.equal(h.uploads.length, 1)
  posting.resolve({ id: uuid(101), file: { storage_identifier: 'reports/unica.png', file_name: file.name, mime_type: file.type, size_bytes: file.size, checksum: await digest(file) } })
  await h.controller.waitForIdle()
  assert.equal(isAssetConfirmed(h.draft.assets[0]), true)
})

for (const [kind, field, editedText] of [
  ['photograph', 'caption', 'Legenda revisada enquanto o arquivo era verificado'],
  ['other', 'description', 'Descrição revisada enquanto o arquivo era verificado'],
]) {
  test(`rejeitar substituição duplicada preserva a edição feita durante checksum: ${kind}/${field}`, async () => {
    const draft = emptyReportDraft()
    const previous = remoteAsset(kind, 1)
    const sibling = remoteAsset('state_map', 2)
    draft.assets = [previous, sibling]
    const hashing = deferred()
    const h = harness({ draft, reportId, checksum: () => hashing.promise })
    const selecting = h.controller.select(kind, selectedFile(), previous)
    const pendingId = h.draft.assets[0].id
    h.draft = { ...h.draft, assets: h.draft.assets.map((asset) => asset.id === pendingId ? { ...asset, [field]: editedText } : asset) }
    hashing.resolve(sibling.checksum)
    assert.match(await selecting, /duplicados/)
    assert.equal(h.draft.assets[0].id, previous.id)
    assert.deepEqual(h.draft.assets[0].reference, previous.reference)
    assert.equal(h.draft.assets[0][field], editedText)
    assert.equal(isAssetConfirmed(h.draft.assets[0]), true)
    assert.deepEqual(h.draft.assets[1], sibling)
    assert.equal(h.uploads.length, 0)
    assert.equal(h.saves.length, 0)
  })
}

test('preserva mapas, listas, descrições, legendas e checklist ao acrescentar e remover um anexo', async () => {
  const draft = emptyReportDraft()
  draft.assets = Object.keys(mediaAt).map((kind, index) => remoteAsset(kind, index + 1))
  draft.checklist.state_owned_land = 'SIM'
  draft.checklist.flood_history = 'NÃO'
  const previousPayload = structuredClone(draftFieldsPayload(draft))
  const h = harness({ draft, reportId })
  await h.controller.select('other', selectedFile('documento adicional', 'certidao.pdf'))
  await h.controller.waitForIdle()
  const afterAdd = h.saves.at(-1)
  for (const section of ['location', 'pre_implementation', 'photographic_documentation']) assert.deepEqual(afterAdd[section], previousPayload[section])
  assert.deepEqual(afterAdd.attachments.checklist, previousPayload.attachments.checklist)
  assert.deepEqual(afterAdd.attachments.municipality_location_map, previousPayload.attachments.municipality_location_map)
  assert.deepEqual(afterAdd.attachments.topographic_plan, previousPayload.attachments.topographic_plan)
  assert.deepEqual(afterAdd.attachments.others[0], previousPayload.attachments.others[0])
  assert.equal(afterAdd.attachments.others.length, 2)
  const added = h.draft.assets.find((asset) => asset.id === uuid(101))
  await h.controller.remove(added)
  await h.controller.waitForIdle()
  assert.deepEqual(h.saves.at(-1).attachments, previousPayload.attachments)
  assert.equal(h.draft.assets.length, 7)
})

test('repete somente o PATCH após falha de vínculo, reutilizando o UUID e a referência já enviados', async () => {
  const h = harness({ beforeSave: async (_, call) => { if (call === 2) throw new Error('Não foi possível salvar a seção.') } })
  await h.controller.select('state_map', selectedFile())
  await h.controller.waitForIdle()
  const failed = h.draft.assets[0]
  assert.equal(failed.uploadStatus, 'error')
  assert.ok(failed.reference)
  assert.ok(failed.file)
  assert.equal(isAssetConfirmed(failed), false)
  assert.match(failed.uploadError, /salvar a seção/)
  h.controller.retry(failed)
  await h.controller.waitForIdle()
  assert.equal(h.uploads.length, 1)
  assert.equal(h.draft.assets[0].id, failed.id)
  assert.deepEqual(h.draft.assets[0].reference, failed.reference)
  assert.equal(isAssetConfirmed(h.draft.assets[0]), true)
  assert.ok(h.saves.slice(2).every((payload) => payload.location.municipality_in_state_map.id === failed.id))
})

test('snapshot de falha não permite substituição quando a nova tentativa já está enviando', async () => {
  const retryStarted = deferred()
  const posting = deferred()
  let attempts = 0
  const h = harness({ upload: async () => {
    if (++attempts === 1) throw new Error('Upload interrompido.')
    retryStarted.resolve()
    return posting.promise
  } })
  const file = selectedFile('arquivo da tentativa original')
  await h.controller.select('state_map', file)
  await h.controller.waitForIdle()
  const staleError = h.draft.assets[0]
  assert.equal(staleError.uploadStatus, 'error')
  assert.equal(staleError.reference, undefined)

  h.controller.retry(staleError)
  await retryStarted.promise
  const uploading = h.draft.assets[0]
  assert.equal(uploading.uploadStatus, 'uploading')
  assert.equal(await h.controller.select('state_map', selectedFile('substituição concorrente'), staleError), 'Aguarde o envio do arquivo anterior.')
  assert.deepEqual(h.draft.assets, [uploading])
  assert.equal(h.uploads.length, 2)

  posting.resolve({ id: uuid(101), file: { storage_identifier: `reports/${reportId}/media/${uuid(101)}.png`, file_name: file.name, mime_type: file.type, size_bytes: file.size, checksum: await digest(file) } })
  await h.controller.waitForIdle()
  assert.equal(h.uploads.length, 2)
  assert.equal(h.draft.assets.length, 1)
  assert.equal(isAssetConfirmed(h.draft.assets[0]), true)
})

test('substituição resolve snapshot com UUID temporário pelo clientId após confirmação do UUID do servidor', async () => {
  const posting = deferred()
  let attempts = 0
  const h = harness({ upload: async (_, __, file, ___, checksum) => {
    if (++attempts === 1) return posting.promise
    return { id: uuid(102), file: { storage_identifier: `reports/${reportId}/media/${uuid(102)}.png`, file_name: file.name, mime_type: file.type, size_bytes: file.size, checksum } }
  } })
  const file = selectedFile('arquivo com UUID temporário')
  await h.controller.select('state_map', file)
  await h.whenUpload
  const staleUploading = h.draft.assets[0]
  assert.equal(staleUploading.uploadStatus, 'uploading')

  posting.resolve({ id: uuid(101), file: { storage_identifier: `reports/${reportId}/media/${uuid(101)}.png`, file_name: file.name, mime_type: file.type, size_bytes: file.size, checksum: await digest(file) } })
  await h.controller.waitForIdle()
  assert.equal(h.draft.assets[0].id, uuid(101))
  assert.equal(h.draft.assets[0].clientId, staleUploading.clientId)
  assert.equal(isAssetConfirmed(h.draft.assets[0]), true)

  assert.equal(await h.controller.select('state_map', selectedFile('arquivo substituto'), staleUploading), null)
  await h.controller.waitForIdle()
  assert.equal(h.uploads.length, 2)
  assert.equal(h.uploads[1][6], uuid(101))
  assert.equal(h.draft.assets.length, 1)
  assert.equal(h.draft.assets[0].id, uuid(102))
  assert.equal(isAssetConfirmed(h.draft.assets[0]), true)
})

for (const kind of ['photograph', 'other']) {
  test(`reutiliza UUID e referência do histórico ao reinserir arquivo removido: ${kind}`, async () => {
    const file = selectedFile('arquivo recuperado do histórico')
    const checksum = await digest(file)
    const historical = remoteAsset(kind, 10, 7)
    historical.checksum = checksum
    historical.reference.checksum = checksum
    const draft = emptyReportDraft()
    draft.mediaHistory = { [checksum]: historical }
    draft.photoHistory = kind === 'photograph' ? { [checksum]: historical.order } : {}
    draft.nextPhotoOrder = 11
    const h = harness({ draft, reportId })

    assert.equal(await h.controller.select(kind, file), null)
    await h.controller.waitForIdle()
    assert.equal(h.uploads.length, 0)
    assert.equal(h.draft.assets.length, 1)
    const restored = h.draft.assets[0]
    assert.equal(restored.id, historical.id)
    assert.equal(restored.order, historical.order)
    assert.deepEqual(restored.reference, historical.reference)
    assert.equal(isAssetConfirmed(restored), true)
    assert.equal(mediaAt[kind](h.saves.at(-1)).id, historical.id)
    assert.deepEqual(mediaAt[kind](h.saves.at(-1)).file, historical.reference)
  })
}

test('remover e reinserir anexo confirmado na mesma sessão não envia novamente os bytes', async () => {
  const h = harness()
  const file = selectedFile('anexo da sessão atual', 'documento.pdf')
  await h.controller.select('other', file)
  await h.controller.waitForIdle()
  const uploaded = h.draft.assets[0]
  assert.equal(isAssetConfirmed(uploaded), true)

  await h.controller.remove(uploaded)
  await h.controller.waitForIdle()
  assert.equal(h.draft.assets.length, 0)
  assert.deepEqual(h.saves.at(-1).attachments.others, [])
  assert.equal(await h.controller.select('other', file), null)
  await h.controller.waitForIdle()

  assert.equal(h.uploads.length, 1)
  assert.equal(h.draft.assets.length, 1)
  assert.equal(h.draft.assets[0].id, uploaded.id)
  assert.deepEqual(h.draft.assets[0].reference, uploaded.reference)
  assert.equal(isAssetConfirmed(h.draft.assets[0]), true)
  assert.equal(h.saves.at(-1).attachments.others[0].id, uploaded.id)
})

test('não reinsere fotografia histórica na posição de uma fotografia diferente', async () => {
  const file = selectedFile('fotografia histórica na posição sete')
  const checksum = await digest(file)
  const historical = remoteAsset('photograph', 10, 7)
  historical.checksum = checksum
  historical.reference.checksum = checksum
  const existing = remoteAsset('photograph', 11, 3)
  const draft = emptyReportDraft()
  draft.assets = [existing]
  draft.mediaHistory = { [checksum]: historical }
  draft.photoHistory = { [checksum]: historical.order, [existing.checksum]: existing.order }
  draft.nextPhotoOrder = 11
  const h = harness({ draft, reportId })

  assert.match(await h.controller.select('photograph', file, existing), /ordem original|outra posição/)
  assert.deepEqual(h.draft.assets, [existing])
  assert.equal(h.uploads.length, 0)
  assert.equal(h.saves.length, 0)
})

test('reinserção de fotografia recupera o histórico de ordem e o próximo número a partir da mídia', async () => {
  const file = selectedFile('fotografia histórica sem índice de ordem separado')
  const checksum = await digest(file)
  const historical = remoteAsset('photograph', 10, 7)
  historical.checksum = checksum
  historical.reference.checksum = checksum
  const draft = emptyReportDraft()
  draft.mediaHistory = { [checksum]: historical }
  const h = harness({ draft, reportId })

  assert.equal(await h.controller.select('photograph', file), null)
  await h.controller.waitForIdle()

  assert.equal(h.uploads.length, 0)
  assert.equal(h.draft.assets[0].id, historical.id)
  assert.equal(h.draft.assets[0].order, 7)
  assert.equal(h.draft.photoHistory[checksum], 7)
  assert.equal(h.draft.nextPhotoOrder, 8)
  assert.equal(isAssetConfirmed(h.draft.assets[0]), true)
})

test('fotografia histórica mantém ordem após reutilização como anexo e reabertura do relatório', async () => {
  const file = selectedFile('imagem histórica usada também como anexo')
  const checksum = await digest(file)
  const historical = remoteAsset('photograph', 10, 8)
  historical.checksum = checksum
  historical.reference.checksum = checksum
  const historicalImage = { id: historical.id, file: historical.reference, order: historical.order, caption: historical.caption }
  const draft = hydrateReportDraft({ uploaded_images: [historicalImage] })
  let echoedReport
  const h = harness({ draft, reportId, echo: (report) => {
    echoedReport = { ...report, uploaded_images: [historicalImage] }
    return echoedReport
  } })

  assert.equal(await h.controller.select('other', file), null)
  await h.controller.waitForIdle()
  assert.equal(h.uploads.length, 0)
  assert.equal(isAssetConfirmed(h.draft.assets[0]), true)

  // Opening the persisted report restores attachment order separately from image history.
  h.draft = hydrateReportDraft(echoedReport)
  const attachment = h.draft.assets[0]
  assert.equal(attachment.kind, 'other')
  assert.equal(attachment.order, 1)
  assert.equal(h.draft.photoHistory[checksum], 8)
  await h.controller.remove(attachment)
  await h.controller.waitForIdle()
  assert.equal(await h.controller.select('photograph', file), null)
  await h.controller.waitForIdle()

  assert.equal(h.uploads.length, 0)
  assert.equal(h.draft.assets.length, 1)
  assert.equal(h.draft.assets[0].id, historical.id)
  assert.equal(h.draft.assets[0].order, 8)
  assert.equal(h.draft.photoHistory[checksum], 8)
  assert.equal(h.draft.nextPhotoOrder, 9)
  assert.equal(h.saves.at(-1).photographic_documentation.images[0].order, 8)
  assert.equal(isAssetConfirmed(h.draft.assets[0]), true)
})

test('remoção após falha de PATCH confirma o vínculo primeiro e só então remove a referência', async () => {
  const relinking = deferred()
  const finishLinking = deferred()
  const h = harness({ beforeSave: async (payload, call) => {
    if (call === 2) throw new Error('Falha inicial no vínculo.')
    if (call === 3) { relinking.resolve(payload); await finishLinking.promise }
  } })
  await h.controller.select('state_map', selectedFile())
  await h.controller.waitForIdle()
  const failed = h.draft.assets[0]
  assert.equal(failed.uploadStatus, 'error')
  assert.ok(failed.reference)

  const removing = h.controller.remove(failed)
  const recoveryPayload = await relinking.promise
  try {
    assert.equal(h.draft.assets.length, 1)
    assert.equal(h.draft.assets[0].id, failed.id)
    assert.equal(recoveryPayload.location.municipality_in_state_map.id, failed.id)
    assert.deepEqual(recoveryPayload.location.municipality_in_state_map.file, failed.reference)
  } finally {
    finishLinking.resolve()
  }
  await removing
  await h.controller.waitForIdle()
  assert.equal(h.uploads.length, 1)
  assert.equal(h.draft.assets.length, 0)
  assert.equal(h.saves.at(-1).location.municipality_in_state_map, null)
})

test('falha ao confirmar vínculo antes da remoção mantém UUID e referência disponíveis para recuperação', async () => {
  const h = harness({ beforeSave: async (_, call) => { if (call >= 2) throw new Error('O vínculo continua indisponível.') } })
  await h.controller.select('state_map', selectedFile())
  await h.controller.waitForIdle()
  const failed = h.draft.assets[0]

  await h.controller.remove(failed)
  await h.controller.waitForIdle()
  assert.equal(h.uploads.length, 1)
  assert.equal(h.draft.assets.length, 1)
  const retained = h.draft.assets[0]
  assert.equal(retained.id, failed.id)
  assert.deepEqual(retained.reference, failed.reference)
  assert.equal(retained.uploadStatus, 'error')
  assert.equal(isAssetConfirmed(retained), false)
  assert.match(retained.uploadError, /indisponível/)
  assert.ok(h.saves.slice(2).every((payload) => payload.location.municipality_in_state_map?.id === failed.id))
})

for (const [label, alter] of [
  ['mídia omitida', (report) => { report.location.municipality_in_state_map = null }],
  ['UUID diferente', (report) => { report.location.municipality_in_state_map.id = uuid(999) }],
  ['metadados diferentes', (report) => { report.location.municipality_in_state_map.file.checksum = 'f'.repeat(64) }],
  ['ordem diferente', (report) => { report.location.municipality_in_state_map.order++ }],
]) {
  test(`não mostra sucesso se o relatório retornado não confirmar o vínculo: ${label}`, async () => {
    const h = harness({ echo: (report, call) => { if (call > 1) alter(report); return report } })
    await h.controller.select('state_map', selectedFile())
    await h.controller.waitForIdle()
    assert.equal(h.draft.assets[0].uploadStatus, 'error')
    assert.equal(isAssetConfirmed(h.draft.assets[0]), false)
    assert.match(h.draft.assets[0].uploadError, /não confirmou o vínculo/)
    assert.ok(getStepIssues(h.draft)[2].some(({ message }) => /não confirmou/.test(message)))
    assert.equal(h.errors.length, 1)
  })
}

test('remoção durante POST pendente aguarda o vínculo antes de remover para liberar a reserva da mídia', async () => {
  const posting = deferred()
  const h = harness({ upload: () => posting.promise })
  const file = selectedFile()
  await h.controller.select('state_map', file)
  await h.whenUpload
  const uploading = h.draft.assets[0]
  h.controller.remove(uploading)
  assert.equal(h.draft.assets.length, 1)
  assert.equal(h.draft.assets[0].id, uploading.id)
  assert.equal(h.draft.assets[0].uploadStatus, 'uploading')
  assert.equal(h.saves.length, 1)
  const reference = { storage_identifier: `reports/${reportId}/media/${uuid(101)}.png`, file_name: file.name, mime_type: file.type, size_bytes: file.size, checksum: await digest(file) }
  posting.resolve({ id: uuid(101), file: reference })
  await h.controller.waitForIdle()
  assert.equal(h.draft.assets.length, 0)
  assert.deepEqual(h.events, ['create', 'upload', 'patch', 'patch'])
  assert.equal(h.saves.length, 3)
  assert.equal(h.saves[1].location.municipality_in_state_map.id, uuid(101))
  assert.deepEqual(h.saves[1].location.municipality_in_state_map.file, reference)
  assert.equal(h.saves.at(-1).location.municipality_in_state_map, null)
})

test('remover durante checksum pendente impede o POST', async () => {
  const hashing = deferred()
  const h = harness({ checksum: () => hashing.promise })
  const selection = h.controller.select('state_map', selectedFile())
  h.controller.remove(h.draft.assets[0])
  hashing.resolve('a'.repeat(64))
  await selection
  await h.controller.waitForIdle()
  assert.equal(h.draft.assets.length, 0)
  assert.equal(h.uploads.length, 0)
})

test('remover snapshot de arquivo já ausente encerra a operação sem bloquear waitForIdle', { timeout: 1000 }, async () => {
  const h = harness({ reportId })
  await h.controller.remove(remoteAsset('state_map', 1))
  await h.controller.waitForIdle()
  assert.equal(h.draft.assets.length, 0)
  assert.equal(h.saves.length, 0)
  assert.equal(h.uploads.length, 0)
})

test('falha ao gerar UUID orienta conexão segura e permite uma seleção posterior sem bloquear o envio', async (t) => {
  let attempts = 0
  const randomUUID = t.mock.method(globalThis.crypto, 'randomUUID', () => {
    if (++attempts === 1) throw new Error('UUID indisponível nesta conexão.')
    return uuid(500)
  })
  const h = harness()
  assert.match(await h.controller.select('state_map', selectedFile()), /conexão segura/)
  assert.equal(h.draft.assets.length, 0)
  assert.equal(h.saves.length, 0)
  assert.equal(h.uploads.length, 0)
  assert.equal(await h.controller.select('state_map', selectedFile()), null)
  await h.controller.waitForIdle()
  assert.equal(randomUUID.mock.callCount(), 2)
  assert.equal(h.uploads.length, 1)
  assert.equal(isAssetConfirmed(h.draft.assets[0]), true)
})

test('falha de upload mantém pendência e apresenta as validações recebidas da API', async () => {
  const error = Object.assign(new Error('Confira os campos.'), { status: 422, errors: { checksum: ['Este arquivo já foi enviado.'] } })
  const h = harness({ upload: async () => { throw error } })
  await h.controller.select('state_map', selectedFile())
  await h.controller.waitForIdle()
  assert.equal(h.draft.assets[0].uploadStatus, 'error')
  assert.equal(h.draft.assets[0].reference, undefined)
  assert.match(h.draft.assets[0].uploadError, /já foi enviado/)
  assert.equal(h.saves.length, 1)
  assert.equal(isAssetConfirmed(h.draft.assets[0]), false)
})
