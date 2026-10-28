import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'
import { clearReportCatalogCache, getReportCatalog } from '../src/service/report-catalog-service.js'
import { reportFormOptions } from './fixtures/report-form-options.js'

afterEach(() => clearReportCatalogCache())

const response = (name = 'forces', options = reportFormOptions[name]) => new Response(JSON.stringify({ status: 'success', data: { [name]: options } }))

for (const name of Object.keys(reportFormOptions)) {
  test(`consulta somente o catálogo ${name} pelo seu endpoint autenticado`, async (t) => {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => response(name))
    assert.deepEqual(await getReportCatalog('session', name), reportFormOptions[name])
    assert.equal(fetchMock.mock.callCount(), 1)
    const [url, request] = fetchMock.mock.calls[0].arguments
    assert.equal(url, `/api/reports/catalogs/${name}`)
    assert.equal(request.headers.Authorization, 'Bearer session')
    assert.equal(request.method, 'GET')
  })
}

test('compartilha requisição pendente e resultado do mesmo catálogo na sessão', async (t) => {
  let complete
  const fetchMock = t.mock.method(globalThis, 'fetch', () => new Promise((resolve) => { complete = resolve }))
  const first = getReportCatalog('session', 'answers')
  const second = getReportCatalog('session', 'answers')
  assert.equal(first, second)
  assert.equal(fetchMock.mock.callCount(), 1)
  complete(response('answers'))
  assert.deepEqual(await first, reportFormOptions.answers)
  assert.deepEqual(await getReportCatalog('session', 'answers'), reportFormOptions.answers)
  assert.equal(fetchMock.mock.callCount(), 1)
})

test('cancelar um consumidor não interrompe outro consumidor da mesma consulta', async (t) => {
  let complete
  const fetchMock = t.mock.method(globalThis, 'fetch', () => new Promise((resolve) => { complete = resolve }))
  const controller = new AbortController()
  const first = getReportCatalog('session', 'forces', controller.signal)
  const second = getReportCatalog('session', 'forces')
  controller.abort()
  await assert.rejects(first, { name: 'AbortError' })
  assert.equal(fetchMock.mock.calls[0].arguments[1].signal.aborted, false)
  complete(response())
  assert.deepEqual(await second, reportFormOptions.forces)
})

test('mantém caches separados por catálogo e sessão e limpa todos ao sair', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url) => response(url.split('/').at(-1)))
  await getReportCatalog('first', 'forces')
  await getReportCatalog('first', 'answers')
  await getReportCatalog('second', 'forces')
  assert.equal(fetchMock.mock.callCount(), 3)
  await getReportCatalog('first', 'forces')
  assert.equal(fetchMock.mock.callCount(), 3)
  clearReportCatalogCache()
  await getReportCatalog('first', 'forces')
  assert.equal(fetchMock.mock.callCount(), 4)
})

test('falha de um catálogo permite retry independente sem invalidar outro já carregado', async (t) => {
  const requests = []
  let failed = false
  t.mock.method(globalThis, 'fetch', async (url) => {
    requests.push(url)
    const name = url.split('/').at(-1)
    if (name === 'typologies' && !failed) {
      failed = true
      return new Response(JSON.stringify({ message: 'Falha' }), { status: 503 })
    }
    return response(name)
  })
  await getReportCatalog('session', 'forces')
  await assert.rejects(getReportCatalog('session', 'typologies'), /servidor está indisponível/)
  assert.deepEqual(await getReportCatalog('session', 'typologies'), reportFormOptions.typologies)
  assert.deepEqual(await getReportCatalog('session', 'forces'), reportFormOptions.forces)
  assert.deepEqual(requests, ['/api/reports/catalogs/forces', '/api/reports/catalogs/typologies', '/api/reports/catalogs/typologies'])
})

test('infraestrutura e checklist compartilham o catálogo de respostas sem solicitar outros catálogos', async (t) => {
  const requests = []
  t.mock.method(globalThis, 'fetch', async (url) => {
    requests.push(url)
    return response(url.split('/').at(-1))
  })
  await Promise.all([getReportCatalog('session', 'answers'), getReportCatalog('session', 'infrastructure')])
  await Promise.all([getReportCatalog('session', 'answers'), getReportCatalog('session', 'checklist')])
  assert.deepEqual(requests, ['/api/reports/catalogs/answers', '/api/reports/catalogs/infrastructure', '/api/reports/catalogs/checklist'])
})

for (const [name, invalid] of [
  ['ausente', undefined],
  ['vazio', []],
  ['chave duplicada', [reportFormOptions.answers[0], reportFormOptions.answers[0]]],
  ['rótulo inválido', [{ key: 'question', label: null }]],
]) {
  test(`rejeita catálogo ${name} e permite recuperar a resposta correta`, async (t) => {
    let attempts = 0
    t.mock.method(globalThis, 'fetch', async () => ++attempts === 1
      ? new Response(JSON.stringify({ status: 'success', data: { answers: invalid } })) : response('answers'))
    await assert.rejects(getReportCatalog('session', 'answers'), /opções do formulário/)
    assert.deepEqual(await getReportCatalog('session', 'answers'), reportFormOptions.answers)
  })
}

test('um sinal já cancelado ou catálogo desconhecido não inicia requisição', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => response())
  await assert.rejects(getReportCatalog('session', 'forces', AbortSignal.abort()), { name: 'AbortError' })
  await assert.rejects(getReportCatalog('session', 'unknown'), /catálogo solicitado é inválido/)
  assert.equal(fetchMock.mock.callCount(), 0)
})
