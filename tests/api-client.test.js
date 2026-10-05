import assert from 'node:assert/strict';
import test from 'node:test';
import { request } from '../src/service/api-client.js';

function mockJsonResponse(t, payload, status = 200) {
  return t.mock.method(globalThis, 'fetch', async () =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

test('envia as credenciais como JSON e retorna os dados da sessão', async (t) => {
  const credentials = { email: 'ana@example.com', password: 'senha com espaços' };
  const session = { access_token: 'token-da-sessao', user: { id: 'user-id', name: 'Ana' } };
  const fetchMock = mockJsonResponse(t, { status: 'success', data: session });

  assert.deepEqual(await request('/auth/login', { method: 'POST', body: credentials }), session);

  const [url, options] = fetchMock.mock.calls[0].arguments;
  const headers = new Headers(options.headers);
  assert.equal(url, '/api/auth/login');
  assert.equal(options.method, 'POST');
  assert.deepEqual(JSON.parse(options.body), credentials);
  assert.equal(headers.get('Accept'), 'application/json');
  assert.equal(headers.get('Content-Type'), 'application/json');
  assert.equal(headers.get('Authorization'), null);
});

test('envia o token Bearer nas consultas autenticadas sem criar corpo', async (t) => {
  const user = { id: 'user-id', email: 'ana@example.com' };
  const fetchMock = mockJsonResponse(t, { status: 'success', data: { user } });

  assert.deepEqual(await request('/auth/me', { accessToken: 'token-da-sessao' }), { user });

  const [url, options] = fetchMock.mock.calls[0].arguments;
  const headers = new Headers(options.headers);
  assert.equal(url, '/api/auth/me');
  assert.equal(options.method, 'GET');
  assert.equal(options.body, undefined);
  assert.equal(headers.get('Authorization'), 'Bearer token-da-sessao');
  assert.equal(headers.get('Accept'), 'application/json');
});

test('aceita sucesso sem dados de retorno no logout', async (t) => {
  mockJsonResponse(t, { status: 'success', data: null });

  assert.equal(await request('/auth/logout', { method: 'POST', accessToken: 'token-da-sessao' }), null);
});

test('preserva a mensagem de credenciais inválidas recebida do backend', async (t) => {
  mockJsonResponse(t, { status: 'error', message: 'Credenciais inválidas.' }, 401);

  await assert.rejects(request('/auth/login'), (error) => {
    assert.ok(error instanceof Error);
    assert.equal(error.status, 401);
    assert.equal(error.message, 'Credenciais inválidas.');
    return true;
  });
});

test('mantém os erros de validação por campo com uma mensagem de orientação em português', async (t) => {
  const errors = { email: ['The email field is required.'], password: ['The password field is required.'] };
  mockJsonResponse(t, { message: 'The email field is required. (and 1 more error)', errors }, 422);

  await assert.rejects(request('/auth/login'), (error) => {
    assert.equal(error.status, 422);
    assert.deepEqual(error.errors, errors);
    assert.match(error.message, /dados|campos|preench|verifi/i);
    assert.doesNotMatch(error.message, /The email field/);
    return true;
  });
});

test('orienta o usuário a aguardar quando o limite de tentativas é atingido', async (t) => {
  mockJsonResponse(t, { message: 'Too Many Attempts.' }, 429);

  await assert.rejects(request('/auth/login'), (error) => {
    assert.equal(error.status, 429);
    assert.match(error.message, /aguarde|tentativa|tente/i);
    assert.doesNotMatch(error.message, /Too Many Attempts/);
    return true;
  });
});

test('traduz falhas de rede sem expor a exceção do fetch', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('fetch failed: ECONNREFUSED 127.0.0.1:8000');
  });

  await assert.rejects(request('/auth/login'), (error) => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /conex|servidor|rede/i);
    assert.doesNotMatch(error.message, /ECONNREFUSED|127\.0\.0\.1/);
    return true;
  });
});

test('oculta detalhes internos de erros do servidor', async (t) => {
  mockJsonResponse(t, { status: 'error', message: 'SQLSTATE[HY000]: secret database failure' }, 500);

  await assert.rejects(request('/auth/login'), (error) => {
    assert.equal(error.status, 500);
    assert.ok(error.message.length > 0);
    assert.doesNotMatch(error.message, /SQLSTATE|secret database failure/);
    return true;
  });
});

test('rejeita uma resposta HTTP 200 que não contém o contrato JSend de sucesso', async (t) => {
  mockJsonResponse(t, { access_token: 'token-fora-do-contrato' });

  await assert.rejects(request('/auth/login'), Error);
});

test('rejeita sucesso JSend sem o campo data', async (t) => {
  mockJsonResponse(t, { status: 'success' });

  await assert.rejects(request('/auth/login'), Error);
});

test('rejeita HTML recebido no lugar de uma resposta JSON', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    new Response('<html>Aplicação frontend</html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    }),
  );

  await assert.rejects(request('/auth/login'), Error);
});
