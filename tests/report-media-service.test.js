import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateFileChecksum, MEDIA_KIND_BY_ASSET, uploadReportMedia } from '../src/service/report-media-service.js'

const reportId = '550e8400-e29b-41d4-a716-446655440000'
const mediaId = '660e8400-e29b-41d4-a716-446655440000'
const rootId = '770e8400-e29b-41d4-a716-446655440000'
const previousId = '880e8400-e29b-41d4-a716-446655440000'
const checksum = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
const selectedFile = () => new File(['abc'], 'terreno.png', { type: 'image/png' })
const uploadedMedia = (file = selectedFile()) => {
  const mimeType = file.type || 'image/jpeg'
  const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'application/pdf': 'pdf' }[mimeType]
  return {
    id: mediaId, root_report_id: rootId,
    file: { storage_identifier: `reports/${rootId}/media/${mediaId}.${extension}`, file_name: file.name, mime_type: mimeType, size_bytes: file.size, checksum },
  }
}
const mockData = (t, data) => t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ status: 'success', data }), { status: 201 }))

test('calcula SHA-256 a partir dos bytes e mantém zeros iniciais do resultado', async () => {
  assert.equal(await calculateFileChecksum(selectedFile()), checksum)
  const file = new File(['286'], 'foto.jpg', { type: 'image/jpeg' })
  assert.equal(await calculateFileChecksum(file), '00328ce57bbc14b33bd6695bc8eb32cdf2fb5f3a7d89ec14a42825e15d39df60')
})

test('mapeia imagens e anexos de todas as etapas para o tipo de upload', () => {
  assert.deepEqual(MEDIA_KIND_BY_ASSET, {
    location_map: 'image', state_map: 'image', pre_implementation: 'image', photograph: 'image',
    municipality_map: 'attachment', topographic_plan: 'attachment', other: 'attachment',
  })
})

test('envia arquivo, tipo e checksum como multipart autenticado e usa a referência confirmada pela API', async (t) => {
  const file = selectedFile()
  const data = uploadedMedia(file)
  const fetchMock = mockData(t, data)

  assert.deepEqual(await uploadReportMedia('token', reportId, file, 'image', checksum.toUpperCase()), { id: mediaId, file: data.file })

  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, `/api/reports/${reportId}/media`)
  assert.equal(options.method, 'POST')
  assert.ok(options.body instanceof FormData)
  assert.equal(options.body.get('kind'), 'image')
  assert.equal(options.body.get('checksum'), checksum)
  assert.equal(options.body.get('replaces_id'), null)
  const submitted = options.body.get('file')
  assert.equal(submitted.name, file.name)
  assert.equal(submitted.type, file.type)
  assert.deepEqual(await submitted.arrayBuffer(), await file.arrayBuffer())
  const headers = new Headers(options.headers)
  assert.equal(headers.get('Authorization'), 'Bearer token')
  assert.equal(headers.get('Content-Type'), null)
  assert.equal(options.credentials, 'include')
  // An upload only stores the media. Linking belongs to the caller's section PATCH.
  assert.equal(fetchMock.mock.callCount(), 1)
})

test('envia o UUID substituído para permitir troca quando o relatório já tem 20 figuras', async (t) => {
  const fetchMock = mockData(t, uploadedMedia())
  await uploadReportMedia('token', reportId, selectedFile(), 'image', checksum, undefined, previousId)
  assert.equal(fetchMock.mock.calls[0].arguments[1].body.get('replaces_id'), previousId)
})

test('aceita UUIDs em maiúsculas quando a raiz e o caminho retornados são consistentes', async (t) => {
  const data = uploadedMedia()
  data.id = mediaId.toUpperCase()
  data.root_report_id = rootId.toUpperCase()
  data.file.storage_identifier = `reports/${data.root_report_id}/media/${data.id}.png`
  mockData(t, data)
  assert.deepEqual(await uploadReportMedia('token', reportId, selectedFile(), 'image', checksum), { id: data.id, file: data.file })
})

for (const [name, type] of [['foto.jpg', 'image/jpeg'], ['foto.JPEG', 'image/jpeg'], ['documento.pdf', 'application/pdf'], ['foto.jpeg', '']]) {
  test(`aceita formato permitido: ${name} (${type || 'MIME inferido da extensão'})`, async (t) => {
    const file = new File(['abc'], name, { type })
    const data = uploadedMedia(file)
    mockData(t, data)
    assert.deepEqual(await uploadReportMedia('token', reportId, file, 'attachment', checksum), { id: mediaId, file: data.file })
  })
}

test('aceita exatamente 25 MiB e rejeita o primeiro byte acima do limite antes de enviar', async (t) => {
  const file = new File([new Uint8Array(25 * 1024 * 1024)], 'planta.pdf', { type: 'application/pdf' })
  const data = uploadedMedia(file)
  const fetchMock = mockData(t, data)
  assert.deepEqual(await uploadReportMedia('token', reportId, file, 'attachment', checksum), { id: mediaId, file: data.file })
  const tooLarge = new File([file, 'x'], file.name, { type: file.type })
  await assert.rejects(uploadReportMedia('token', reportId, tooLarge, 'attachment', checksum), /25 MiB/)
  assert.equal(fetchMock.mock.callCount(), 1)
})

