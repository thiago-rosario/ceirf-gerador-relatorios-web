import assert from 'node:assert/strict';
import test from 'node:test';
import {
  listUsers, findUser, createUser, updateUser, deactivateUser,
  resetUserPassword, listRoles, listCoordinations,
} from '../src/service/users-service.js';

const accessToken = 'token-superusuario';
const coordination = { id: 2, code: 'COTEC', name: 'Coordenação técnica' };
const user = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Ana Silva',
  email: 'ana@example.com',
  role: 'REVIEWER',
  coordination_id: coordination.id,
  coordination,
  is_active: true,
  created_at: '2026-10-05T10:00:00+00:00',
  must_change_password: false,
};

function mockSuccess(t, data) {
  return t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ status: 'success', data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  }));
}

function assertRequest(fetchMock, path, method = 'GET', body) {
  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, `/api${path}`);
  assert.equal(options.method, method);
  assert.equal(new Headers(options.headers).get('Authorization'), `Bearer ${accessToken}`);
  assert.deepEqual(options.body === undefined ? undefined : JSON.parse(options.body), body);
}

test('lista usuários com filtro codificado e ordenação definidos pela API', async (t) => {
  const fetchMock = mockSuccess(t, { users: [user] });
  assert.deepEqual(await listUsers(accessToken, { filter: 'Ana & Silva', orderBy: 'ASC' }), [user]);
  assertRequest(fetchMock, '/users?filter=Ana+%26+Silva&order_by=ASC');
});

test('lista vazia permanece vazia com filtro e ordenação padrão', async (t) => {
  const fetchMock = mockSuccess(t, { users: [] });
  assert.deepEqual(await listUsers(accessToken), []);
  assertRequest(fetchMock, '/users?filter=&order_by=DESC');
});

test('consulta um usuário individual identificado pelo UUID', async (t) => {
  const fetchMock = mockSuccess(t, user);
  assert.deepEqual(await findUser(accessToken, user.id), user);
  assertRequest(fetchMock, `/users/${user.id}`);
});

test('cria usuário com email normalizado, senha literal e apenas campos aceitos pela API', async (t) => {
  const { must_change_password: omitted, ...createdUser } = user;
  assert.equal(omitted, false);
  const fetchMock = mockSuccess(t, createdUser);
  assert.deepEqual(await createUser(accessToken, {
    name: user.name,
    email: ' ANA@EXAMPLE.COM ',
    password: ' senha literal ',
    role: user.role,
    coordination_id: coordination.id,
    is_active: false,
  }), createdUser);
  assertRequest(fetchMock, '/users', 'POST', {
    name: user.name, email: user.email, password: ' senha literal ', role: user.role, coordination_id: coordination.id,
  });
});

test('preserva o perfil padrão do backend quando a criação não recebe role', async (t) => {
  const fetchMock = mockSuccess(t, user);
  await createUser(accessToken, { name: user.name, email: user.email, password: 'a', coordination_id: coordination.id });
  assertRequest(fetchMock, '/users', 'POST', { name: user.name, email: user.email, password: 'a', coordination_id: coordination.id });
});

test('edita dados e coordenação sem enviar senha ou outros campos', async (t) => {
  const { must_change_password: omitted, ...updatedUser } = user;
  assert.equal(omitted, false);
  const fetchMock = mockSuccess(t, { ...updatedUser, updated_at: user.created_at });
  await updateUser(accessToken, user.id, {
    name: user.name, email: ' ANA@EXAMPLE.COM ', role: user.role,
    password: 'não enviar', coordination_id: coordination.id, is_active: false,
  });
  assertRequest(fetchMock, `/users/${user.id}`, 'PATCH', { name: user.name, email: user.email, role: user.role, coordination_id: coordination.id });
});

test('preserva o vínculo em edição parcial omitindo a coordenação do corpo', async (t) => {
  const fetchMock = mockSuccess(t, user);
  await updateUser(accessToken, user.id, { role: user.role });
  assertRequest(fetchMock, `/users/${user.id}`, 'PATCH', { role: user.role });
});

