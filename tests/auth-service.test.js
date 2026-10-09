import assert from 'node:assert/strict';
import test from 'node:test';
import { authenticateUser, changePassword, findCurrentUser, logoutUser } from '../src/service/auth-service.js';

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
  ['sem estado da senha', { access_token: 'token-da-sessao', user: { ...user, must_change_password: undefined } }],
  ['com estado da senha inválido', { access_token: 'token-da-sessao', user: { ...user, must_change_password: 'false' } }],
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

for (const state of [undefined, null, 'false']) {
  test(`não restaura uma sessão quando o estado da senha é ${String(state)}`, async (t) => {
    mockSuccess(t, { user: { ...user, must_change_password: state } });

    await assert.rejects(findCurrentUser('token-da-sessao'), /validar a sessão/);
  });
}

test('mantém a troca obrigatória recebida no login e na restauração da sessão', async (t) => {
  const pendingUser = { ...user, must_change_password: true };
  const session = { access_token: 'token-da-sessao', user: pendingUser };
  mockSuccess(t, session);

  assert.deepEqual(await authenticateUser({ email: user.email, password: 'senha-temporaria' }), session);
  assert.deepEqual(await findCurrentUser('token-da-sessao'), pendingUser);
});

test('altera a senha com o Bearer atual, preserva as senhas e envia somente os campos permitidos', async (t) => {
  const fetchMock = mockSuccess(t, { user });
  const credentials = {
    current_password: ' senha temporária ',
    password: ' minha nova senha ',
    password_confirmation: ' minha nova senha ',
    must_change_password: false,
    role: 'SUPERUSER',
  };

  assert.deepEqual(await changePassword('token-da-sessao', credentials), user);

  const [url, options] = fetchMock.mock.calls[0].arguments;
  assert.equal(url, '/api/auth/change-password');
  assert.equal(options.method, 'POST');
  assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer token-da-sessao');
  assert.deepEqual(JSON.parse(options.body), {
    current_password: credentials.current_password,
    password: credentials.password,
    password_confirmation: credentials.password_confirmation,
  });
});

for (const [description, data] of [
  ['sem usuário', null],
  ['sem identificador', { user: { ...user, id: undefined } }],
  ['sem perfil da sessão', { user: { id: user.id, must_change_password: false } }],
  ['sem estado da senha', { user: { ...user, must_change_password: undefined } }],
  ['ainda com troca pendente', { user: { ...user, must_change_password: true } }],
  ['com estado da senha inválido', { user: { ...user, must_change_password: 'false' } }],
]) {
  test(`não confirma a troca de senha quando o backend responde sucesso ${description}`, async (t) => {
    mockSuccess(t, data);

    await assert.rejects(changePassword('token-da-sessao', {
      current_password: 'senha-temporaria',
      password: 'nova-senha-segura',
      password_confirmation: 'nova-senha-segura',
    }), /confirmar a alteração da senha/);
  });
}

test('propaga os erros dos campos da troca de senha para o formulário', async (t) => {
  const errors = {
    current_password: ['A senha atual está incorreta.'],
    password: ['A nova senha deve ser diferente da senha atual.'],
    password_confirmation: ['A confirmação da senha não corresponde.'],
  };
  t.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ status: 'error', errors }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  await assert.rejects(changePassword('token-da-sessao', {
    current_password: 'incorreta', password: 'senha', password_confirmation: 'outra',
  }), (error) => {
    assert.equal(error.status, 422);
    assert.deepEqual(error.errors, errors);
    return true;
  });
});

test('propaga a expiração da sessão durante a troca de senha', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify({ status: 'error', message: 'Não autenticado.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
  );

  await assert.rejects(changePassword('token-expirado', {
    current_password: 'senha-temporaria',
    password: 'nova-senha-segura',
    password_confirmation: 'nova-senha-segura',
  }), (error) => {
    assert.equal(error.status, 401);
    return true;
  });
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
