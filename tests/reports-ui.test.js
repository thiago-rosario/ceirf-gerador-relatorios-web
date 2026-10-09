import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const ownCoordination = { id: 2, code: 'COTEC', name: 'Coordenação Técnica' };
const otherCoordination = { id: 3, code: 'COPROJ', name: 'Coordenação de Projetos' };
const noop = () => {};
const makeUser = (role, overrides = {}) => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Ana Silva',
  email: 'ana@example.com',
  role,
  coordination_id: ownCoordination.id,
  coordination: ownCoordination,
  is_active: true,
  must_change_password: false,
  ...overrides,
});

let server;
let CoordinationActions;
let Reports;
let ReportDestination;

before(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    server: { middlewareMode: true, hmr: false, watch: null, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    logLevel: 'error',
  });
  const modules = await Promise.all([
    server.ssrLoadModule('/src/views/CoordinationActions.tsx'),
    server.ssrLoadModule('/src/views/Reports.tsx'),
    server.ssrLoadModule('/src/views/ReportDestination.tsx'),
  ]);
  [CoordinationActions, Reports, ReportDestination] = modules.map((module) => module.default);
});

after(async () => {
  await server?.close();
});

function renderActions(role, coordination = ownCoordination, overrides = {}) {
  return renderToStaticMarkup(createElement(CoordinationActions, {
    coordination,
    user: makeUser(role),
    onBack: noop,
    onNavigate: noop,
    ...overrides,
  }));
}

function renderReports(pathname, user) {
  return renderToStaticMarkup(createElement(Reports, {
    pathname,
    accessToken: 'token-da-sessao',
    user,
    onBack: noop,
    onNavigate: noop,
    onSessionInvalid: noop,
    refreshUser: async () => user,
  }));
}

function actionLinks(html) {
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((href) => href === '/relatorios/pesquisar' || /\/(novo|revisao)$/.test(href));
}

const actionCases = [
  ['VIEWER', ownCoordination, ['search']],
  ['VIEWER', otherCoordination, ['search']],
  ['REVIEWER', ownCoordination, ['create', 'search', 'review']],
  ['REVIEWER', otherCoordination, ['search', 'review']],
  ['OPERATOR', ownCoordination, ['create', 'search']],
  ['OPERATOR', otherCoordination, ['search']],
  ['SUPERUSER', ownCoordination, ['create', 'search', 'review']],
  ['SUPERUSER', otherCoordination, ['create', 'search', 'review']],
];

for (const [role, coordination, actions] of actionCases) {
  test(`renderiza os cards permitidos para ${role} na coordenação ${coordination.id}`, () => {
    const html = renderActions(role, coordination);
    const hrefByAction = {
      create: `/relatorios/coordenacoes/${coordination.id}/novo`,
      search: '/relatorios/pesquisar',
      review: `/relatorios/coordenacoes/${coordination.id}/revisao`,
    };

    assert.deepEqual(actionLinks(html), actions.map((action) => hrefByAction[action]));
    assert.equal((html.match(/<h3\b/g) ?? []).length, actions.length);
    assert.match(html, /O que você deseja fazer\?/);
    assert.match(html, /Pesquise, visualize e baixe relatórios de todas as coordenações/);
    assert.doesNotMatch(html, /role="status"/);
  });
}

test('identifica a coordenação selecionada pelo código e nome recebidos, com retorno às coordenações', () => {
  const html = renderActions('SUPERUSER', otherCoordination);

  assert.match(html, /<h1\b[^>]*id="coordination-heading"[^>]*>COPROJ<\/h1>/);
  assert.match(html, /Coordenação de Projetos/);
  assert.doesNotMatch(html, /Coordenação Técnica|>COTEC<\/h1>/);
  assert.match(html, /href="\/relatorios" aria-label="Voltar para as coordenações"/);
  assert.deepEqual(actionLinks(html), [
    '/relatorios/coordenacoes/3/novo',
    '/relatorios/pesquisar',
    '/relatorios/coordenacoes/3/revisao',
  ]);
});

test('não libera criação quando outra coordenação possui o mesmo nome e código', () => {
  const sameDisplayDifferentId = { ...ownCoordination, id: otherCoordination.id };
  const html = renderActions('OPERATOR', sameDisplayDifferentId);

  assert.match(html, />COTEC<\/h1>/);
  assert.deepEqual(actionLinks(html), ['/relatorios/pesquisar']);
  assert.doesNotMatch(html, /Novo Relatório/);
});

test('não libera criação com IDs em texto, mesmo quando representam o mesmo número', () => {
  const selectedIdAsText = renderActions('OPERATOR', { ...ownCoordination, id: '2' });
  const membershipIdAsText = renderActions('OPERATOR', ownCoordination, {
    user: makeUser('OPERATOR', { coordination_id: '2' }),
  });

  for (const html of [selectedIdAsText, membershipIdAsText]) {
    assert.deepEqual(actionLinks(html), ['/relatorios/pesquisar']);
    assert.doesNotMatch(html, /Novo Relatório/);
  }
});