test('cria visualizador ou superusuário com coordenação explicitamente nula', async (t) => {
  const users = ['VIEWER', 'SUPERUSER'].map((role) => ({ ...user, role, coordination_id: null, coordination: null }));
  const fetchMock = t.mock.method(globalThis, 'fetch', async (_url, options) => {
    const body = JSON.parse(options.body);
    return new Response(JSON.stringify({ status: 'success', data: users.find((item) => item.role === body.role) }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  });
  for (const withoutCoordination of users) {
    assert.deepEqual(await createUser(accessToken, {
      name: user.name, email: user.email, password: 'senha', role: withoutCoordination.role, coordination_id: null,
    }), withoutCoordination);
  }
  assert.equal(fetchMock.mock.callCount(), 2);
  for (const call of fetchMock.mock.calls) assert.equal(JSON.parse(call.arguments[1].body).coordination_id, null);
});

test('consulta usuário sem coordenação sem inventar um vínculo', async (t) => {
  const withoutCoordination = { ...user, role: 'VIEWER', coordination_id: null, coordination: null };
  mockSuccess(t, withoutCoordination);
  assert.deepEqual(await findUser(accessToken, user.id), withoutCoordination);
});

test('altera a coordenação vinculada usando o identificador numérico', async (t) => {
  const nextCoordination = { id: 3, code: 'COPROJ', name: 'Coordenação de projetos' };
  const updated = { ...user, coordination_id: nextCoordination.id, coordination: nextCoordination };
  const fetchMock = mockSuccess(t, updated);
  assert.deepEqual(await updateUser(accessToken, user.id, { coordination_id: nextCoordination.id }), updated);
  assertRequest(fetchMock, `/users/${user.id}`, 'PATCH', { coordination_id: nextCoordination.id });
});

test('remove o vínculo de visualizador enviando null explicitamente', async (t) => {
  const withoutCoordination = { ...user, role: 'VIEWER', coordination_id: null, coordination: null };
  const fetchMock = mockSuccess(t, withoutCoordination);
  assert.deepEqual(await updateUser(accessToken, user.id, { role: 'VIEWER', coordination_id: null }), withoutCoordination);
  assertRequest(fetchMock, `/users/${user.id}`, 'PATCH', { role: 'VIEWER', coordination_id: null });
});

test('mantém explícito o vínculo nulo ao promover para superusuário', async (t) => {
  const superuser = { ...user, role: 'SUPERUSER', coordination_id: null, coordination: null };
  const fetchMock = mockSuccess(t, superuser);
  await updateUser(accessToken, user.id, { role: 'SUPERUSER', coordination_id: null });
  assertRequest(fetchMock, `/users/${user.id}`, 'PATCH', { role: 'SUPERUSER', coordination_id: null });
});

test('desativa usuário no endpoint disponível sem corpo', async (t) => {
  const deactivated = { id: user.id, name: user.name, email: user.email, is_active: false };
  const fetchMock = mockSuccess(t, deactivated);
  assert.deepEqual(await deactivateUser(accessToken, user.id), deactivated);
  assertRequest(fetchMock, `/users/${user.id}/deactivate`, 'PATCH');
});

test('redefine senha pelo endpoint de autenticação sem corpo', async (t) => {
  const reset = { id: user.id, must_change_password: true };
  const fetchMock = mockSuccess(t, reset);
  assert.deepEqual(await resetUserPassword(accessToken, user.id), reset);
  assertRequest(fetchMock, `/auth/reset-password/${user.id}`, 'POST');
});

test('carrega perfis com o valor enum fornecido pelo backend', async (t) => {
  const roles = [{ id: 3, code: 'reviewer', name: 'Revisor', role: 'REVIEWER' }];
  const fetchMock = mockSuccess(t, { roles });
  assert.deepEqual(await listRoles(accessToken), roles);
  assertRequest(fetchMock, '/roles');
});

test('carrega coordenações ativas retornadas pelo backend', async (t) => {
  const coordinations = [coordination];
  const fetchMock = mockSuccess(t, { coordinations });
  assert.deepEqual(await listCoordinations(accessToken), coordinations);
  assertRequest(fetchMock, '/coordinations');
});

for (const [description, invoke, data] of [
  ['lista sem coleção', () => listUsers(accessToken), {}],
  ['lista com registro inválido', () => listUsers(accessToken), { users: [{ ...user, is_active: 'true' }] }],
  ['usuário sem estado da senha', () => findUser(accessToken, user.id), { ...user, must_change_password: undefined }],
  ['usuário de outro UUID', () => findUser(accessToken, user.id), { ...user, id: '660e8400-e29b-41d4-a716-446655440000' }],
  ['vínculo ausente', () => findUser(accessToken, user.id), { ...user, coordination_id: undefined, coordination: undefined }],
  ['identificador de coordenação em texto', () => findUser(accessToken, user.id), { ...user, coordination_id: '2' }],
  ['identificador de coordenação inválido', () => findUser(accessToken, user.id), { ...user, coordination_id: 0 }],
  ['identificador de coordenação fracionário', () => findUser(accessToken, user.id), { ...user, coordination_id: 2.5 }],
  ['objeto de coordenação ausente', () => findUser(accessToken, user.id), { ...user, coordination: null }],
  ['objeto de coordenação incompatível', () => listUsers(accessToken), { users: [{ ...user, coordination: { ...coordination, id: 3 } }] }],
  ['objeto de coordenação incompleto', () => findUser(accessToken, user.id), { ...user, coordination: { id: coordination.id } }],
  ['objeto em vínculo nulo', () => findUser(accessToken, user.id), { ...user, coordination_id: null }],
  ['criação sem usuário', () => createUser(accessToken, { name: user.name, email: user.email, password: 'senha' }), null],
  ['desativação ainda ativa', () => deactivateUser(accessToken, user.id), { ...user, is_active: true }],
  ['reset sem troca pendente', () => resetUserPassword(accessToken, user.id), { id: user.id, must_change_password: false }],
  ['perfil sem valor enum', () => listRoles(accessToken), { roles: [{ id: 1, code: 'reviewer', name: 'Revisor' }] }],
  ['coordenações sem coleção', () => listCoordinations(accessToken), {}],
  ['coordenação disponível inválida', () => listCoordinations(accessToken), { coordinations: [{ ...coordination, id: -1 }] }],
]) {
  test(`rejeita resposta inválida: ${description}`, async (t) => {
    mockSuccess(t, data);
    await assert.rejects(invoke, /resposta inválida/);
  });
}

for (const status of [401, 403]) {
  test(`preserva o erro de autorização ${status} nos fluxos de usuários e coordenações`, async (t) => {
    t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
      status: 'error', message: 'Acesso não autorizado.',
    }), { status, headers: { 'Content-Type': 'application/json' } }));
    for (const invoke of [
      () => listUsers(accessToken), () => findUser(accessToken, user.id), () => listCoordinations(accessToken),
      () => createUser(accessToken, { name: user.name, email: user.email, password: 'senha', coordination_id: coordination.id }),
      () => updateUser(accessToken, user.id, { coordination_id: coordination.id }),
    ]) await assert.rejects(invoke, (error) => error.status === status);
  });
}

test('preserva erros de validação da coordenação inexistente ou inválida retornados pelo backend', async (t) => {
  const errors = { coordination_id: ['A coordenação selecionada não está disponível.'], email: 'Este email já foi cadastrado.' };
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({
    status: 'error', message: 'Dados inválidos.', errors,
  }), { status: 422, headers: { 'Content-Type': 'application/json' } }));
  for (const invoke of [
    () => createUser(accessToken, { name: user.name, email: user.email, password: 'senha', coordination_id: 999 }),
    () => updateUser(accessToken, user.id, { coordination_id: 999 }),
  ]) await assert.rejects(invoke, (error) => {
    assert.equal(error.status, 422);
    assert.deepEqual(error.errors, errors);
    return true;
  });
});

test('rejeita identificadores inválidos antes de chamar o backend', async (t) => {
  const fetchMock = mockSuccess(t, user);
  for (const invoke of [findUser, deactivateUser, resetUserPassword]) {
    await assert.rejects(invoke(accessToken, '../auth/logout'), /identificador/);
  }
  await assert.rejects(updateUser(accessToken, '1', { name: user.name }), /identificador/);
  assert.equal(fetchMock.mock.callCount(), 0);
});
