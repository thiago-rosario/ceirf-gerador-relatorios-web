import assert from 'node:assert/strict';
import test from 'node:test';
import { canManageUsers, getUsersRoute } from '../src/service/users-access.js';

const id = '550e8400-e29b-41d4-a716-446655440000';

test('permite gerenciamento somente ao superusuário sem troca de senha pendente', () => {
  assert.equal(canManageUsers({ role: 'SUPERUSER', must_change_password: false }), true);
  assert.equal(canManageUsers({ role: 'superuser', must_change_password: false }), true);
  assert.equal(canManageUsers({ role: 'SUPERUSER', must_change_password: true }), false);

  for (const role of ['OPERATOR', 'USER', 'VIEWER', 'REVIEWER', '', 'SUPER_USER']) {
    assert.equal(canManageUsers({ role, must_change_password: false }), false);
  }

  assert.equal(canManageUsers(null), false);
  assert.equal(canManageUsers({}), false);
});

test('identifica as telas de listagem, criação e edição com UUID válido', () => {
  assert.deepEqual(getUsersRoute('/usuarios'), { screen: 'list' });
  assert.deepEqual(getUsersRoute('/usuarios/novo'), { screen: 'create' });
  assert.deepEqual(getUsersRoute(`/usuarios/${id}/editar`), { screen: 'edit', id });
});

test('não interpreta caminhos desconhecidos nem identificadores inválidos como telas de usuários', () => {
  for (const path of ['/usuarios-extra', '/usuarios/1/editar', '/usuarios/novo/editar', `/usuarios/${id}`, `/usuarios/${id}/editar/extra`, '/dashboard', null]) {
    assert.equal(getUsersRoute(path), null);
  }
});
