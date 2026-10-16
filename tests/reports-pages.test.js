import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const id = '550e8400-e29b-41d4-a716-446655440000';
const report = {
  id, status: 'GENERATED', created_at: '2026-10-09',
  cover: { municipality: { id: 7, name: 'Vitória da Conquista', state_code: 'BA' }, typology: 'CIPM 1B – DT 1B' },
  general_information: { inspection_date: '2025-02-13' },
  generated_document: { file_name: 'relatorio.pdf', generated_at: '2026-10-09' },
};
const noop = () => {};
const user = { id, role: 'VIEWER', coordination_id: null, is_active: true, must_change_password: false };
let server;
let cacheDirectory;
let SearchReports;
let ViewReport;
let ReportsTable;
let ReportInformation;
let ReportPdfViewer;
let ReportPagination;
let MunicipalityPicker;

before(async () => {
  cacheDirectory = await mkdtemp(join(tmpdir(), 'ceirf-reports-pages-'));
  server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    cacheDir: cacheDirectory,
    server: { middlewareMode: true, hmr: false, watch: null, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom', logLevel: 'error',
  });
  const modules = await Promise.all([
    server.ssrLoadModule('/src/views/SearchReports.tsx'),
    server.ssrLoadModule('/src/views/ViewReport.tsx'),
    server.ssrLoadModule('/src/components/reports/ReportsTable.tsx'),
    server.ssrLoadModule('/src/components/reports/ReportPdfViewer.tsx'),
    server.ssrLoadModule('/src/components/reports/ReportPagination.tsx'),
    server.ssrLoadModule('/src/components/reports/MunicipalityPicker.tsx'),
  ]);
  SearchReports = modules[0].default;
  ViewReport = modules[1].default;
  ReportInformation = modules[1].ReportInformation;
  ReportsTable = modules[2].ReportsTable;
  ReportPdfViewer = modules[3].ReportPdfViewer;
  ReportPagination = modules[4].ReportPagination;
  MunicipalityPicker = modules[5].MunicipalityPicker;
});

after(async () => {
  await server?.close();
  if (cacheDirectory) await rm(cacheDirectory, { recursive: true, force: true });
});

const render = (Component, props) => renderToStaticMarkup(createElement(Component, props));
const common = { accessToken: 'token', search: '', onNavigate: noop, onSessionInvalid: noop, refreshUser: async () => user };

test('pesquisa apresenta filtros e aplica a tipologia nos exemplos locais durante a apresentação', () => {
  const html = render(SearchReports, { ...common, search: '?typology=DEAM+1B&page=3' });
  assert.match(html, /<h1[^>]*>Pesquisar Relatório<\/h1>/);
  assert.match(html, /relatórios de todas as coordenações/);
  assert.match(html, /Município|Pleito \/ Tipologia/);
  assert.match(html, /value="DEAM 1B"/);
  assert.match(html, /Limpar Filtro/);
  assert.match(html, /Dados de apresentação/);
  assert.match(html, /Nenhum relatório encontrado/);
  assert.doesNotMatch(html, /Vitória da Conquista|Bom Jesus da Serra|DEAM 1B.*13\/02/);
});

test('pesquisa sem filtros mostra exemplos com links de visualização e PDFs disponíveis', () => {
  const html = render(SearchReports, common);
  assert.match(html, /Salvador|Camaçari|Ilhéus/);
  assert.match(html, /dece0000-0000-4000-8000-000000000001/);
  assert.match(html, /Visualizar|Baixar/);
});

test('visualização do exemplo abre PDF estático e rascunho exibe conteúdo sem habilitar download', () => {
  const completed = render(ViewReport, { ...common, reportId: 'dece0000-0000-4000-8000-000000000001', user });
  assert.match(completed, /presentation\/relatorio-exemplo-1.pdf/);
  assert.match(completed, /Concluído/);
  assert.doesNotMatch(completed, /Carregando informações do relatório/);
  const draft = render(ViewReport, { ...common, reportId: 'dece0000-0000-4000-8000-000000000004', user });
  assert.match(draft, /Em elaboração/);
  assert.match(draft, /Conclusão técnica/);
  assert.doesNotMatch(draft, /<iframe|Continuar preenchimento/);
});

test('contexto visual da coordenação mantém texto da pesquisa global e botão de retorno às ações', () => {
  const html = render(SearchReports, { ...common, coordination: { id: 2, code: 'COTEC', name: 'Coordenação Técnica' }, search: '?coordination_id=2' });
  assert.match(html, /COTEC/);
  assert.match(html, /Coordenação Técnica/);
  assert.match(html, /<h2[^>]*>Pesquisar Relatório<\/h2>/);
  assert.match(html, /href="\/relatorios\/coordenacoes\/2"/);
  assert.match(html, /relatórios de todas as coordenações/);
});

test('rota de visualização mantém título e retorno à pesquisa filtrada durante consulta dos metadados', () => {
  const returnTo = '/relatorios/pesquisar?municipality_id=7&page=3';
  const html = render(ViewReport, { ...common, reportId: id, search: `?${new URLSearchParams({ return_to: returnTo })}` });
  assert.match(html, /Visualizar Relatório/);
  assert.match(html, /Carregando informações do relatório/);
  assert.match(html, /href="\/relatorios\/pesquisar\?municipality_id=7&amp;page=3"/);
  assert.doesNotMatch(html, /<iframe/);
});

