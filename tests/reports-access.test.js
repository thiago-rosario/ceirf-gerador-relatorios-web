import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessReportsRoute, getReportPermissions, getReportsRoute } from '../src/service/reports-access.js';

const makeUser = (role, overrides = {}) => ({
  id: '550e8400-e29b-41d4-a716-446655440000',
  role,
  coordination_id: 7,
  is_active: true,
  must_change_password: false,
  ...overrides,
});

const noPermissions = { create: false, search: false, review: false };

test('Viewer visualiza somente pesquisa na própria coordenação e nas demais', () => {
  for (const coordinationId of [7, 8]) {
    assert.deepEqual(getReportPermissions(makeUser('VIEWER'), coordinationId), {
      create: false, search: true, review: false,
    });
  }
});

test('Reviewer acumula criação na própria coordenação e acesso à revisão', () => {
  assert.deepEqual(getReportPermissions(makeUser('REVIEWER'), 7), {
    create: true, search: true, review: true,
  });
  assert.deepEqual(getReportPermissions(makeUser('REVIEWER'), 8), {
    create: false, search: true, review: true,
  });
});

test('Operator pode criar apenas na coordenação à qual pertence', () => {
  assert.deepEqual(getReportPermissions(makeUser('OPERATOR'), 7), {
    create: true, search: true, review: false,
  });
  assert.deepEqual(getReportPermissions(makeUser('OPERATOR'), 8), {
    create: false, search: true, review: false,
  });
});

test('Superuser possui todas as ações em qualquer coordenação válida', () => {
  for (const coordinationId of [7, 8, Number.MAX_SAFE_INTEGER]) {
    assert.deepEqual(getReportPermissions(makeUser('SUPERUSER', { coordination_id: null }), coordinationId), {
      create: true, search: true, review: true,
    });
  }
});

test('a criação compara IDs numéricos válidos sem inferir a coordenação por nome ou objeto', () => {
  const invalidIds = [undefined, null, '', '7', 'COTEC', 0, -1, 7.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1];

  for (const coordinationId of invalidIds) {
    assert.equal(getReportPermissions(makeUser('OPERATOR'), coordinationId).create, false);
    assert.equal(getReportPermissions(makeUser('SUPERUSER'), coordinationId).create, false);
    assert.equal(getReportPermissions(makeUser('REVIEWER', { coordination_id: coordinationId }), 7).create, false);
  }

  assert.equal(getReportPermissions(makeUser('OPERATOR', {
    coordination_id: null,
    coordination: { id: 7, code: 'COTEC', name: 'Coordenação Técnica' },
  }), 7).create, false);
});

test('pesquisa é global para todo usuário autenticado pronto, inclusive sem coordenação', () => {
  for (const role of ['OPERATOR', 'VIEWER', 'REVIEWER', 'SUPERUSER', 'ROLE_UNKNOWN', undefined]) {
    for (const coordinationId of [undefined, null, 7, 8]) {
      assert.equal(getReportPermissions(makeUser(role, { coordination_id: null }), coordinationId).search, true);
      assert.equal(canAccessReportsRoute(makeUser(role, { coordination_id: null }), getReportsRoute('/relatorios/pesquisar')), true);
    }
  }
});

test('revisão autoriza somente a entrada da tela para Reviewer e Superuser', () => {
  for (const role of ['REVIEWER', 'SUPERUSER']) {
    assert.equal(getReportPermissions(makeUser(role), null).review, true);
    assert.equal(canAccessReportsRoute(makeUser(role), getReportsRoute('/relatorios/coordenacoes/8/revisao')), true);
  }

  for (const role of ['OPERATOR', 'VIEWER', 'USER', 'SUPER_USER', 'reviewer', 'superuser', undefined]) {
    const permissions = getReportPermissions(makeUser(role), 7);
    assert.equal(permissions.review, false);
    if (role !== 'OPERATOR') assert.equal(permissions.create, false);
  }
});

test('nenhuma ação aparece enquanto as permissões estão sendo carregadas', () => {
  for (const role of ['OPERATOR', 'VIEWER', 'REVIEWER', 'SUPERUSER']) {
    const user = makeUser(role);
    assert.deepEqual(getReportPermissions(user, 7, true), noPermissions);

    for (const path of ['/relatorios', '/relatorios/pesquisar', '/relatorios/coordenacoes/7', '/relatorios/coordenacoes/7/novo', '/relatorios/coordenacoes/7/revisao']) {
      assert.equal(canAccessReportsRoute(user, getReportsRoute(path), true), false);
    }
  }
});

