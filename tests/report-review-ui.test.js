import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('fila de apresentação mostra tabela e detalhe para qualquer revisor autenticado da coordenação', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'ceirf-review-'))
  const server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), cacheDir,
    server: { middlewareMode: true, hmr: false, watch: null, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom', logLevel: 'error' })
  try {
    const { default: ReportDestination } = await server.ssrLoadModule('/src/views/ReportDestination.tsx')
    const coordination = { id: 37, code: 'COTEC', name: 'Coordenação Técnica' }
    const user = { id: 'pessoa-qualquer', name: 'Pessoa autenticada', role: 'REVIEWER', coordination_id: 37, is_active: true, must_change_password: false }
    const html = renderToStaticMarkup(createElement(ReportDestination, { screen: 'review', coordination, user, onBack: () => {} }))
    for (const text of ['Relatórios em Revisão', 'Dados mockados para apresentação', 'Vitória da Conquista', 'Buscar na fila', 'Situação', 'Informações gerais', 'Aprovar relatório', 'Solicitar correção', 'Obrigatório para solicitar correção.']) assert.ok(html.includes(text), text)
    assert.match(html, /<table/)
    assert.doesNotMatch(html, /A fila de revisão ainda não está disponível/)
    const restricted = renderToStaticMarkup(createElement(ReportDestination, { screen: 'review', coordination, user: { ...user, role: 'OPERATOR' }, onBack: () => {} }))
    assert.match(restricted, /Você não tem permissão/)
    assert.doesNotMatch(restricted, /<table|Vitória da Conquista/)
  } finally {
    await server.close()
    await rm(cacheDir, { recursive: true, force: true })
  }
})
