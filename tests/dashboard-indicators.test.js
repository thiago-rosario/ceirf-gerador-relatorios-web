import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { loadDashboardIndicators } from '../src/service/dashboard-indicators-service.js';

let server;
let cacheDirectory;
let SectionCards;
let ForceInspections;
let DashboardPeriodFilter;
const noop = () => {};
const render = (component, props) => renderToStaticMarkup(createElement(component, props));
const emptyIndicators = { municipalities: null, reports: null, completion: null, forces: null };
const query = (data, state = 'ready') => ({ data, state, error: null, retry: noop });
const cards = (data, indicatorState = 'ready', state = 'ready', reports = 42) => render(SectionCards, {
  metrics: { reports }, state, indicators: query(data, indicatorState),
});

before(async () => {
  cacheDirectory = await mkdtemp(join(tmpdir(), 'ceirf-indicators-test-'));
  server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)), cacheDir: cacheDirectory,
    server: { middlewareMode: true, hmr: false, watch: null, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom', logLevel: 'error',
  });
  const modules = await Promise.all([
    server.ssrLoadModule('/src/components/section-cards.tsx'),
    server.ssrLoadModule('/src/components/dashboard/ForceInspections.tsx'),
    server.ssrLoadModule('/src/components/dashboard/DashboardPeriodFilter.tsx'),
  ]);
  SectionCards = modules[0].SectionCards;
  ForceInspections = modules[1].ForceInspections;
  DashboardPeriodFilter = modules[2].DashboardPeriodFilter;
});

after(async () => {
  await server?.close();
  if (cacheDirectory) await rm(cacheDirectory, { recursive: true, force: true });
});

test('contrato ausente não dispara fetch nem inventa números ou parâmetros de API', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', () => { throw new Error('Não deve consultar uma rota presumida.'); });
  for (const period of ['7-days', '30-days', '6-months', 'all-time']) {
    assert.equal(await loadDashboardIndicators({ accessToken: 'session', period, signal: new AbortController().signal }), null);
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('serviço respeita cancelamento antes de iniciar integração', async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(loadDashboardIndicators({ accessToken: 'session', period: '30-days', signal: controller.signal }),
    (error) => error.name === 'AbortError');
});

test('filtro global apresenta as quatro opções, seleciona 30 dias e tem label associado', () => {
  const html = render(DashboardPeriodFilter, { value: '30-days', onChange: noop });
  assert.match(html, /Últimos 7 dias/);
  assert.match(html, /Últimos 30 dias/);
  assert.match(html, /Últimos 6 meses/);
  assert.match(html, /Sempre/);
  assert.match(html, /<option value="30-days" selected="">/);
  const selectId = html.match(/<select id="([^"]+)"/)?.[1];
  assert.ok(selectId);
  assert.ok(html.includes(`for="${selectId}"`));
  assert.match(html, /Período dos indicadores/);
});

test('indicadores indisponíveis não se tornam zero e total legado mantém escopo explícito', () => {
  const html = cards(null, 'unavailable');
  assert.match(html, /Municípios Visitados/);
  assert.match(html, /Taxa de Conclusão/);
  assert.equal((html.match(/aria-label="Dados indisponíveis"/g) ?? []).length, 2);
  assert.match(html, />42</);
  assert.match(html, /Todo o histórico/);
  assert.match(html, /incluindo rascunhos e revisões/);
  assert.match(html, /período global ainda não se aplica/);
  assert.doesNotMatch(html, /role="progressbar"|>0%<|Forças Vistoriadas/);
});

test('zero retornado para municípios, relatórios e conclusão é exibido como resultado real', () => {
  const html = cards({ ...emptyIndicators, municipalities: 0, reports: 0, completion: { percentage: 0, completedReports: 0, totalReports: 10 } });
  assert.equal((html.match(/>0</g) ?? []).length, 2);
  assert.match(html, />0%<\/div>/);
  assert.match(html, /role="progressbar"[^>]*aria-valuenow="0"/);
  assert.match(html, /style="width:0%"/);
  assert.match(html, /0 de 10 relatórios concluídos/);
  assert.doesNotMatch(html, /Todo o histórico|>42<|Dados indisponíveis/);
});

