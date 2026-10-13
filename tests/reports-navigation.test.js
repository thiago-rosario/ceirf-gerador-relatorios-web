import assert from 'node:assert/strict';
import test from 'node:test';
import { parseReportSearch, reportDateLabel, reportReturnHref, reportSearchCorrectionHref, reportSearchHref, reportViewHref } from '../src/service/reports-navigation.js';
import { canAccessReportsRoute, getReportsRoute } from '../src/service/reports-access.js';

const id = '550e8400-e29b-41d4-a716-446655440000';

test('leitura da URL preserva município, tipologia, página e contexto visual da coordenação', () => {
  const filters = parseReportSearch('?municipality_id=7&typology=DEAM+1B&page=3&coordination_id=2');
  assert.deepEqual(filters, { municipalityId: 7, typology: 'DEAM 1B', page: 3, coordinationId: 2 });
  assert.equal(reportSearchHref(filters), '/relatorios/pesquisar?municipality_id=7&typology=DEAM+1B&page=3&coordination_id=2');
});

test('troca de página mantém filtros aplicados; pesquisa e limpeza retornam à primeira página', () => {
  const filters = parseReportSearch('?municipality_id=7&typology=DEAM+1B&page=3&coordination_id=2');
  assert.match(reportSearchHref({ ...filters, page: 4 }), /municipality_id=7&typology=DEAM\+1B&page=4&coordination_id=2$/);
  assert.equal(reportSearchHref({ ...filters, page: 1 }), '/relatorios/pesquisar?municipality_id=7&typology=DEAM+1B&coordination_id=2');
  assert.equal(reportSearchHref({ coordinationId: filters.coordinationId }), '/relatorios/pesquisar?coordination_id=2');
});

test('parâmetros inválidos retornam a valores seguros e tipologia respeita limite do contrato', () => {
  for (const value of ['0', '-1', '01', '1.5', 'NaN', 'Infinity', '9007199254740992']) {
    assert.deepEqual(parseReportSearch(`?municipality_id=${value}&page=${value}&coordination_id=${value}`), { municipalityId: null, typology: '', page: 1, coordinationId: null });
  }
  assert.equal(parseReportSearch(`?typology=${'x'.repeat(200)}`).typology.length, 100);
});

test('página fora dos limites é corrigida preservando os filtros e não repete a correção', () => {
  const filters = parseReportSearch('?municipality_id=7&typology=DEAM+1B&page=100&coordination_id=2');
  const pagination = { current_page: 100, per_page: 10, total: 23, last_page: 3, from: null, to: null };
  const corrected = reportSearchCorrectionHref(filters, pagination);
  assert.equal(corrected, '/relatorios/pesquisar?municipality_id=7&typology=DEAM+1B&page=3&coordination_id=2');
  assert.equal(reportSearchCorrectionHref(parseReportSearch(corrected.slice(corrected.indexOf('?'))), { ...pagination, current_page: 3 }), null);
  assert.equal(reportSearchCorrectionHref(filters, null), null);
});

test('página fora dos limites retorna também à primeira página quando catálogo fica vazio', () => {
  const filters = parseReportSearch('?municipality_id=7&typology=DEAM+1B&page=100&coordination_id=2');
  const pagination = { current_page: 100, per_page: 10, total: 0, last_page: 1, from: null, to: null };
  assert.equal(reportSearchCorrectionHref(filters, pagination), '/relatorios/pesquisar?municipality_id=7&typology=DEAM+1B&coordination_id=2');
  assert.equal(reportSearchCorrectionHref({ ...filters, page: 1 }, pagination), null);
});

test('visualização e retorno preservam a pesquisa completa em um destino interno', () => {
  const searchHref = '/relatorios/pesquisar?municipality_id=7&typology=DEAM+1B&page=3&coordination_id=2';
  const href = reportViewHref(id, searchHref);
  assert.equal(href.split('?')[0], `/relatorios/${id}`);
  assert.equal(reportReturnHref(href.slice(href.indexOf('?'))), searchHref);
});

test('retorno rejeita links externos, rotas inesperadas e caracteres de controle', () => {
  for (const returnTo of ['https://evil.example', '//evil.example', '/usuarios', '/relatorios/pesquisar/extra', '/relatorios/pesquisar\\evil', '/relatorios/pesquisar\n']) {
    assert.equal(reportReturnHref(`?${new URLSearchParams({ return_to: returnTo })}`), '/relatorios/pesquisar');
  }
  assert.equal(reportReturnHref('?return_to=%2Frelatorios%2Fpesquisar%3Funknown%3Dx%26page%3D2'), '/relatorios/pesquisar?page=2');
  assert.throws(() => reportViewHref('../outro'));
});

test('rota de visualização por UUID está disponível a todos os perfis autenticados ativos', () => {
  const route = getReportsRoute(`/relatorios/${id}`);
  assert.deepEqual(route, { screen: 'view', reportId: id });
  for (const role of ['SUPERUSER', 'REVIEWER', 'OPERATOR', 'VIEWER']) {
    const user = { id, role, coordination_id: null, is_active: true, must_change_password: false };
    assert.equal(canAccessReportsRoute(user, route), true);
    assert.equal(canAccessReportsRoute({ ...user, is_active: false }, route), false);
    assert.equal(canAccessReportsRoute({ ...user, must_change_password: true }, route), false);
  }
  assert.equal(getReportsRoute('/relatorios/identificador-invalido'), null);
});

test('formatação da data preserva a data de inspeção e utiliza criação apenas como fallback', () => {
  assert.equal(reportDateLabel({ general_information: { inspection_date: '2025-02-13T00:00:00Z' }, created_at: '2026-10-09' }), '13/02/2025');
  assert.equal(reportDateLabel({ general_information: null, created_at: '2026-10-09T00:00:00Z' }), '09/10/2026');
  assert.equal(reportDateLabel({ created_at: '2026-02-31' }), 'Não informada');
});