test('valida arquivo, UUID, checksum e tipo antes de chamar o endpoint', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Não deve enviar.') })
  const file = selectedFile()
  for (const invalidFile of [
    undefined, {}, new File([], 'vazio.png', { type: 'image/png' }),
    new File(['abc'], 'foto.gif', { type: 'image/gif' }),
    new File(['abc'], 'foto.png', { type: 'application/pdf' }),
  ]) {
    await assert.rejects(uploadReportMedia('token', reportId, invalidFile, 'image', checksum))
    await assert.rejects(calculateFileChecksum(invalidFile))
  }
  await assert.rejects(uploadReportMedia('token', '../outro', file, 'image', checksum), /identificador/)
  await assert.rejects(uploadReportMedia('token', reportId, file, 'photograph', checksum), /tipo/)
  await assert.rejects(uploadReportMedia('token', reportId, file, 'image', 'incompleto'), /identificação/)
  await assert.rejects(uploadReportMedia('token', reportId, file, 'image', checksum, undefined, '../outra'), /identificador/)
  assert.equal(fetchMock.mock.callCount(), 0)
})

for (const [label, mutate] of [
  ['UUID ausente', (data) => { delete data.id }],
  ['UUID inválido', (data) => { data.id = 'media-inventada' }],
  ['raiz ausente', (data) => { delete data.root_report_id }],
  ['raiz inválida', (data) => { data.root_report_id = '../outro' }],
  ['referência ausente', (data) => { delete data.file }],
  ['caminho ausente', (data) => { delete data.file.storage_identifier }],
  ['referência temporária do navegador', (data) => { data.file.storage_identifier = 'blob:temporario' }],
  ['caminho de outra raiz', (data) => { data.file.storage_identifier = `reports/${reportId}/media/${mediaId}.png` }],
  ['caminho de outra mídia', (data) => { data.file.storage_identifier = `reports/${rootId}/media/${previousId}.png` }],
  ['extensão divergente do MIME', (data) => { data.file.storage_identifier = `reports/${rootId}/media/${mediaId}.pdf` }],
  ['caminho maior que 255 caracteres', (data) => { data.file.storage_identifier = `reports/${rootId}/media/${mediaId}${'a'.repeat(256)}.png` }],
  ['nome vazio', (data) => { data.file.file_name = '' }],
  ['nome com caractere de controle', (data) => { data.file.file_name = 'foto\u0000.png' }],
  ['MIME de outro arquivo', (data) => { data.file.mime_type = 'application/pdf' }],
  ['tamanho divergente', (data) => { data.file.size_bytes++ }],
  ['tamanho não numérico', (data) => { data.file.size_bytes = '3' }],
  ['checksum inválido', (data) => { data.file.checksum = 'não é SHA-256' }],
  ['checksum de outro arquivo', (data) => { data.file.checksum = 'a'.repeat(64) }],
]) {
  test(`não confirma mídia com retorno inconsistente: ${label}`, async (t) => {
    const data = uploadedMedia()
    mutate(data)
    mockData(t, data)
    await assert.rejects(uploadReportMedia('token', reportId, selectedFile(), 'image', checksum), /confirmar o arquivo/)
  })
}

for (const status of [401, 403, 404, 409, 413, 422, 500]) {
  test(`preserva HTTP ${status} e os erros por campo para o formulário tratar a falha`, async (t) => {
    const errors = { checksum: ['Este arquivo já foi enviado para o relatório.'] }
    t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ status: 'error', message: 'Falha no upload.', errors }), { status }))
    await assert.rejects(uploadReportMedia('token', reportId, selectedFile(), 'image', checksum), (error) => {
      assert.equal(error.status, status)
      assert.deepEqual(error.errors, errors)
      return true
    })
  })
}

test('preserva a mensagem de domínio JSend 422 de duplicidade quando não há erros por campo', async (t) => {
  const message = 'Este arquivo já foi enviado para o relatório.'
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ status: 'error', message }), { status: 422 }))
  await assert.rejects(uploadReportMedia('token', reportId, selectedFile(), 'image', checksum), (error) => {
    assert.equal(error.status, 422)
    assert.equal(error.message, message)
    assert.deepEqual(error.errors, {})
    return true
  })
})

test('propaga cancelamento para descartar o upload quando o usuário sai do relatório', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Abortado', 'AbortError')), { once: true })))
  const controller = new AbortController()
  const pending = uploadReportMedia('token', reportId, selectedFile(), 'image', checksum, controller.signal)
  controller.abort()
  await assert.rejects(pending, { name: 'AbortError' })
})
