import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const ownCoordination = { id: 2, code: 'COTEC', name: 'Coordenação Técnica' };
const otherCoordination = { id: 3, code: 'COPROJ', name: 'Coordenação de Projetos' };
const catalogue = [
  ownCoordination,
  otherCoordination,
  { id: 4, code: 'CORMAN', name: 'Coordenação de Manutenção' },
  { id: 42, code: 'NOVACOORD', name: 'Nova Coordenação' },
  { id: 43, code: '__proto__', name: 'Coordenação com código não mapeado' },
];
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
let CoordinationSelection;
let AuthContext;

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
    server.ssrLoadModule('/src/components/reports/CoordinationSelection.tsx'),
    server.ssrLoadModule('/src/context/auth-context.tsx'),
  ]);
  [CoordinationActions, Reports, ReportDestination] = modules.slice(0, 3).map((module) => module.default);
  CoordinationSelection = modules[3].CoordinationSelection;
  AuthContext = modules[4].AuthContext;
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

function coordinationLinks(html) {
  return [...html.matchAll(/<a\b[^>]*\bhref="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((href) => /^\/relatorios\/coordenacoes\/\d+$/.test(href));
}

function renderSelection(role, overrides = {}) {
  return renderToStaticMarkup(createElement(AuthContext.Provider, {
    value: { session: { access_token: 'token-da-sessao', user: makeUser(role) } },
  }, createElement(CoordinationSelection, {
    coordinations: catalogue,
    isLoading: false,
    error: null,
    onRetry: noop,
    onNavigate: noop,
    ...overrides,
  })));
}

for (const role of ['VIEWER', 'REVIEWER', 'OPERATOR', 'SUPERUSER']) {
  test(`mostra todas as coordenações do catálogo para ${role}, inclusive fora do vínculo do usuário`, () => {
    const html = renderSelection(role);

    assert.deepEqual(coordinationLinks(html), catalogue.map((coordination) => `/relatorios/coordenacoes/${coordination.id}`));
    const coordinationHeadings = [...html.matchAll(/<h2\b[^>]*>([^<]+)<\/h2>/g)]
      .map((match) => match[1]).filter((heading) => heading !== 'Pesquisa global');
    assert.deepEqual(coordinationHeadings, catalogue.map((coordination) => coordination.code));
    for (const coordination of catalogue) {
      assert.ok(html.includes(coordination.code));
      assert.ok(html.includes(coordination.name));
    }
    assert.deepEqual(actionLinks(html), ['/relatorios/pesquisar']);
    assert.match(html, /Pesquisar todos os relatórios/);
    assert.doesNotMatch(html, /href="\/relatorios\/coordenacoes\/(COTEC|COPROJ|CORMAN|NOVACOORD|__proto__)"/);
  });
}

test('usa ícone genérico para códigos desconhecidos, inclusive propriedades de protótipo', () => {
  const html = renderSelection('VIEWER', { coordinations: catalogue.slice(3) });

  assert.deepEqual(coordinationLinks(html), ['/relatorios/coordenacoes/42', '/relatorios/coordenacoes/43']);
  assert.equal((html.match(/lucide-file-text/g) ?? []).length, 2);
  assert.match(html, /NOVACOORD/);
  assert.match(html, /__proto__/);
});

test('permite pesquisa global durante o carregamento do catálogo sem renderizar coordenações', () => {
  const html = renderSelection('REVIEWER', { isLoading: true });

  assert.match(html, /role="status"/);
  assert.match(html, /Carregando coordenações/);
  assert.deepEqual(coordinationLinks(html), []);
  assert.deepEqual(actionLinks(html), ['/relatorios/pesquisar']);
  assert.match(html, /Pesquisar todos os relatórios/);
});

test('preserva catálogo vazio com pesquisa global disponível e sem cards de fallback', () => {
  const html = renderSelection('OPERATOR', { coordinations: [] });

  assert.match(html, /Nenhuma coordenação disponível no momento/);
  assert.deepEqual(coordinationLinks(html), []);
  assert.deepEqual(actionLinks(html), ['/relatorios/pesquisar']);
  assert.match(html, /Pesquisar todos os relatórios/);
  assert.doesNotMatch(html, />COTEC<|>COPROJ</);
});

for (const status of [401, 403, 500]) {
  test(`exibe erro HTTP ${status} e pesquisa global sem reduzir o catálogo à coordenação vinculada`, () => {
    const error = Object.assign(new Error('Não foi possível acessar o catálogo completo.'), { status });
    const html = renderSelection('OPERATOR', { error });

    assert.match(html, /role="alert"/);
    assert.match(html, /Tentar novamente/);
    assert.deepEqual(coordinationLinks(html), []);
    assert.deepEqual(actionLinks(html), ['/relatorios/pesquisar']);
    assert.match(html, /Pesquisar todos os relatórios/);
    assert.doesNotMatch(html, />COTEC<|>COPROJ</);
  });
}

const actionCases = [
  ['VIEWER', ownCoordination, ['search']],
  ['VIEWER', otherCoordination, ['search']],
  ['REVIEWER', ownCoordination, ['create', 'search', 'review']],
  ['REVIEWER', otherCoordination, ['search']],
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

test('não libera criação ou revisão quando outra coordenação possui o mesmo nome e código', () => {
  const sameDisplayDifferentId = { ...ownCoordination, id: otherCoordination.id };

  for (const role of ['OPERATOR', 'REVIEWER']) {
    const html = renderActions(role, sameDisplayDifferentId);

    assert.match(html, />COTEC<\/h1>/);
    assert.deepEqual(actionLinks(html), ['/relatorios/pesquisar']);
    assert.doesNotMatch(html, /Novo Relatório|Relatórios em Revisão/);
  }
});

test('não libera criação com IDs em texto, mesmo quando representam o mesmo número', () => {
  const selectedIdAsText = renderActions('OPERATOR', { ...ownCoordination, id: '2' });
  const membershipIdAsText = renderActions('OPERATOR', ownCoordination, {
    user: makeUser('OPERATOR', { coordination_id: '2' }),
  });
  const reviewerSelectedIdAsText = renderActions('REVIEWER', { ...ownCoordination, id: '2' });

  for (const html of [selectedIdAsText, membershipIdAsText, reviewerSelectedIdAsText]) {
    assert.deepEqual(actionLinks(html), ['/relatorios/pesquisar']);
    assert.doesNotMatch(html, /Novo Relatório|Relatórios em Revisão/);
  }
});

for (const coordinationId of [null, undefined, 0, '2', 2.5]) {
  test(`Reviewer com vínculo ${String(coordinationId)} mantém somente pesquisa`, () => {
    const html = renderActions('REVIEWER', ownCoordination, {
      user: makeUser('REVIEWER', { coordination_id: coordinationId, coordination: null }),
    });

    assert.deepEqual(actionLinks(html), ['/relatorios/pesquisar']);
    assert.doesNotMatch(html, /Novo Relatório|Relatórios em Revisão/);
  });
}

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
  ['REVIEWER', '/relatorios/coordenacoes/3/revisao'],
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
  ['REVIEWER', '/relatorios/coordenacoes/2/revisao'],
  ['SUPERUSER', '/relatorios/coordenacoes/3/novo'],
]) {
  test(`aguarda coordenação válida antes de liberar ${pathname} a ${role}`, () => {
    const html = renderReports(pathname, makeUser(role));

    assert.match(html, /role="status"/);
    assert.match(html, /Carregando coordenações/);
    assert.deepEqual(actionLinks(html), ['/relatorios/pesquisar']);
    assert.doesNotMatch(html, /Acesso restrito|<h3\b|coordination-heading/);
    assert.doesNotMatch(html, /A criação de relatórios ainda|A fila de revisão ainda/);
  });
}

for (const role of ['VIEWER', 'REVIEWER', 'OPERATOR', 'SUPERUSER']) {
  test(`abre seleção para ${role} com pesquisa global disponível enquanto o catálogo carrega`, () => {
    const html = renderReports('/relatorios', makeUser(role));

    assert.match(html, /Carregando coordenações/);
    assert.deepEqual(coordinationLinks(html), []);
    assert.deepEqual(actionLinks(html), ['/relatorios/pesquisar']);
    assert.match(html, /Pesquisar todos os relatórios/);
    assert.doesNotMatch(html, /Acesso restrito|>COTEC<|>COPROJ</);
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