test('tabela apresenta dados reais recebidos, ações pelo UUID e pesquisa anterior nos links', () => {
  const html = render(ReportsTable, { reports: [report], isLoading: false, searchHref: '/relatorios/pesquisar?municipality_id=7&page=3', busyId: null, onNavigate: noop, onDownload: noop });
  for (const value of ['Vitória da Conquista', '13/02/2025', 'CIPM 1B – DT 1B', 'Visualizar', 'Baixar']) assert.ok(html.includes(value));
  assert.match(html, new RegExp(`href="/relatorios/${id}\\?return_to=`));
  assert.match(html, /return_to=%2Frelatorios%2Fpesquisar%3Fmunicipality_id%3D7%26page%3D3/);
  assert.match(html, /hidden md:block/);
  assert.match(html, /md:hidden/);
  assert.match(html, /<article/);
});

test('tabela vazia oferece orientação sem habilitar ações inexistentes', () => {
  const html = render(ReportsTable, { reports: [], isLoading: false, searchHref: '/relatorios/pesquisar', busyId: null, onNavigate: noop, onDownload: noop });
  assert.match(html, /role="status"/);
  assert.match(html, /Nenhum relatório encontrado/);
  assert.match(html, /Limpe o filtro/);
  assert.doesNotMatch(html, /<table|Visualizar|Baixar/);
});

test('download indisponível e download em andamento exibem feedback e desabilitam novas solicitações', () => {
  const props = { reports: [report], isLoading: false, searchHref: '/relatorios/pesquisar', busyId: report.id, onNavigate: noop, onDownload: noop };
  assert.match(render(ReportsTable, props), /Baixando…/);
  const html = render(ReportsTable, { ...props, reports: [{ ...report, generated_document: null }], busyId: null });
  assert.match(html, /PDF ainda indisponível/);
  assert.match(html, /disabled=""/);
});

test('barra de informações apresenta UUID, município, tipologia e data recebidos', () => {
  const html = render(ReportInformation, { report });
  for (const value of [id, 'Vitória da Conquista', 'CIPM 1B – DT 1B', '13/02/2025']) assert.ok(html.includes(value));
  assert.match(html, /<dl/);
  assert.doesNotMatch(html, /2025-CTC-00015|Bom Jesus da Serra/);
});

for (const [label, props, expected] of [
  ['carregamento', { available: true, error: null }, /Carregando PDF/],
  ['arquivo ainda indisponível', { available: false, error: null }, /PDF deste relatório ainda não está disponível/],
  ['arquivo não encontrado', { available: true, error: new Error('Arquivo não encontrado.') }, /Arquivo não encontrado/],
  ['PDF corrompido', { available: true, error: new Error('O PDF parece estar corrompido.') }, /PDF parece estar corrompido/],
  ['tempo excedido', { available: true, error: new Error('O servidor demorou para responder.') }, /demorou para responder/],
]) {
  test(`visualizador oferece feedback e recuperação: ${label}`, () => {
    const html = render(ReportPdfViewer, { ...props, title: 'Documento', onRetry: noop });
    assert.match(html, expected);
    assert.match(html, /role="status"|role="alert"/);
    assert.doesNotMatch(html, /<iframe/);
  });
}

test('visualizador incorpora somente URL Blob autenticada com controles nativos e título acessível', () => {
  const html = render(ReportPdfViewer, { available: true, error: null, url: 'blob:http://ceirf.local/pdf-id', title: 'PDF de Vitória da Conquista', onRetry: noop });
  assert.match(html, /<iframe[^>]*title="PDF de Vitória da Conquista"/);
  assert.match(html, /src="blob:http:\/\/ceirf.local\/pdf-id#toolbar=1&amp;navpanes=1"/);
  assert.match(html, /min-h-\[440px\]/);
  assert.doesNotMatch(html, /storage|Bearer|token/);
});

test('paginação mostra página atual, navegação e lacunas sem montar todas as páginas', () => {
  const html = render(ReportPagination, { pagination: { current_page: 10, per_page: 10, total: 500, last_page: 50, from: 91, to: 100 }, onPage: noop });
  assert.match(html, /aria-current="page"/);
  assert.match(html, /Página 10 de 50/);
  assert.match(html, /Primeira página|Página anterior|Próxima página|Última página/);
  assert.equal((html.match(/<button/g) ?? []).length, 9);
  assert.equal(render(ReportPagination, { pagination: { current_page: 1, per_page: 10, total: 0, last_page: 1, from: null, to: null }, onPage: noop }), '');
});

test('paginação não oferece páginas inexistentes quando uma URL antiga ultrapassa a última página', () => {
  const html = render(ReportPagination, { pagination: { current_page: 100, per_page: 10, total: 23, last_page: 3, from: null, to: null }, onPage: noop });
  assert.doesNotMatch(html, /aria-label="Página (99|100|101)"/);
  for (const page of [1, 2, 3]) assert.match(html, new RegExp(`aria-label="Página ${page}"`));
  assert.match(html, /A página 100 não possui resultados. Última página disponível: 3./);
  assert.doesNotMatch(html, /aria-current="page"/);
});

test('paginação fora dos limites oferece retorno à primeira página mesmo com apenas uma página disponível', () => {
  const html = render(ReportPagination, { pagination: { current_page: 100, per_page: 10, total: 1, last_page: 1, from: null, to: null }, onPage: noop });
  assert.match(html, /aria-label="Página 1"/);
  assert.match(html, /Primeira página/);
  assert.doesNotMatch(html, /aria-label="Página 99"/);
});

test('seleção de município oferece busca textual acessível e mantém a opção selecionada', () => {
  const html = render(MunicipalityPicker, { municipalities: [report.cover.municipality], value: 7, onChange: noop });
  assert.match(html, /role="combobox"/);
  assert.match(html, /value="Vitória da Conquista"/);
  assert.match(html, /aria-label="Município"/);
  assert.match(html, /Exibir municípios|Remover município/);
});
