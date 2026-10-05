import assert from 'node:assert/strict';
import test from 'node:test';
import { authenticateUser, findCurrentUser, logoutUser } from '../src/service/auth-service.js';

const user = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Ana Silva',
  email: 'ana@example.com',
  role: 'operator',
  is_active: true,
  must_change_password: false,
  created_at: '2026-10-05T10:00:00.000000Z',
};

function mockSuccess(t, data) {
  return t.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ status: 'success', data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

test('autentica pelo endpoint de login e entrega o token e o usuário recebidos', async (t) => {
  const credentials = { email: user.email, password: ' senha literal ' };
  const session = { access_token: 'token-da-sessao', user };
  const fetchMock = mockSuccess(t, session);

  assert.deepEqual(await authenticateUser(credentials), session);

  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, '/api/auth/login');
  assert.equal(options.method, 'POST');
  assert.deepEqual(JSON.parse(options.body), credentials);
  assert.equal(new Headers(options.headers).get('Authorization'), null);
});

for (const [description, data] of [
  ['sem token', { user }],
  ['com token vazio', { access_token: '', user }],
  ['sem usuário', { access_token: 'token-da-sessao' }],
]) {
  test(`não inicia uma sessão quando o backend responde sucesso ${description}`, async (t) => {
    mockSuccess(t, data);

    await assert.rejects(authenticateUser({ email: user.email, password: 'senha' }), Error);
  });
}

test('consulta o usuário atual com o token da sessão existente', async (t) => {
  const fetchMock = mockSuccess(t, { user });

  assert.deepEqual(await findCurrentUser('token-da-sessao'), user);

  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, '/api/auth/me');
  assert.equal(options.method, 'GET');
  assert.equal(options.body, undefined);
  assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer token-da-sessao');
});

test('rejeita a recuperação de uma sessão cuja resposta não identifica o usuário', async (t) => {
  mockSuccess(t, { user: null });

  await assert.rejects(findCurrentUser('token-da-sessao'), Error);
});

test('encerra somente a sessão identificada pelo Bearer enviado ao logout', async (t) => {
  const fetchMock = mockSuccess(t, null);

  await logoutUser('token-da-sessao');

  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, '/api/auth/logout');
  assert.equal(options.method, 'POST');
  assert.equal(options.body, undefined);
  assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer token-da-sessao');
});

test('propaga a rejeição do backend quando uma sessão persistida foi invalidada', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ status: 'error', message: 'Credenciais inválidas.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  await assert.rejects(findCurrentUser('token-expirado'), (error) => {
    assert.equal(error.status, 401);
    return true;
  });
});