for (const role of ['VIEWER', 'REVIEWER', 'OPERATOR', 'SUPERUSER']) {
  test(`não renderiza cards durante o carregamento das permissões de ${role}`, () => {
    const html = renderActions(role, ownCoordination, { isLoading: true });

    assert.match(html, /role="status"/);
    assert.match(html, /Carregando permissões/);
    assert.deepEqual(actionLinks(html), []);
    assert.doesNotMatch(html, /<h3\b|Novo Relatório|Pesquisar Relatório|Relatórios em Revisão/);
  });
}

for (const [role, pathname] of [
  ['VIEWER', '/relatorios/coordenacoes/2/novo'],
  ['VIEWER', '/relatorios/coordenacoes/2/revisao'],
  ['OPERATOR', '/relatorios/coordenacoes/3/novo'],
  ['OPERATOR', '/relatorios/coordenacoes/2/revisao'],
  ['REVIEWER', '/relatorios/coordenacoes/3/novo'],
]) {
  test(`bloqueia acesso direto de ${role} a ${pathname} antes de carregar catálogo`, (t) => {
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => {
      throw new Error('Acesso negado não deve consultar o catálogo.');
    });
    const html = renderReports(pathname, makeUser(role));

    assert.match(html, /Acesso restrito/);
    assert.match(html, /role="alert"/);
    assert.doesNotMatch(html, /Carregando coordenações|coordination-heading/);
    assert.doesNotMatch(html, /A criação de relatórios ainda|A fila de revisão ainda/);
    assert.deepEqual(actionLinks(html), ['/relatorios/pesquisar']);
    assert.equal(fetchMock.mock.callCount(), 0);
  });
}

test('abre pesquisa global diretamente para Viewer sem vínculo, sem aguardar catálogo', (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => {
    throw new Error('Pesquisa global não depende do catálogo.');
  });
  const html = renderReports('/relatorios/pesquisar', makeUser('VIEWER', {
    coordination_id: null,
    coordination: null,
  }));

  assert.match(html, /<h1\b[^>]*>Pesquisar Relatório<\/h1>/);
  assert.match(html, /relatórios de todas as coordenações/);
  assert.doesNotMatch(html, /Acesso restrito|Carregando coordenações|coordination-heading/);
  assert.doesNotMatch(html, /\/coordenacoes\//);
  assert.equal(fetchMock.mock.callCount(), 0);
});

for (const pathname of ['/relatorios/coordenacoes/COTEC', '/relatorios/coordenacoes/0', '/relatorios/novo']) {
  test(`informa rota inválida para ${pathname} sem renderizar destino`, () => {
    const html = renderReports(pathname, makeUser('SUPERUSER'));

    assert.match(html, /Página não encontrada/);
    assert.match(html, /Este endereço de relatórios é inválido/);
    assert.match(html, /role="alert"/);
    assert.doesNotMatch(html, /Carregando coordenações|coordination-heading/);
    assert.doesNotMatch(html, /A criação de relatórios ainda|A fila de revisão ainda/);
  });
}

for (const [role, pathname] of [
  ['VIEWER', '/relatorios/coordenacoes/3'],
  ['OPERATOR', '/relatorios/coordenacoes/2/novo'],
  ['REVIEWER', '/relatorios/coordenacoes/3/revisao'],
  ['SUPERUSER', '/relatorios/coordenacoes/3/novo'],
]) {
  test(`aguarda coordenação válida antes de liberar ${pathname} a ${role}`, () => {
    const html = renderReports(pathname, makeUser(role));

    assert.match(html, /role="status"/);
    assert.match(html, /Carregando coordenações/);
    assert.deepEqual(actionLinks(html), []);
    assert.doesNotMatch(html, /Acesso restrito|<h3\b|coordination-heading/);
    assert.doesNotMatch(html, /A criação de relatórios ainda|A fila de revisão ainda/);
  });
}

test('o destino de revisão comunica indisponibilidade sem apresentar uma fila simulada', () => {
  const html = renderToStaticMarkup(createElement(ReportDestination, {
    screen: 'review',
    coordination: otherCoordination,
    onBack: noop,
  }));

  assert.match(html, />COPROJ<\/h1>/);
  assert.match(html, /<h2\b[^>]*>Relatórios em Revisão<\/h2>/);
  assert.match(html, /role="status"/);
  assert.match(html, /A fila de revisão ainda não está disponível/);
  assert.match(html, /relatórios que você tem permissão para revisar/);
  assert.match(html, /href="\/relatorios\/coordenacoes\/3"/);
  assert.doesNotMatch(html, /<table\b|<tbody\b|<input\b|<form\b|download=/);
});
