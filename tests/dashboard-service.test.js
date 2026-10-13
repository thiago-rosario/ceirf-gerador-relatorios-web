import assert from 'node:assert/strict';
import test from 'node:test';
import { dashboardMonths, loadDashboard } from '../src/service/dashboard-service.js';

const id = '550e8400-e29b-41d4-a716-446655440000';
const otherId = '660e8400-e29b-41d4-a716-446655440000';
const today = new Date('2026-10-13T12:00:00-03:00');
const report = {
  id, status: 'GENERATED', created_at: '2026-10-09T09:00:00-03:00', created_by: 'author-uuid', coordination_id: 2,
  cover: { municipality: { id: 7, name: 'Vitória da Conquista', state_code: 'BA' }, typology: 'CIPM 1B' },
  general_information: { inspection_date: '2025-02-13T00:00:00-03:00' },
  generated_document: { file_name: 'relatório.pdf', generated_at: '2026-10-09T09:00:00-03:00' },
};
const draft = { ...report, id: otherId, status: 'DRAFT', created_at: '2026-10-01T09:00:00-03:00', generated_document: null };
const json = (data, status = 200) => new Response(JSON.stringify({ status: status === 200 ? 'success' : 'error', data, message: 'Falha na solicitação.' }), {
  status, headers: { 'Content-Type': 'application/json' },
});

function mockDashboard(t, { data = { total_reports: 2, reports: [draft, report] }, responses = {} } = {}) {
  return t.mock.method(globalThis, 'fetch', async (path) => {
    const url = new URL(path, 'http://ceirf.local');
    const key = url.pathname + url.search;
    if (responses[key]) return responses[key]();
    if (url.pathname === '/api/reports/dashboard') return json(data);
    if (url.pathname === '/api/coordinations') return json({ coordinations: [{ id: 2, code: 'COTEC', name: 'Coordenação Técnica' }] });
    if (url.pathname === '/api/reports/count-by-month') {
      const month = url.searchParams.get('month');
      return json({ month, counts: month === '2026-10' ? [{ month, count: 2 }] : [] });
    }
    throw new Error(`Rota inesperada: ${path}`);
  });
}

const load = () => loadDashboard({ accessToken: 'token-real', signal: new AbortController().signal, today });

test('consome os contratos reais autenticados, sem atribuir totais de registros a vistorias ou autores fictícios', async (t) => {
  const fetchMock = mockDashboard(t);
  const data = await load();
  assert.deepEqual(data.metrics, { municipalities: null, forces: null, reports: 2 });
  assert.deepEqual(data.recentReports.map((value) => value.id), [id, otherId]);
  assert.equal(data.recentReports[0].coordination, 'COTEC');
  assert.equal(data.recentReports[0].author, null);
  assert.equal(data.recentReports[0].date, report.created_at);
  assert.equal(data.recentReports[0].viewHref, `/relatorios/${id}`);
  assert.equal(data.recentReports[0].hasPdf, true);
  assert.equal(data.recentReports[1].hasPdf, false);
  assert.equal(data.recentReports[0].downloadHref, undefined);
  assert.equal(data.inspectionPeriods['6-months'].at(-1).inspections, 2);
  assert.equal(fetchMock.mock.callCount(), 14);
  for (const [path, options] of fetchMock.mock.calls.map((call) => call.arguments)) {
    assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer token-real');
    assert.equal(options.credentials, 'include');
    assert.equal(options.method, 'GET');
    assert.ok(options.signal instanceof AbortSignal);
    assert.doesNotMatch(path, /\/users/);
  }
});

test('os períodos seguem o calendário da Bahia, incluindo a virada de ano', () => {
  const periods = dashboardMonths(new Date('2026-01-01T01:00:00Z'));
  assert.equal(periods['12-months'][0], '2025-01');
  assert.equal(periods['12-months'].at(-1), '2025-12');
  assert.equal(periods['current-year'].length, 12);
  assert.deepEqual(dashboardMonths(new Date('2026-01-01T04:00:00Z'))['current-year'], ['2026-01']);
});

test('preserva zero e a ausência real de relatórios, sem usar um fallback demonstrativo', async (t) => {
  mockDashboard(t, { data: { total_reports: 0, reports: [] }, responses: {
    '/api/reports/count-by-month?month=2026-10': () => json({ month: '2026-10', counts: [] }),
  } });
  const data = await load();
  assert.equal(data.metrics.reports, 0);
  assert.deepEqual(data.recentReports, []);
  assert.ok(data.inspectionPeriods['12-months'].every((point) => point.inspections === 0));
  assert.deepEqual(data.notices, []);
});

test('falha em um mês desabilita apenas períodos incompletos sem produzir um zero falso', async (t) => {
  mockDashboard(t, { responses: { '/api/reports/count-by-month?month=2026-01': () => json(null, 500) } });
  const data = await load();
  assert.equal(data.metrics.reports, 2);
  assert.equal(data.recentReports.length, 2);
  assert.equal(data.inspectionPeriods['6-months'].length, 6);
  assert.equal(data.inspectionPeriods['12-months'], undefined);
  assert.equal(data.inspectionPeriods['current-year'], undefined);
  assert.match(data.notices.join(' '), /períodos incompletos/);
});

test('catálogo indisponível preserva relatórios reais e identifica nomes desconhecidos', async (t) => {
  mockDashboard(t, { responses: { '/api/coordinations': () => json(null, 404) } });
  const data = await load();
  assert.equal(data.metrics.reports, 2);
  assert.equal(data.recentReports[0].coordination, null);
  assert.match(data.notices.join(' '), /coordenações/);
});

for (const path of ['/api/reports/dashboard', '/api/coordinations', '/api/reports/count-by-month?month=2026-10']) {
  for (const status of [401, 403]) {
    test(`propaga HTTP ${status} de ${path} para o tratamento de sessão`, async (t) => {
      mockDashboard(t, { responses: { [path]: () => json(null, status) } });
      await assert.rejects(load(), (error) => error.status === status);
    });
  }
}

test('dashboard não publicado propaga 404 sem apresentar dados parciais como dashboard integrado', async (t) => {
  mockDashboard(t, { responses: { '/api/reports/dashboard': () => json(null, 404) } });
  await assert.rejects(load(), (error) => error.status === 404);
});

for (const [label, data] of [
  ['total negativo', { total_reports: -1, reports: [] }],
  ['coleção ausente', { total_reports: 2 }],
  ['UUID inválido', { total_reports: 1, reports: [{ ...report, id: '../forged' }] }],
  ['relatório duplicado', { total_reports: 2, reports: [report, report] }],
  ['município malformado', { total_reports: 1, reports: [{ ...report, cover: { municipality: { name: 'Salvador' }, typology: '' } }] }],
  ['documento inválido', { total_reports: 1, reports: [{ ...report, generated_document: {} }] }],
]) {
  test(`rejeita dados inválidos: ${label}`, async (t) => {
    mockDashboard(t, { data });
    await assert.rejects(load(), /inválid/);
  });
}

test('contagem de mês diferente não é associada silenciosamente ao período solicitado', async (t) => {
  mockDashboard(t, { responses: { '/api/reports/count-by-month?month=2026-10': () => json({ month: '2026-09', counts: [{ month: '2026-09', count: 100 }] }) } });
  const data = await load();
  assert.deepEqual(data.inspectionPeriods, {});
  assert.match(data.notices.join(' '), /períodos incompletos/);
});

test('cancelamento não devolve dados da sessão anterior', async (t) => {
  mockDashboard(t);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(loadDashboard({ accessToken: 'token', signal: controller.signal, today }), (error) => error.name === 'AbortError');
});