test('usuário ausente, inativo, incompleto ou com troca de senha pendente não acessa relatórios', () => {
  const invalidUsers = [
    undefined, null, {},
    makeUser('SUPERUSER', { id: undefined }),
    makeUser('SUPERUSER', { id: null }),
    makeUser('SUPERUSER', { id: 1 }),
    makeUser('SUPERUSER', { id: '' }),
    makeUser('SUPERUSER', { id: '   ' }),
    makeUser('SUPERUSER', { is_active: false }),
    makeUser('SUPERUSER', { is_active: undefined }),
    makeUser('SUPERUSER', { is_active: 'true' }),
    makeUser('SUPERUSER', { must_change_password: true }),
    makeUser('SUPERUSER', { must_change_password: undefined }),
    makeUser('SUPERUSER', { must_change_password: null }),
    makeUser('SUPERUSER', { must_change_password: 0 }),
  ];

  for (const user of invalidUsers) {
    assert.deepEqual(getReportPermissions(user, 7), noPermissions);
    assert.equal(canAccessReportsRoute(user, getReportsRoute('/relatorios')), false);
    assert.equal(canAccessReportsRoute(user, getReportsRoute('/relatorios/coordenacoes/7/novo')), false);
    assert.equal(canAccessReportsRoute(user, getReportsRoute('/relatorios/coordenacoes/7/revisao')), false);
  }
});

test('identifica a seleção de coordenação pelo ID estável da URL', () => {
  assert.deepEqual(getReportsRoute('/relatorios'), { screen: 'list' });
  assert.deepEqual(getReportsRoute('/relatorios/pesquisar'), { screen: 'search' });
  assert.deepEqual(getReportsRoute('/relatorios/coordenacoes/7'), { screen: 'actions', coordinationId: 7 });
  assert.deepEqual(getReportsRoute('/relatorios/coordenacoes/7/novo'), { screen: 'create', coordinationId: 7 });
  assert.deepEqual(getReportsRoute('/relatorios/coordenacoes/8/revisao'), { screen: 'review', coordinationId: 8 });
  assert.deepEqual(getReportsRoute(`/relatorios/coordenacoes/${Number.MAX_SAFE_INTEGER}`), {
    screen: 'actions', coordinationId: Number.MAX_SAFE_INTEGER,
  });
});

test('rejeita IDs inválidos e caminhos desconhecidos sem aceitar aliases por nome', () => {
  for (const coordinationId of ['0', '-1', '01', '7.1', '+7', '7e0', 'COTEC', 'NaN', 'Infinity', '9007199254740992', '%37']) {
    for (const suffix of ['', '/novo', '/revisao']) {
      assert.equal(getReportsRoute(`/relatorios/coordenacoes/${coordinationId}${suffix}`), null);
    }
  }

  for (const path of [null, undefined, 7, {}, '/dashboard', '/relatorios-extra', '/relatorios/', '/relatorios/novo', '/relatorios/coordenacoes', '/relatorios/coordenacoes/7/', '/relatorios/coordenacoes/7/pesquisar', '/relatorios/coordenacoes/7/novo/extra', '/relatorios/coordenacoes/7?nome=COTEC']) {
    assert.equal(getReportsRoute(path), null);
  }
});

test('protege acesso direto à criação conforme role e coordenação selecionada', () => {
  const ownRoute = getReportsRoute('/relatorios/coordenacoes/7/novo');
  const otherRoute = getReportsRoute('/relatorios/coordenacoes/8/novo');

  for (const role of ['OPERATOR', 'REVIEWER']) {
    assert.equal(canAccessReportsRoute(makeUser(role), ownRoute), true);
    assert.equal(canAccessReportsRoute(makeUser(role), otherRoute), false);
  }

  assert.equal(canAccessReportsRoute(makeUser('SUPERUSER'), ownRoute), true);
  assert.equal(canAccessReportsRoute(makeUser('SUPERUSER'), otherRoute), true);
  assert.equal(canAccessReportsRoute(makeUser('VIEWER'), ownRoute), false);
  assert.equal(canAccessReportsRoute(makeUser('VIEWER'), otherRoute), false);
});

test('protege acesso direto à revisão e permite abrir ações de qualquer coordenação', () => {
  const reviewRoute = getReportsRoute('/relatorios/coordenacoes/8/revisao');
  const actionsRoute = getReportsRoute('/relatorios/coordenacoes/8');

  for (const role of ['OPERATOR', 'VIEWER', 'REVIEWER', 'SUPERUSER']) {
    assert.equal(canAccessReportsRoute(makeUser(role), actionsRoute), true);
    assert.equal(canAccessReportsRoute(makeUser(role), reviewRoute), ['REVIEWER', 'SUPERUSER'].includes(role));
  }
});

test('o guard nega rotas desconhecidas ou objetos com coordenação inválida', () => {
  const user = makeUser('SUPERUSER');
  for (const route of [null, undefined, {}, { screen: 'unknown', coordinationId: 7 }, { screen: 'create' }, { screen: 'review', coordinationId: '7' }, { screen: 'actions', coordinationId: 0 }]) {
    assert.equal(canAccessReportsRoute(user, route), false);
  }
});
