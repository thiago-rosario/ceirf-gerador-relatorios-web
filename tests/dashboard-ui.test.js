import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let server;
let cacheDirectory;
let DataTable;
let SectionCards;
let ChartAreaInteractive;
let Home;
let dashboardDemoData;
let loadDashboardDemo;
const report = { id: '550e8400-e29b-41d4-a716-446655440000', municipality: 'Salvador', coordination: 'COTEC', author: null,
  date: '2026-10-09T09:00:00-03:00', status: 'GENERATED', hasPdf: true, viewHref: '/relatorios/550e8400-e29b-41d4-a716-446655440000' };
const noop = () => {};

before(async () => {
  cacheDirectory = await mkdtemp(join(tmpdir(), 'ceirf-dashboard-ui-'));
  server = await createServer({ root: fileURLToPath(new URL('../', import.meta.url)), cacheDir: cacheDirectory,
    server: { middlewareMode: true, hmr: false, watch: null, ws: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom', logLevel: 'error' });
  const modules = await Promise.all([
    server.ssrLoadModule('/src/components/data-table.tsx'),
    server.ssrLoadModule('/src/components/section-cards.tsx'),
    server.ssrLoadModule('/src/components/chart-area-interactive.tsx'),
    server.ssrLoadModule('/src/views/Home.jsx'),
    server.ssrLoadModule('/src/service/dashboard-demo.ts'),
  ]);
  DataTable = modules[0].DataTable;
  SectionCards = modules[1].SectionCards;
  ChartAreaInteractive = modules[2].ChartAreaInteractive;
  Home = modules[3].default;
  dashboardDemoData = modules[4].dashboardDemoData;
  loadDashboardDemo = modules[4].loadDashboardDemo;
});

after(async () => { await server?.close(); if (cacheDirectory) await rm(cacheDirectory, { recursive: true, force: true }); });
const render = (component, props) => renderToStaticMarkup(createElement(component, props));

test('tabela navega para a visualização real e oferece download autenticado somente para PDF existente', () => {
  const html = render(DataTable, { reports: [report], state: 'ready', onDownloadReport: noop });
  assert.match(html, /href="\/relatorios\/550e8400-e29b-41d4-a716-446655440000"/);
  assert.match(html, /<button[^>]*aria-label="Baixar relatório"/);
  assert.doesNotMatch(html, /href="[^"]*\/pdf|DADOS DEMONSTRATIVOS/);
  assert.match(html, />Gerado</);
  assert.doesNotMatch(html, />Aprovado</);
  assert.match(html, /Indisponível na API/);
  assert.match(html, /Criado em/);
  const draftHtml = render(DataTable, { reports: [{ ...report, status: 'DRAFT', hasPdf: false }], state: 'ready', onDownloadReport: noop });
  assert.match(draftHtml, /Em elaboração/);
  assert.doesNotMatch(draftHtml, /aria-label="Baixar relatório"/);
});

test('download pendente mostra feedback e impede solicitações duplicadas', () => {
  const html = render(DataTable, { reports: [report], state: 'ready', onDownloadReport: noop, downloadBusyId: report.id });
  assert.match(html, /<button[^>]*disabled=""[^>]*aria-label="Baixando relatório"/);
});

test('loading oculta nomes da sessão anterior e lista vazia real tem orientação adequada', () => {
  const loading = render(DataTable, { reports: [report], state: 'loading' });
  assert.match(loading, /aria-busy="true"/);
  assert.doesNotMatch(loading, /Salvador|COTEC/);
  const empty = render(DataTable, { reports: [], state: 'ready' });
  assert.match(empty, /Nenhum relatório recente/);
});

test('cards distinguem zero real de indicadores que dependem de API', () => {
  const html = render(SectionCards, { metrics: { municipalities: null, forces: null, reports: 0 }, state: 'ready' });
  assert.match(html, /Relatórios registrados/);
  assert.match(html, /Indicador depende de API específica/);
  assert.match(html, />0</);
  assert.equal((html.match(/aria-label="Dados indisponíveis"/g) ?? []).length, 2);
});

test('gráfico usa a semântica real da contagem e períodos indisponíveis ficam desabilitados', () => {
  const unavailable = render(ChartAreaInteractive, { periods: {}, state: 'ready' });
  assert.match(unavailable, /Relatórios registrados por mês/);
  assert.match(unavailable, /incluindo rascunhos e revisões/);
  assert.match(unavailable, /<select[^>]*disabled=""/);
  assert.match(unavailable, /Aguardando dados por período/);
  assert.doesNotMatch(unavailable, /Vistorias realizadas/);
  const zero = render(ChartAreaInteractive, { periods: { '6-months': [{ month: 'Out/26', inspections: 0 }] }, state: 'ready' });
  assert.match(zero, /Nenhum relatório registrado neste período/);
  assert.match(zero, /<option[^>]*value="12-months"[^>]*disabled=""/);
});

test('Home mostra os dados de apresentação imediatamente para qualquer sessão autenticada', () => {
  const html = render(Home, { accessToken: 'token', onNavigateReports: noop, onNavigateReport: noop, onSessionInvalid: noop });
  assert.match(html, /Dados de apresentação\./);
  assert.match(html, />42</);
  assert.match(html, />165</);
  assert.match(html, /Salvador|Camaçari/);
  for (const status of ['Em elaboração', 'Em revisão', 'Aprovado', 'Concluído']) assert.ok(html.includes(status));
  assert.doesNotMatch(html, /Carregando indicadores e relatórios|Indisponível na API|Indicador depende de API específica/);
});

test('Home permite usar o loader real explicitamente sem expor exemplos enquanto aguarda a sessão', () => {
  const html = render(Home, { accessToken: 'token', loadData: async () => ({ metrics: { municipalities: null, forces: null, reports: null }, inspectionPeriods: {}, recentReports: [] }), onNavigateReports: noop });
  assert.match(html, /Carregando indicadores e relatórios/);
  assert.doesNotMatch(html, /Dados de apresentação\.|Salvador/);
});

test('dados locais de apresentação estão disponíveis para qualquer usuário sem consultar a API', async (t) => {
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('A apresentação não consulta a API.'); });
  for (const accessToken of ['token-operador', 'token-editor', 'token-superusuario']) {
    const data = await loadDashboardDemo({ accessToken, signal: new AbortController().signal });
    assert.equal(data.metrics.reports, 165);
    assert.ok(data.recentReports.length >= 6);
    assert.ok(data.recentReports.every((entry) => entry.author && entry.viewHref === `/relatorios/${entry.id}`));
    assert.deepEqual(new Set(data.recentReports.map((entry) => entry.status)), new Set(['COMPLETED', 'IN_REVIEW', 'APPROVED', 'DRAFT']));
    assert.ok(data.recentReports.filter((entry) => entry.status === 'DRAFT').every((entry) => !entry.hasPdf));
    assert.ok(data.inspectionPeriods['12-months'].every((point) => point.inspections > 0));
    assert.equal(data.inspectionPeriods['12-months'].reduce((total, point) => total + point.inspections, 0), data.metrics.reports);
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test('carregamento local respeita cancelamento e cada retorno conserva os exemplos originais', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(loadDashboardDemo({ accessToken: 'token', signal: controller.signal }), (error) => error.name === 'AbortError');
  const data = await loadDashboardDemo({ accessToken: 'token', signal: new AbortController().signal });
  data.recentReports[0].author = 'Outro nome';
  assert.notEqual(dashboardDemoData.recentReports[0].author, 'Outro nome');
});
