import assert from 'node:assert/strict';
import test from 'node:test';
import { findReport, getReportPdf, listReportMunicipalities, listReports, pdfFileName } from '../src/service/reports-service.js';

const id = '550e8400-e29b-41d4-a716-446655440000';
const otherId = '660e8400-e29b-41d4-a716-446655440000';
const municipality = { id: 7, name: 'Vitória da Conquista', state_code: 'BA' };
const report = {
  id, status: 'GENERATED', created_at: '2026-10-09T09:00:00-03:00',
  cover: { municipality, typology: 'CIPM 1B – DT 1B' },
  general_information: { inspection_date: '2025-02-13T00:00:00-03:00' },
  generated_document: { file_name: 'relatório-vistoria.pdf', generated_at: '2026-10-09T09:00:00-03:00' },
};
const pagination = { current_page: 2, per_page: 10, total: 12, last_page: 2, from: 11, to: 12 };
const pdfContent = '%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n';

const mockData = (t, data, status = 200) => t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ status: 'success', data }), {
  status, headers: { 'Content-Type': 'application/json' },
}));

test('consulta relatórios com município, tipologia e paginação sem impor coordenação de origem', async (t) => {
  const fetchMock = mockData(t, { reports: [report], pagination });
  assert.deepEqual(await listReports('token', { municipalityId: 7, typology: '  CIPM & DT  ', page: 2 }), { reports: [report], pagination });
  const [path, options] = fetchMock.mock.calls[0].arguments;
  const url = new URL(path, 'http://ceirf.local');
  assert.equal(url.pathname, '/api/reports');
  assert.deepEqual(Object.fromEntries(url.searchParams), { page: '2', per_page: '10', municipality_id: '7', typology: 'CIPM & DT' });
  assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer token');
  assert.equal(options.credentials, 'include');
});

test('limpeza dos filtros consulta a primeira página global e mantém lista vazia do backend', async (t) => {
  const empty = { reports: [], pagination: { current_page: 1, per_page: 10, total: 0, last_page: 1, from: null, to: null } };
  const fetchMock = mockData(t, empty);
  assert.deepEqual(await listReports('token'), empty);
  assert.equal(fetchMock.mock.calls[0].arguments[0], '/api/reports?page=1&per_page=10');
});

test('consulta relatório real pelo UUID e preserva os metadados recebidos', async (t) => {
  const fetchMock = mockData(t, report);
  assert.deepEqual(await findReport('token', id), report);
  assert.equal(fetchMock.mock.calls[0].arguments[0], `/api/reports/${id}`);
});

test('visualização aceita um rascunho parcial com tipologia ainda vazia e PDF ausente', async (t) => {
  const draft = { ...report, status: 'DRAFT', cover: { municipality: null, typology: '' }, general_information: { inspection_date: null }, generated_document: null };
  mockData(t, draft);
  assert.deepEqual(await findReport('token', id), draft);
});

test('identificador UUID com letras maiúsculas aceita a representação normalizada do backend', async (t) => {
  mockData(t, report);
  assert.deepEqual(await findReport('token', id.toUpperCase()), report);
});

test('metadados ausentes do legado permanecem nulos', async (t) => {
  const legacy = { ...report, cover: null, general_information: null, generated_document: null };
  mockData(t, legacy);
  assert.deepEqual(await findReport('token', id), legacy);
});

test('carrega os municípios reais do endpoint autenticado sem usar a página de relatórios como catálogo', async (t) => {
  const fetchMock = mockData(t, { municipalities: [municipality] });
  assert.deepEqual(await listReportMunicipalities('token'), [municipality]);
  assert.equal(fetchMock.mock.calls[0].arguments[0], '/api/reports/municipalities');
  assert.equal(new Headers(fetchMock.mock.calls[0].arguments[1].headers).get('Authorization'), 'Bearer token');
});

for (const [label, data, load] of [
  ['coleção sem paginação', { reports: [report] }, () => listReports('token')],
  ['total inválido', { reports: [report], pagination: { ...pagination, total: -1 } }, () => listReports('token')],
  ['município sem código de estado', { municipalities: [{ id: 7, name: 'Salvador' }] }, () => listReportMunicipalities('token')],
  ['UUID de outro relatório', { ...report, id: otherId }, () => findReport('token', id)],
  ['metadados PDF inválidos', { ...report, generated_document: {} }, () => findReport('token', id)],
]) {
  test(`rejeita resposta inválida: ${label}`, async (t) => {
    mockData(t, data);
    await assert.rejects(load(), /inválid/);
  });
}

