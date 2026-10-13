import assert from 'node:assert/strict'
import test from 'node:test'
import { createReportDraft, generateReportDraft, loadReportDraft, updateReportDraft } from '../src/service/report-draft-service.js'

const id = '550e8400-e29b-41d4-a716-446655440000'
const otherId = '660e8400-e29b-41d4-a716-446655440000'
const created = { id, status: 'DRAFT', revision_number: 0, created_at: '2026-10-13T10:00:00-03:00' }
const partial = {
  ...created, cover: { municipality: null, force: null, size: null, typology: '', sei_number: null },
  general_information: null, location: null, infrastructure: { water_network: 'SIM', internet: null },
  pre_implementation: null, photographic_documentation: { images: [] },
  attachments: { checklist: { state_owned_land: null }, others: [] }, conclusion: { content: '' },
  generated_document: null,
}
const generated = {
  ...partial, status: 'GENERATED', is_generated: true,
  generated_document: { file_name: 'vistoria.pdf', generated_at: '2026-10-13T10:05:00-03:00' },
}

const mockData = (t, data, status = 200) => t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ status: 'success', data }), {
  status, headers: { 'Content-Type': 'application/json' },
}))

test('cria rascunho parcial com coordenação real e confirma UUID/status no envelope da API', async (t) => {
  const fetchMock = mockData(t, created, 201)
  const payload = { cover: { municipality_id: null, force: null, size: null, typology: '', sei_number: null }, status: 'GENERATED', created_by: 'outro' }
  assert.deepEqual(await createReportDraft('token', 2, payload), created)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, '/api/reports')
  assert.equal(options.method, 'POST')
  assert.deepEqual(JSON.parse(options.body), { cover: payload.cover, coordination_id: 2 })
  assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer token')
})

test('permite rascunho vazio e deixa o backend resolver a coordenação do usuário', async (t) => {
  const fetchMock = mockData(t, created, 201)
  assert.deepEqual(await createReportDraft('token', null, {}), created)
  assert.deepEqual(JSON.parse(fetchMock.mock.calls[0].arguments[1].body), {})
})

test('encaminha tipo de relatório real opcional sem modificar o payload recebido', async (t) => {
  const fetchMock = mockData(t, created, 201)
  const payload = { report_type_id: 7, conclusion: { content: '' } }
  await createReportDraft('token', 2, payload)
  assert.deepEqual(JSON.parse(fetchMock.mock.calls[0].arguments[1].body), { ...payload, coordination_id: 2 })
  assert.deepEqual(payload, { report_type_id: 7, conclusion: { content: '' } })
})

test('normaliza seleções e SEI em branco para permitir salvamento parcial sem alterar o formulário', async (t) => {
  const fetchMock = mockData(t, partial)
  const payload = { cover: { municipality_id: '', force: '', size: '', typology: '', sei_number: '   ' } }
  await updateReportDraft('token', id, payload)
  assert.deepEqual(JSON.parse(fetchMock.mock.calls[0].arguments[1].body).cover, {
    municipality_id: null, force: null, size: null, typology: '', sei_number: null,
  })
  assert.equal(payload.cover.sei_number, '   ')
})

test('criação envia checklist e omite mídias proibidas pelo contrato sem alterar a entrada', async (t) => {
  const fetchMock = mockData(t, created, 201)
  const payload = {
    location: { location_map: null, municipality_in_state_map: null },
    pre_implementation: { image: null }, photographic_documentation: { images: [] },
    attachments: { checklist: { state_owned_land: 'SIM' }, municipality_location_map: null, topographic_plan: null, others: [] },
  }
  await createReportDraft('token', 2, payload)
  assert.deepEqual(JSON.parse(fetchMock.mock.calls[0].arguments[1].body), {
    coordination_id: 2, attachments: { checklist: { state_owned_land: 'SIM' } },
  })
  assert.equal(payload.attachments.municipality_location_map, null)
  assert.deepEqual(payload.attachments.others, [])
})

test('PATCH mantém referências remotas dos anexos ao atualizar o checklist', async (t) => {
  const fetchMock = mockData(t, partial)
  const reference = { id, file: { storage_identifier: `reports/${id}/media/${otherId}.png`, file_name: 'mapa.png', mime_type: 'image/png', size_bytes: 42, checksum: 'a'.repeat(64) }, description: '' }
  const payload = { attachments: { checklist: { state_owned_land: 'SIM' }, municipality_location_map: reference, topographic_plan: null, others: [reference] } }
  await updateReportDraft('token', id, payload)
  assert.deepEqual(JSON.parse(fetchMock.mock.calls[0].arguments[1].body), payload)
})

