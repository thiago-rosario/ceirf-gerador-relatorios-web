import assert from 'node:assert/strict'
import test from 'node:test'
import { decideReviewReport, filterReviewReports, listReviewReports } from '../src/service/report-review-service.js'

const coordination = { id: 37, code: 'COTEC', name: 'Coordenação Técnica' }
const user = { id: 'usuario-real-37', name: 'Pessoa autenticada', email: 'pessoa@example.org', role: 'REVIEWER', coordination_id: 37, is_active: true, must_change_password: false }
const storage = () => {
  const values = new Map()
  return { getItem: (key) => values.get(key), setItem: (key, value) => values.set(key, value) }
}

test('exemplos de revisão usam a coordenação recebida e funcionam para usuário sem conta demo', () => {
  const reports = listReviewReports(user, coordination, { storage: storage() })
  assert.equal(reports.length, 5)
  assert.ok(reports.every((report) => report.coordination_id === 37 && report.reference.includes('COTEC')))
  assert.equal(filterReviewReports(reports, { query: 'vitoria', status: 'ALL' }).length, 1)
  assert.equal(filterReviewReports(reports, { status: 'PENDING' }).length, 3)
})

test('aprovação e correção mudam somente os exemplos do usuário autenticado', () => {
  const local = storage()
  const reports = listReviewReports(user, coordination, { storage: local })
  assert.throws(() => decideReviewReport(user, coordination, reports[0].id, { action: 'request_changes', comment: '  ' }, { storage: local }), /comentário/)
  decideReviewReport(user, coordination, reports[0].id, { action: 'request_changes', comment: '  Complementar a conclusão.  ' }, { storage: local })
  const approved = decideReviewReport(user, coordination, reports[1].id, { action: 'approve' }, { storage: local })
  assert.equal(approved[0].status, 'CHANGES_REQUESTED')
  assert.equal(approved[0].history.at(-1).comment, 'Complementar a conclusão.')
  assert.equal(approved[1].status, 'APPROVED')
  assert.equal(listReviewReports({ ...user, id: 'outra-pessoa' }, coordination, { storage: local })[0].status, 'PENDING')
  assert.throws(() => decideReviewReport(user, coordination, reports[1].id, { action: 'approve' }, { storage: local }), /mudou de situação/)
})

test('revisão respeita role, coordenação e conta ativa; nunca recebe relatório da API', () => {
  for (const restricted of [{ ...user, role: 'OPERATOR' }, { ...user, coordination_id: 8 }, { ...user, is_active: false }]) {
    assert.throws(() => listReviewReports(restricted, coordination), /permissão/)
  }
  assert.equal(listReviewReports({ ...user, role: 'SUPERUSER', coordination_id: null }, coordination).length, 5)
  assert.throws(() => decideReviewReport(user, coordination, '550e8400-e29b-41d4-a716-446655440000', { action: 'approve' }, { storage: storage() }), /fila de apresentação/)
})
