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
  ]);
  DataTable = modules[0].DataTable;
  SectionCards = modules[1].SectionCards;
  ChartAreaInteractive = modules[2].ChartAreaInteractive;
  Home = modules[3].default;
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

test('Home começa carregando a API sem oferecer dados ou prévias demonstrativos', () => {
  const html = render(Home, { accessToken: 'token', onNavigateReports: noop, onNavigateReport: noop, onSessionInvalid: noop });
  assert.match(html, /Carregando indicadores e relatórios/);
  assert.doesNotMatch(html, /Dados demonstrativos|Prévia dos dados do relatório/);
});