test('rejeita filtros e UUID inválidos antes de iniciar requisições', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Não deve consultar.'); });
  for (const value of [0, -1, 1.5, '2', Number.MAX_SAFE_INTEGER + 1]) {
    await assert.rejects(listReports('token', { page: value }));
    await assert.rejects(listReports('token', { municipalityId: value }));
  }
  await assert.rejects(listReports('token', { perPage: 101 }));
  await assert.rejects(findReport('token', '../outro'));
  await assert.rejects(getReportPdf('token', '../outro'));
  assert.equal(fetchMock.mock.callCount(), 0);
});

for (const inline of [false, true]) {
  test(`recupera PDF autenticado com disposição ${inline ? 'inline' : 'attachment'} e nome UTF-8`, async (t) => {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => new Response(pdfContent, {
      headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': "attachment; filename=relatorio.pdf; filename*=UTF-8''relat%C3%B3rio-vistoria.pdf" },
    }));
    const result = await getReportPdf('token', id, { inline });
    assert.equal(result.blob.type, 'application/pdf');
    assert.equal(await result.blob.text(), pdfContent);
    assert.equal(result.fileName, 'relatório-vistoria.pdf');
    const [path, options] = fetchMock.mock.calls[0].arguments;
    assert.equal(path, `/api/reports/${id}/pdf${inline ? '?disposition=inline' : ''}`);
    assert.equal(options.credentials, 'include');
    assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer token');
    assert.ok(options.signal instanceof AbortSignal);
  });
}

test('usa nome seguro de fallback quando o servidor não envia Content-Disposition', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response(pdfContent, { headers: { 'Content-Type': 'application/pdf' } }));
  assert.equal((await getReportPdf('token', id)).fileName, `relatorio-${id}.pdf`);
  assert.equal(pdfFileName('attachment; filename="../../relatorio\nfinal.pdf"', 'fallback.pdf'), '.._.._relatorio_final.pdf');
  assert.equal(pdfFileName("attachment; filename=seguro.pdf; filename*=UTF-8''%ZZ", 'fallback.pdf'), 'seguro.pdf');
});

for (const [label, content, mime] of [
  ['HTML', '<html>Login</html>', 'text/html'],
  ['arquivo vazio', '', 'application/pdf'],
  ['assinatura ausente', 'dados desconhecidos %%EOF', 'application/pdf'],
  ['arquivo truncado', '%PDF-1.7\nobjeto sem final', 'application/pdf'],
]) {
  test(`rejeita documento inválido antes de incorporar: ${label}`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => new Response(content, { headers: { 'Content-Type': mime } }));
    await assert.rejects(getReportPdf('token', id), /PDF|corrompido|incompleto/);
  });
}

for (const status of [401, 403, 404, 409, 422, 500]) {
  test(`preserva HTTP ${status} no PDF para o tratamento de sessão, acesso e disponibilidade`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ status: 'error', message: status === 422 ? 'O PDF armazenado está inválido.' : 'Não foi possível obter este relatório.' }), {
      status, headers: { 'Content-Type': 'application/json' },
    }));
    await assert.rejects(getReportPdf('token', id), (error) => {
      assert.equal(error.status, status);
      if (status === 422) assert.match(error.message, /PDF armazenado/);
      return true;
    });
  });
}

test('cancelamento de uma página não impede uma consulta posterior com outro filtro', async (t) => {
  let requestNumber = 0;
  t.mock.method(globalThis, 'fetch', async (_, options) => {
    requestNumber += 1;
    if (requestNumber === 1) return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Abortado', 'AbortError')), { once: true }));
    return new Response(JSON.stringify({ status: 'success', data: { reports: [report], pagination } }));
  });
  const controller = new AbortController();
  const first = listReports('token', { municipalityId: 1, signal: controller.signal });
  controller.abort();
  await assert.rejects(first, { name: 'AbortError' });
  assert.equal((await listReports('token', { municipalityId: 7, page: 2 })).reports[0].id, id);
});

test('limita o tempo de carregamento do PDF e traduz timeout sem deixar a solicitação pendente', async (t) => {
  t.mock.method(globalThis, 'fetch', async (_, options) => new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Abortado', 'AbortError')), { once: true })));
  await assert.rejects(getReportPdf('token', id, { timeoutMs: 5 }), /demorou.*Tente novamente/);
});

test('traduz falha de rede do PDF sem expor o erro interno', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('ECONNREFUSED token-secreto'); });
  await assert.rejects(getReportPdf('token', id), (error) => {
    assert.match(error.message, /conectar ao servidor/);
    assert.doesNotMatch(error.message, /ECONNREFUSED|token-secreto/);
    return true;
  });
});
