import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { fileURLToPath } from 'node:url'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { reportFormOptions } from './fixtures/report-form-options.js'

let server
let cacheDirectory
let useReportDraft
let clearReportDraftCache
const id = '550e8400-e29b-41d4-a716-446655440000'

before(async () => {
  cacheDirectory = await mkdtemp(join(tmpdir(), 'ceirf-draft-catalogs-'))
  server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)), cacheDir: cacheDirectory,
    server: { middlewareMode: true, hmr: false, watch: null, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom', logLevel: 'error',
  })
  const module = await server.ssrLoadModule('/src/hooks/use-report-draft.ts')
  useReportDraft = module.useReportDraft
  clearReportDraftCache = module.clearReportDraftCache
})

after(async () => { await server?.close(); if (cacheDirectory) await rm(cacheDirectory, { recursive: true, force: true }) })

function draftHook() {
  clearReportDraftCache()
  const results = []
  function Harness({ capture }) {
    capture(useReportDraft('session', 2, null, () => {}))
    return null
  }
  renderToStaticMarkup(createElement(Harness, { capture: (form) => results.push(form) }))
  return results[0]
}

test('salva rascunho sem consultar ou exigir qualquer catálogo', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    status: 'success', data: { id, status: 'DRAFT', revision_number: 0, created_at: '2026-10-28T12:00:00-03:00' },
  })))
  const form = draftHook()
  form.updateDraft((draft) => ({ ...draft, conclusion: 'Texto parcial' }))
  assert.equal(await form.save(), id)
  assert.equal(fetchMock.mock.callCount(), 1)
  assert.equal(fetchMock.mock.calls[0].arguments[0], '/api/reports')
  assert.equal(fetchMock.mock.calls[0].arguments[1].method, 'POST')
})

test('não gera relatório enquanto algum catálogo obrigatório estiver ausente', (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Não deve consultar a API') })
  const form = draftHook()
  form.updateDraft((draft) => ({
    ...draft,
    cover: { municipality_id: 7, force: 'PM', size: '1B', typology: 'Texto livre', sei_number: '123' },
    general_information: { ...draft.general_information, inspection_date: '2024-01-31', collaborators: [{ id: 'collaborator', name: 'Equipe' }] },
    infrastructure: Object.fromEntries(reportFormOptions.infrastructure.map(({ key }) => [key, 'SIM'])),
    checklist: Object.fromEntries(reportFormOptions.checklist.map(({ key }) => [key, 'SIM'])),
    conclusion: 'Conclusão completa',
    assets: [{ id, kind: 'state_map', name: 'mapa.png', mimeType: 'image/png', size: 42, checksum: 'a'.repeat(64), order: 1,
      caption: '', description: '', reference: { storage_identifier: 'reports/mapa.png', file_name: 'mapa.png', mime_type: 'image/png', size_bytes: 42, checksum: 'a'.repeat(64) } }],
  }))
  const { checklist: _checklist, ...partial } = reportFormOptions
  assert.equal(form.generate(partial), null)
  assert.equal(fetchMock.mock.callCount(), 0)
})