test('salva seção completa por PATCH e aceita campos obrigatórios ainda pendentes', async (t) => {
  const fetchMock = mockData(t, partial)
  const payload = { general_information: { inspection_date: null, collaborators: '' }, coordination_id: 99, status: 'GENERATED' }
  assert.deepEqual(await updateReportDraft('token', id, payload), partial)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, `/api/reports/${id}`)
  assert.equal(options.method, 'PATCH')
  assert.deepEqual(JSON.parse(options.body), { general_information: payload.general_information })
})

test('recupera rascunho real sem exigir capa ou conclusão preenchidas', async (t) => {
  const fetchMock = mockData(t, partial)
  assert.deepEqual(await loadReportDraft('token', id.toUpperCase()), partial)
  assert.equal(fetchMock.mock.calls[0].arguments[0], `/api/reports/${id.toUpperCase()}`)
})

test('confirma geração pela resposta técnica do backend e preserva os dados do PDF', async (t) => {
  const fetchMock = mockData(t, generated)
  assert.deepEqual(await generateReportDraft('token', id), generated)
  const [url, options] = fetchMock.mock.calls[0].arguments
  assert.equal(url, `/api/reports/${id}/generate`)
  assert.equal(options.method, 'POST')
  assert.equal(options.body, undefined)
  assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer token')
})

for (const [label, data, run] of [
  ['UUID ausente na criação', { ...created, id: undefined }, () => createReportDraft('token', 2, {})],
  ['status desconhecido', { ...created, status: 'APPROVED' }, () => createReportDraft('token', 2, {})],
  ['criação não confirmada como rascunho', generated, () => createReportDraft('token', 2, {})],
  ['revisão inválida na criação', { ...created, revision_number: -1 }, () => createReportDraft('token', 2, {})],
  ['data de criação ausente', { ...created, created_at: undefined }, () => createReportDraft('token', 2, {})],
  ['UUID de outro relatório', { ...partial, id: otherId }, () => loadReportDraft('token', id)],
  ['seção em formato inválido', { ...partial, cover: [] }, () => loadReportDraft('token', id)],
  ['atualização retornando documento final', generated, () => updateReportDraft('token', id, { conclusion: { content: '' } })],
  ['geração mantendo rascunho', partial, () => generateReportDraft('token', id)],
  ['geração sem confirmação técnica', { ...generated, is_generated: false }, () => generateReportDraft('token', id)],
  ['geração sem PDF', { ...generated, generated_document: null }, () => generateReportDraft('token', id)],
]) {
  test(`não informa sucesso com retorno inválido: ${label}`, async (t) => {
    mockData(t, data)
    await assert.rejects(run(), /confirmar os dados/)
  })
}

test('rejeita UUID, coordenação e payload inválidos antes de solicitar à API', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Não deve consultar.') })
  for (const invalidId of ['../outro', '', null]) {
    await assert.rejects(loadReportDraft('token', invalidId))
    await assert.rejects(updateReportDraft('token', invalidId, {}))
    await assert.rejects(generateReportDraft('token', invalidId))
  }
  for (const coordinationId of [0, -1, 2.5, '2']) await assert.rejects(createReportDraft('token', coordinationId, {}))
  await assert.rejects(createReportDraft('token', 2, []))
  await assert.rejects(createReportDraft('token', 2, { report_type_id: '7' }))
  await assert.rejects(updateReportDraft('token', id, { cover: null }))
  await assert.rejects(updateReportDraft('token', id, {}))
  assert.equal(fetchMock.mock.callCount(), 0)
})

for (const status of [401, 403, 404, 409, 422, 500]) {
  test(`preserva HTTP ${status} e validações para o formulário tratar a falha de salvamento`, async (t) => {
    const errors = { 'cover.sei_number': ['O número SEI deve possuir no máximo 80 caracteres.'] }
    t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ status: 'error', message: 'Falha ao salvar.', errors }), { status }))
    await assert.rejects(updateReportDraft('token', id, { cover: partial.cover }), (error) => {
      assert.equal(error.status, status)
      assert.deepEqual(error.errors, errors)
      return true
    })
  })
}

test('cancelamento de consulta é preservado para descartar respostas de navegação anterior', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Abortado', 'AbortError')), { once: true })))
  const controller = new AbortController()
  const pending = loadReportDraft('token', id, controller.signal)
  controller.abort()
  await assert.rejects(pending, { name: 'AbortError' })
})