test('taxa e barra usam percentual fornecido sem recalcular a partir dos totais', () => {
  const html = cards({ ...emptyIndicators, completion: { percentage: 83.5, completedReports: 1, totalReports: 999 } });
  assert.match(html, /83,5%/);
  assert.match(html, /aria-valuenow="83.5"/);
  assert.match(html, /style="width:83.5%"/);
  assert.match(html, /1 de 999 relatórios concluídos/);
});

test('ausência de base válida não exibe taxa de 0% nem progresso', () => {
  const html = cards({ ...emptyIndicators, completion: { percentage: null, completedReports: 0, totalReports: 0 } });
  assert.match(html, /Sem base válida para calcular a taxa/);
  assert.doesNotMatch(html, />0%<|role="progressbar"/);
});

test('taxa pode ser exibida sem contagens opcionais e valores fora de escala não viram progresso', () => {
  const available = cards({ ...emptyIndicators, completion: { percentage: 65 } });
  assert.match(available, /65%/);
  assert.doesNotMatch(available, /de .* relatórios concluídos/);
  for (const percentage of [-1, 101, NaN, Infinity]) {
    const html = cards({ ...emptyIndicators, completion: { percentage } });
    assert.doesNotMatch(html, /role="progressbar"/);
    assert.match(html, /Sem base válida/);
  }
});

for (const state of ['loading', 'error', 'unavailable']) {
  test(`${state} oculta indicadores anteriores sem comprometer total legado`, () => {
    const html = cards({ ...emptyIndicators, municipalities: 987, reports: 876, completion: { percentage: 76 } }, state);
    assert.doesNotMatch(html, />987<|>876<|>76%<|role="progressbar"/);
    if (state === 'loading') assert.match(html, /Carregando indicador/);
    else assert.match(html, />42</);
  });
}

test('forças renderizam categorias dinâmicas, mantêm PC-PM independente e preservam zero', () => {
  const html = render(ForceInspections, { state: 'ready', forces: [
    { code: 'PC-PM', name: 'Unidade Conjugada', count: 9 },
    { code: 'NOVA', name: 'Força recebida da API', count: 0 },
  ] });
  assert.match(html, /PC-PM/);
  assert.match(html, /Unidade Conjugada/);
  assert.match(html, /NOVA/);
  assert.match(html, /Força recebida da API/);
  assert.match(html, />0<span[^>]*> vistorias/);
  assert.equal((html.match(/<li /g) ?? []).length, 2);
  assert.match(html, /<rect width="9"/);
  assert.match(html, /<rect width="0"/);
  assert.doesNotMatch(html, /Polícia Militar|Polícia Civil|Bombeiro Militar/);
});

test('forças com zero em todas as categorias preservam as linhas e escala válida', () => {
  const html = render(ForceInspections, { state: 'ready', forces: [{ code: 'ZERO', name: 'Categoria zerada', count: 0 }] });
  assert.match(html, /Categoria zerada/);
  assert.match(html, /viewBox="0 0 1 8"/);
  assert.doesNotMatch(html, /Nenhuma vistoria registrada neste período/);
});

test('distribuição vazia distingue ausência de vistorias de indisponibilidade', () => {
  const empty = render(ForceInspections, { state: 'ready', forces: [] });
  assert.match(empty, /Nenhuma vistoria registrada neste período/);
  const unavailable = render(ForceInspections, { state: 'unavailable', forces: null });
  assert.match(unavailable, /Distribuição ainda indisponível/);
  assert.doesNotMatch(unavailable, /Nenhuma vistoria registrada neste período|<li /);
});

for (const state of ['loading', 'error', 'unavailable']) {
  test(`distribuição ${state} oculta categorias e quantidades anteriores`, () => {
    const html = render(ForceInspections, { state, forces: [{ code: 'ANTIGA', name: 'Sessão anterior', count: 987 }] });
    assert.doesNotMatch(html, /ANTIGA|Sessão anterior|>987</);
    if (state === 'loading') assert.match(html, /Carregando vistorias por força/);
    if (state === 'error') assert.match(html, /Não foi possível carregar a distribuição/);
  });
}
