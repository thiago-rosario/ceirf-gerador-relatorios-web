import assert from 'node:assert/strict';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import { CHECKLIST, INFRASTRUCTURE, createCollaborator, createInstitutionalRepresentative, emptyReportDraft, getStepIssues } from '../src/service/report-form-model.js';

const titles = ['Capa', 'Informações Gerais', 'Localização do Terreno', 'Infraestrutura Existente', 'Sugestão Pré-Implantação',
  'Documentação Fotográfica', 'Anexos', 'Conclusão', 'Revisão Final'];
const id = '550e8400-e29b-41d4-a716-446655440000';
const noop = () => {};
const mediaActions = { onSelectMedia: async () => null, onRemoveMedia: noop, onRetryMedia: noop };
const render = (Component, props) => renderToStaticMarkup(createElement(Component, props));
const municipality = { id: 7, name: 'Vitória da Conquista', state_code: 'BA' };
const common = { accessToken: 'token', coordination: { id: 2, code: 'COTEC', name: 'Coordenação Técnica' }, search: '',
  onBack: noop, onNavigate: noop, onSessionInvalid: noop, refreshUser: async () => null };
let server;
let cacheDirectory;
let CreateReport;
let CoverStep;
let GeneralInformationStep;
let ConclusionStep;
let QuestionForm;
let ReviewStep;
let UploadField;
let LocationStep;
let PreImplementationStep;
let PhotographsStep;
let AttachmentDocuments;
let setTestState;

before(async () => {
  cacheDirectory = await mkdtemp(join(tmpdir(), 'ceirf-report-wizard-ui-'));
  server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)), cacheDir: cacheDirectory,
    server: { middlewareMode: true, hmr: false, watch: null, ws: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom', logLevel: 'error',
    plugins: [{
      name: 'controlled-wizard-state-for-ui-tests', enforce: 'pre',
      // Control the view's input state in this test server only; production persistence remains unchanged.
      transform(_code, path) {
        if (!path.endsWith('/src/hooks/use-report-draft.ts')) return null;
        return `import { emptyReportDraft } from '@/service/report-form-model';
          let testState = {};
          export const setTestState = (state) => { testState = state; };
          export function useReportDraft() {
            const draft = testState.draft ?? emptyReportDraft();
            return { draft, step: 0, id: null, loading: false, loadError: null, saveError: null, saving: false,
              savedAt: null, dirty: false, localFiles: draft.assets.filter((asset) => asset.file).length, generating: false,
              updateDraft() {}, selectMedia: async () => null, removeMedia() {}, retryMedia() {}, setStep() {}, retryLoad() {}, async save() { return 'draft-id'; }, async generate() { return null; }, ...testState };
          }`;
      },
    }],
  });
  const modules = await Promise.all([
    server.ssrLoadModule('/src/views/CreateReport.tsx'),
    server.ssrLoadModule('/src/components/reports/wizard/CoverStep.tsx'),
    server.ssrLoadModule('/src/components/reports/wizard/GeneralInformationStep.tsx'),
    server.ssrLoadModule('/src/components/reports/wizard/QuestionForm.tsx'),
    server.ssrLoadModule('/src/components/reports/wizard/ReviewStep.tsx'),
    server.ssrLoadModule('/src/components/reports/wizard/UploadField.tsx'),
    server.ssrLoadModule('/src/components/reports/wizard/MediaSteps.tsx'),
    server.ssrLoadModule('/src/hooks/use-report-draft.ts'),
    server.ssrLoadModule('/src/components/reports/wizard/ConclusionStep.tsx'),
  ]);
  CreateReport = modules[0].default;
  CoverStep = modules[1].CoverStep;
  GeneralInformationStep = modules[2].GeneralInformationStep;
  QuestionForm = modules[3].QuestionForm;
  ReviewStep = modules[4].ReviewStep;
  UploadField = modules[5].UploadField;
  ({ LocationStep, PreImplementationStep, PhotographsStep, AttachmentDocuments } = modules[6]);
  setTestState = modules[7].setTestState;
  ConclusionStep = modules[8].ConclusionStep;
});

after(async () => { await server?.close(); if (cacheDirectory) await rm(cacheDirectory, { recursive: true, force: true }); });

function renderWizard(step, extra = {}) {
  setTestState({ step, ...extra });
  return render(CreateReport, common);
}

function findElement(tree, predicate) {
  if (Array.isArray(tree)) return tree.map((child) => findElement(child, predicate)).find(Boolean);
  if (!tree?.props) return undefined;
  return predicate(tree) ? tree : findElement(tree.props.children, predicate);
}

test('edições de campos usam o rascunho atual e preservam mídia confirmada após o render', () => {
  const renderedDraft = emptyReportDraft();
  const reference = { storage_identifier: 'reports/midia.png', file_name: 'midia.png', mime_type: 'image/png', size_bytes: 42, checksum: 'a'.repeat(64) };
  const confirmed = { id, kind: 'state_map', name: reference.file_name, mimeType: reference.mime_type, size: reference.size_bytes,
    checksum: reference.checksum, reference, order: 1, caption: '', description: '', uploadStatus: 'success' };
  let current = { ...renderedDraft, assets: [confirmed], cover: { ...renderedDraft.cover, size: '1B' },
    general_information: { ...renderedDraft.general_information, inspection_date: '2020-01-31' } };
  const onChange = (update) => { assert.equal(typeof update, 'function'); current = update(current); };
  const props = { draft: renderedDraft, onChange, issues: [], municipalities: [], isLoading: false, error: null, onRetry: noop };
  for (const [Component, fieldId, value] of [
    [CoverStep, 'cover-force', 'PM'],
    [ConclusionStep, 'report-conclusion', 'Conclusão atualizada'],
  ]) {
    const field = findElement(Component(props), (element) => element.props.id === fieldId);
    assert.ok(field);
    field.props.onChange({ target: { value } });
    assert.equal(current.assets[0], confirmed);
  }
  assert.equal(current.cover.force, 'PM');
  assert.equal(current.cover.size, '1B');
  assert.equal(current.general_information.inspection_date, '2020-01-31');
  assert.equal(current.conclusion, 'Conclusão atualizada');
});

for (const [kind, Component, handler, field] of [
  ['photograph', () => PhotographsStep, 'onCaptionChange', 'caption'],
  ['other', () => AttachmentDocuments, 'onDescriptionChange', 'description'],
]) {
  test(`edição de ${field} acompanha a identidade local durante confirmação do UUID de ${kind}`, () => {
    const asset = { id: 'uuid-temporario', clientId: 'identidade-local-estavel', kind, name: 'arquivo.png', mimeType: 'image/png',
      size: 42, checksum: 'a'.repeat(64), order: 1, caption: 'Legenda', description: 'Descrição', uploadStatus: 'uploading' };
    const renderedDraft = { ...emptyReportDraft(), assets: [asset] };
    const reference = { storage_identifier: 'reports/midia.png', file_name: asset.name, mime_type: asset.mimeType, size_bytes: asset.size, checksum: asset.checksum };
    const confirmed = { ...asset, id, reference, uploadStatus: 'success' };
    let current = { ...renderedDraft, assets: [confirmed], conclusion: 'Conclusão editada em outra etapa' };
    const onChange = (update) => { assert.equal(typeof update, 'function'); current = update(current); };
    const props = { draft: renderedDraft, onChange, ...mediaActions };
    const previousField = findElement(Component()(props), (element) => element.type === UploadField && element.props.asset === asset);
    assert.ok(previousField);
    previousField.props[handler]('Texto digitado durante a confirmação');
    assert.equal(current.assets[0][field], 'Texto digitado durante a confirmação');
    assert.equal(current.assets[0].id, id);
    assert.equal(current.assets[0].reference, reference);
    assert.equal(current.assets[0].uploadStatus, 'success');
    assert.equal(current.conclusion, 'Conclusão editada em outra etapa');
    const nextField = findElement(Component()({ ...props, draft: current }), (element) => element.type === UploadField && element.props.asset === current.assets[0]);
    assert.equal(previousField.key, nextField.key);
  });
}

for (const [index, title] of titles.entries()) {
  test(`etapa ${index + 1} apresenta título, navegação completa e botões disponíveis com pendências`, () => {
    const html = renderWizard(index);
    assert.match(html, new RegExp(`<h2[^>]*id="report-step-heading"[^>]*>Etapa ${index + 1} de 9 – ${title}<`));
    const nav = html.match(/<nav\b[^>]*aria-label="Etapas de criação do relatório"[\s\S]*?<\/nav>/)?.[0];
    assert.ok(nav);
    assert.equal((nav.match(/<button\b/g) ?? []).length, 9);
    assert.equal((nav.match(/aria-current="step"/g) ?? []).length, 1);
    assert.doesNotMatch(nav, /disabled=/);
    for (const heading of titles) assert.ok(nav.includes(heading));
    assert.match(html, /Você pode navegar com campos pendentes/);
    assert.match(html, /Salvar e Sair/);
    if (index > 0) assert.match(html, /Anterior/);
    if (index < 8) {
      const nextButton = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].find(([button]) => button.includes('Próximo'))?.[0];
      assert.ok(nextButton);
      assert.doesNotMatch(nextButton, /disabled=/);
    } else {
      const finalize = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].find(([button]) => button.includes('Finalizar relatório'))?.[0];
      assert.ok(finalize);
      assert.match(finalize, /disabled=""/);
      assert.match(html, /não poderá ser finalizado.*campos obrigatórios, pendentes de preenchimento/);
    }
  });
}

test('capa contém os cinco campos oficiais, obrigatoriedade, limites e enums conhecidos', () => {
  const draft = emptyReportDraft();
  draft.cover = { municipality_id: 7, force: 'PM', size: '1B', typology: 'CIPM 1B', sei_number: '12345' };
  const html = render(CoverStep, { draft, onChange: noop, issues: [], municipalities: [municipality], isLoading: false, error: null, onRetry: noop });
  for (const label of ['Município', 'Força', 'Tamanho', 'Tipologia', 'Nº SEI']) assert.ok(html.includes(label));
  assert.equal((html.match(/aria-label="obrigatório"/g) ?? []).length, 5);
  assert.match(html, /value="Vitória da Conquista"/);
  assert.match(html, /<textarea[^>]*id="cover-typology"[^>]*aria-required="true"[^>]*>CIPM 1B<\/textarea>/);
  assert.match(html, /<input[^>]*id="cover-sei"[^>]*aria-required="true"/);
  assert.match(html, /aria-label="7 de 100 caracteres"/);
  assert.match(html, /aria-label="5 de 80 caracteres"/);
  for (const force of ['PM', 'PC', 'CBM', 'DPT', 'PC-PM', 'SSP']) assert.match(html, new RegExp(`<option[^>]*>${force}</option>`));
  for (const size of ['1B', '1A', '1', '1B-1B', '1B-1A', '1B-1', '1A-1A', '1A-A', '1-1', '1A-1B', 'SEM PADRÃO']) assert.match(html, new RegExp(`<option[^>]*>${size}</option>`));
});

test('capa apresenta falha no catálogo e campos pendentes sem municípios inventados', () => {
  const draft = emptyReportDraft();
  const html = render(CoverStep, { draft, onChange: noop, issues: getStepIssues(draft)[0], municipalities: [], isLoading: false,
    error: new Error('Catálogo indisponível.'), onRetry: noop });
  assert.match(html, /Catálogo indisponível/);
  assert.match(html, /Tentar novamente/);
  assert.match(html, /Selecione a força|Selecione o tamanho|Informe a tipologia|Informe o número SEI/);
  assert.doesNotMatch(html, /Vitória da Conquista|Salvador/);
});

test('informações gerais apresenta data, colaboradores e representantes estruturados na ordem esperada', () => {
  const draft = emptyReportDraft();
  draft.general_information = { ...draft.general_information, inspection_date: '2999-01-01', collaborators: [createCollaborator('Equipe COTEC')] };
  const html = render(GeneralInformationStep, { draft, onChange: noop, issues: [] });
  assert.equal((html.match(/<input\b/g) ?? []).length, 4);
  assert.equal((html.match(/<textarea\b/g) ?? []).length, 0);
  assert.ok(html.indexOf('Data da vistoria') < html.indexOf('Colaboradores presentes'));
  assert.ok(html.indexOf('Colaboradores presentes') < html.indexOf('Representantes Institucionais'));
  for (const label of ['Nome do colaborador', 'Nome do representante', 'Cargo', 'Adicionar representante']) assert.ok(html.includes(label));
  assert.match(html, /type="date"[^>]*lang="pt-BR"[^>]*max="\d{4}-\d{2}-\d{2}"/);
  assert.match(render(GeneralInformationStep, { draft: emptyReportDraft(), onChange: noop, issues: [] }), /Formato: DD\/MM\/AAAA/);
  assert.match(html, /A data deve ser válida e não pode ser futura/);
  assert.match(html, /aria-label="12 de 1000 caracteres"/);
});

test('participantes usam identidade estável para adicionar, editar e remover sem perder o rascunho atual', () => {
  const renderedDraft = emptyReportDraft();
  const collaborators = [createCollaborator('Ana'), createCollaborator('Bruno'), createCollaborator('Carla')];
  const representatives = [createInstitutionalRepresentative('Maria', 'Secretária'), createInstitutionalRepresentative('José', 'Engenheiro')];
  renderedDraft.general_information = { ...renderedDraft.general_information, collaborators, institutional_representatives: representatives };
  const confirmed = { id, kind: 'state_map', name: 'mapa.png', reference: { storage_identifier: 'reports/mapa.png' } };
  let current = { ...renderedDraft, assets: [confirmed], conclusion: 'Conclusão de outra etapa',
    general_information: { ...renderedDraft.general_information, inspection_date: '2020-01-31' } };
  const onChange = (update) => { assert.equal(typeof update, 'function'); current = update(current); };
  const section = (draft, prefix) => findElement(GeneralInformationStep({ draft, onChange, issues: [] }), (element) => element.props.prefix === prefix).props;
  const collaboratorFields = section(renderedDraft, 'collaborators');
  const representativeFields = section(renderedDraft, 'institutional_representatives');
  collaboratorFields.onRemove(collaborators[1].id);
  collaboratorFields.onEdit(collaborators[2].id, 'name', 'Carla Santos');
  collaboratorFields.onAdd();
  collaboratorFields.onAdd();
  assert.deepEqual(current.general_information.collaborators.slice(0, 2).map(({ id: key, name }) => [key, name]), [[collaborators[0].id, 'Ana'], [collaborators[2].id, 'Carla Santos']]);
  assert.equal(new Set(current.general_information.collaborators.map(({ id: key }) => key)).size, 4);
  representativeFields.onRemove(representatives[0].id);
  representativeFields.onEdit(representatives[1].id, 'position', 'Coordenador');
  assert.deepEqual(current.general_information.institutional_representatives, [{ ...representatives[1], position: 'Coordenador' }]);
  representativeFields.onAdd();
  const added = current.general_information.institutional_representatives[1];
  representativeFields.onEdit(added.id, 'name', 'Joana');
  representativeFields.onEdit(added.id, 'position', 'Diretora');
  assert.deepEqual(current.general_information.institutional_representatives[1], { ...added, name: 'Joana', position: 'Diretora' });
  assert.equal(current.assets[0], confirmed);
  assert.equal(current.general_information.inspection_date, '2020-01-31');
  assert.equal(current.conclusion, 'Conclusão de outra etapa');
  const rendered = render(GeneralInformationStep, { draft: current, onChange, issues: [] });
  assert.ok(rendered.includes(`id="collaborators-${collaborators[2].id}-name"`));
  assert.ok(rendered.includes('value="Carla Santos"'));
  assert.doesNotMatch(rendered, /value="Bruno"/);
});

test('mantém campo de colaborador e permite excluir o único representante cadastrado', () => {
  let current = emptyReportDraft();
  const onChange = (update) => { current = update(current); };
  const section = (prefix) => findElement(GeneralInformationStep({ draft: current, onChange, issues: [] }), (element) => element.props.prefix === prefix).props;
  const collaborator = current.general_information.collaborators[0];
  section('collaborators').onRemove(collaborator.id);
  assert.deepEqual(current.general_information.collaborators, [collaborator]);
  const representative = current.general_information.institutional_representatives[0];
  section('institutional_representatives').onEdit(representative.id, 'name', 'Maria');
  section('institutional_representatives').onEdit(representative.id, 'position', 'Secretária');
  section('institutional_representatives').onRemove(representative.id);
  assert.equal(current.general_information.institutional_representatives.length, 1);
  assert.equal(current.general_information.institutional_representatives[0].name, '');
  assert.equal(current.general_information.institutional_representatives[0].position, '');
});

test('representante parcial exibe erro de cargo associado ao input, sem tornar a seção vazia obrigatória', () => {
  const draft = emptyReportDraft();
  const representative = draft.general_information.institutional_representatives[0];
  representative.name = 'Maria Santos';
  const html = render(GeneralInformationStep, { draft, onChange: noop, issues: getStepIssues(draft)[1] });
  const fieldId = `institutional_representatives-${representative.id}-position`;
  assert.ok(html.includes(`id="${fieldId}-error"`));
  assert.match(html, /Informe o cargo do representante/);
  const field = html.match(new RegExp(`<input[^>]*id="${fieldId}"[^>]*>`))?.[0];
  assert.match(field, /aria-invalid="true"/);
  assert.match(field, /aria-required="true"/);
  assert.ok(field.includes(`${fieldId}-error`));
  const empty = emptyReportDraft();
  assert.ok(getStepIssues(empty)[1].every(({ field }) => !field.startsWith('institutional_representatives.')));
});

for (const [title, items, expected] of [['infraestrutura', INFRASTRUCTURE, 10], ['checklist', CHECKLIST, 20]]) {
  test(`${title} apresenta todos os ${expected} grupos obrigatórios com três respostas e progresso`, () => {
    const values = Object.fromEntries(items.map(([key], index) => [key, index === 0 ? 'NÃO' : null]));
    const html = render(QuestionForm, { items, values, prefix: title, showPending: true, onChange: noop });
    const groups = [...html.matchAll(/<fieldset\b[\s\S]*?<\/fieldset>/g)].map(([group]) => group);
    assert.equal(groups.length, expected);
    assert.equal((html.match(/type="radio"/g) ?? []).length, expected * 3);
    assert.equal((html.match(/aria-required="true"/g) ?? []).length, expected * 3);
    assert.match(html, new RegExp(`1 de ${expected} respostas preenchidas`));
    assert.match(html, new RegExp(`<progress[^>]*value="1"[^>]*max="${expected}"`));
    assert.equal((html.match(/Resposta pendente/g) ?? []).length, expected - 1);
    assert.match(html, /As pendências não impedem a navegação/);
    for (const group of groups) {
      assert.equal((group.match(/<input\b/g) ?? []).length, 3);
      assert.deepEqual([...group.matchAll(/value="([^"]+)"/g)].map((match) => match[1]), ['SIM', 'NÃO', 'NÃO SE APLICA']);
      assert.equal(new Set([...group.matchAll(/name="([^"]+)"/g)].map((match) => match[1])).size, 1);
      assert.doesNotMatch(group, /disabled=/);
    }
  });
}

test('localização distingue mapa opcional da imagem estadual obrigatória apenas para finalizar', () => {
  const html = render(LocationStep, { draft: emptyReportDraft(), onChange: noop, ...mediaActions });
  assert.match(html, /Mapa de Localização/);
  assert.match(html, /Localização do município em relação ao estado da Bahia/);
  assert.equal((html.match(/Obrigatório na finalização/g) ?? []).length, 1);
  assert.match(html, /Este arquivo será exigido para finalizar. Você pode continuar preenchendo as outras etapas/);
  assert.match(html, /Legenda automática: Localização do município em relação ao estado da Bahia/);
  assert.match(html, /PNG, JPG, JPEG ou PDF · até 25 MiB por arquivo/);
  assert.match(html, /Os arquivos selecionados são enviados ao servidor e vinculados ao relatório/);
  assert.doesNotMatch(html, /API de envio de arquivos ainda não está disponível/);
  assert.equal((html.match(/<input[^>]*type="file"/g) ?? []).length, 2);
});

test('pré-implantação apresenta legenda e observação institucional fixas sem controles para editar o texto', () => {
  const html = render(PreImplementationStep, { draft: emptyReportDraft(), onChange: noop, ...mediaActions });
  assert.match(html, /Legenda automática: Sugestão de pré-implantação COTEC/);
  assert.match(html, /A pré-implantação foi realizada com imagens de drone e não substitui o projeto de implantação/);
  assert.match(html, /Coordenação de Projetos após a realização dos estudos planialtimétricos e sondagens/);
  assert.match(html, /Opcional/);
  assert.doesNotMatch(html, /<textarea\b|contenteditable=|Obrigatório na finalização/);
});

test('upload selecionado apresenta preview, troca, remoção, figura e legenda enquanto aguarda confirmação', () => {
  const file = new File(['png-image'], 'terreno.png', { type: 'image/png' });
  const asset = { id, kind: 'photograph', name: file.name, mimeType: file.type, file, size: file.size,
    checksum: 'a'.repeat(64), order: 1, caption: 'Vista do terreno', description: '' };
  const html = render(UploadField, { title: 'Fotografia 1', asset, number: 2, editableCaption: true, onSelect: noop, onRemove: noop, onCaptionChange: noop });
  assert.match(html, /<img[^>]*alt="Vista do terreno"/);
  assert.match(html, /aria-label="Substituir terreno.png"/);
  assert.match(html, /aria-label="Remover terreno.png do relatório"/);
  assert.match(html, /Aguardando envio ao servidor/);
  assert.match(html, /Envio ainda não confirmado/);
  assert.match(html, /Figura 2/);
  assert.match(html, /value="Vista do terreno"/);
  assert.match(html, /accept=".png,.jpg,.jpeg,.pdf,image\/png,image\/jpeg,application\/pdf"/);
  assert.doesNotMatch(html, /Arquivo registrado no servidor|upload concluído/);
});

for (const [uploadStatus, expected] of [
  ['hashing', /Calculando checksum SHA-256/],
  ['uploading', /Enviando arquivo/],
  ['processing', /Processando arquivo e confirmando vínculo ao relatório/],
]) {
  test(`upload ${uploadStatus} mostra progresso e bloqueia substituição durante a operação`, () => {
    const file = new File(['png'], 'terreno.png', { type: 'image/png' });
    const asset = { id, kind: 'state_map', name: file.name, mimeType: file.type, file, size: file.size,
      checksum: 'a'.repeat(64), order: 1, caption: '', description: '', uploadStatus };
    const html = render(UploadField, { title: 'Mapa estadual', asset, onSelect: noop, onRemove: noop, onRetry: noop });
    assert.match(html, expected);
    assert.match(html, /role="status" aria-live="polite"/);
    const replace = html.match(/<button\b[^>]*aria-label="Substituir terreno.png"[^>]*>/)?.[0];
    assert.match(replace, /disabled=""/);
    assert.doesNotMatch(html, /Arquivo enviado e vinculado ao relatório|Tentar envio novamente/);
  });
}

test('arquivo recuperado mostra metadados e permite substituição e remoção', () => {
  const asset = { id, kind: 'state_map', name: 'terreno.png', mimeType: 'image/png', size: 1048576,
    checksum: 'a'.repeat(64), order: 1, caption: '', description: '',
    reference: { storage_identifier: id, file_name: 'terreno.png', mime_type: 'image/png', size_bytes: 1048576, checksum: 'a'.repeat(64) } };
  const html = render(UploadField, { title: 'Mapa estadual', asset, onSelect: noop, onRemove: noop });
  assert.match(html, /Arquivo enviado e vinculado ao relatório/);
  assert.match(html, /Arquivo registrado no servidor/);
  assert.match(html, /terreno.png/);
  assert.match(html, /Arquivo recuperado do servidor/);
  assert.doesNotMatch(html, /Referência:|550e8400-e29b-41d4-a716-446655440000/);
  assert.match(html, /1,0 MiB/);
  for (const label of ['Substituir terreno.png', 'Remover terreno.png do relatório']) {
    const button = html.match(new RegExp(`<button\\b[^>]*aria-label="${label}"[^>]*>`))?.[0];
    assert.ok(button);
    assert.doesNotMatch(button, /disabled=/);
  }
  assert.doesNotMatch(html, /dependem da API|depende da API/);
});

test('falha de upload mostra mensagem e ações de tentar novamente, substituir e remover', () => {
  const file = new File(['pdf'], 'anexo.pdf', { type: 'application/pdf' });
  const asset = { id, kind: 'other', name: file.name, mimeType: file.type, file, size: file.size,
    checksum: 'a'.repeat(64), order: 1, caption: '', description: 'Laudo técnico', uploadStatus: 'error', uploadError: 'Servidor indisponível.' };
  const html = render(UploadField, { title: 'Anexo', asset, onSelect: noop, onRemove: noop, onRetry: noop });
  assert.match(html, /role="alert" aria-live="polite"/);
  assert.match(html, /Envio não confirmado/);
  assert.match(html, /Servidor indisponível/);
  assert.match(html, /Tentar envio novamente/);
  for (const label of ['Substituir anexo.pdf', 'Remover anexo.pdf do relatório']) {
    const button = html.match(new RegExp(`<button\\b[^>]*aria-label="${label}"[^>]*>`))?.[0];
    assert.ok(button);
    assert.doesNotMatch(button, /disabled=/);
  }
  assert.doesNotMatch(html, /Arquivo enviado e vinculado ao relatório/);
});

test('fotografias mostram capacidade global e preservam ordem da numeração sem controles de reordenação', () => {
  const draft = emptyReportDraft();
  const asset = { id, kind: 'photograph', name: 'foto.pdf', mimeType: 'application/pdf', size: 120, checksum: 'b'.repeat(64), order: 5, caption: 'Vista geral', description: '' };
  draft.assets = [{ ...asset, id: 'state-map', kind: 'state_map', order: 1 }, asset];
  const html = render(PhotographsStep, { draft, onChange: noop, ...mediaActions });
  assert.match(html, /2\/20 figuras/);
  assert.match(html, /18 disponíveis/);
  assert.match(html, /Figura 2/);
  assert.match(html, /As fotografias mantêm a ordem em que foram adicionadas/);
  assert.doesNotMatch(html, /draggable=|Reordenar|Mover para cima|Mover para baixo/);
});

test('anexos dividem documentos oficiais opcionais e exigem descrição de outros documentos', () => {
  const draft = emptyReportDraft();
  draft.assets = [{ id, kind: 'other', file: new File(['pdf'], 'anexo.pdf', { type: 'application/pdf' }), name: 'anexo.pdf',
    mimeType: 'application/pdf', size: 3, checksum: 'c'.repeat(64), order: 1, caption: '', description: '' }];
  const html = render(AttachmentDocuments, { draft, onChange: noop, ...mediaActions });
  assert.match(html, /Documentos adicionais/);
  assert.match(html, /Mapa de Localização do Município|Planta Topográfica/);
  assert.match(html, /Outro documento 1|Adicionar outro documento/);
  assert.match(html, /Informe a descrição para finalizar o relatório/);
  assert.match(html, /<textarea[^>]*aria-invalid="true"/);
  assert.match(html, /Abrir PDF selecionado/);
});

test('revisão final resume as oito seções e permite corrigir qualquer uma com pendências explícitas', () => {
  const draft = emptyReportDraft();
  draft.cover = { municipality_id: 7, force: 'PM', size: '1B', typology: 'CIPM 1B', sei_number: '123' };
  draft.general_information = { ...draft.general_information, inspection_date: '2020-01-31', collaborators: [createCollaborator('Equipe técnica')],
    institutional_representatives: [createInstitutionalRepresentative('Maria Santos', 'Secretária Municipal'), createInstitutionalRepresentative('José Oliveira', 'Engenheiro Civil')] };
  draft.conclusion = 'Primeiro parágrafo.\nSegundo parágrafo.';
  const html = render(ReviewStep, { draft, issues: getStepIssues(draft), municipalities: [municipality], onSelect: noop });
  assert.equal((html.match(/<section\b/g) ?? []).length, 8);
  for (const title of titles.slice(0, 8)) assert.match(html, new RegExp(`aria-label="Editar ${title}"`));
  for (const value of ['Vitória da Conquista', 'CIPM 1B', '31/01/2020', 'Equipe técnica', 'Maria Santos', 'Secretária Municipal', 'José Oliveira', 'Engenheiro Civil', 'Primeiro parágrafo.', 'Segundo parágrafo.']) assert.ok(html.includes(value));
  assert.match(html, /pendências para finalizar/);
  assert.match(html, /Adicione a localização do município em relação ao estado da Bahia/);
  assert.match(html, /Esta revisão do formulário precede a revisão institucional/);
  assert.match(html, /Seção preenchida/);
  assert.match(html, /Sem pendências · envio opcional/);
});

test('arquivo local continua pendente na revisão e impede finalizar mesmo com campos completos', () => {
  const draft = emptyReportDraft();
  draft.cover = { municipality_id: 7, force: 'PM', size: '1B', typology: 'CIPM', sei_number: '123' };
  draft.general_information = { ...draft.general_information, inspection_date: '2020-01-31', collaborators: [createCollaborator('Equipe')] };
  draft.infrastructure = Object.fromEntries(INFRASTRUCTURE.map(([key]) => [key, 'SIM']));
  draft.checklist = Object.fromEntries(CHECKLIST.map(([key]) => [key, 'SIM']));
  draft.conclusion = 'Conclusão técnica preenchida.';
  const file = new File(['png'], 'municipio.png', { type: 'image/png' });
  draft.assets = [{ id, kind: 'state_map', file, name: file.name, mimeType: file.type, size: file.size,
    checksum: 'd'.repeat(64), order: 1, caption: '', description: '' }];
  const html = renderWizard(8, { draft });
  assert.match(html, /arquivo local, envio pendente/);
  assert.doesNotMatch(html, /API de upload indisponível/);
  const finalize = [...html.matchAll(/<button\b[^>]*>[\s\S]*?<\/button>/g)].find(([button]) => button.includes('Finalizar relatório'))?.[0];
  assert.match(finalize, /disabled=""/);
  assert.doesNotMatch(html, /Todas as seções estão preenchidas/);
});

for (const [uploadStatus, expected] of [
  ['processing', /processamento e vínculo pendentes/],
  ['error', /envio não confirmado; tente novamente/],
]) {
  test(`revisão não confirma referência retornada quando vínculo está em ${uploadStatus}`, () => {
    const draft = emptyReportDraft();
    draft.assets = [{ id, kind: 'state_map', name: 'municipio.png', mimeType: 'image/png', size: 123,
      checksum: 'a'.repeat(64), order: 1, caption: '', description: '', uploadStatus,
      reference: { storage_identifier: id, file_name: 'municipio.png', mime_type: 'image/png', size_bytes: 123, checksum: 'a'.repeat(64) } }];
    const html = render(ReviewStep, { draft, issues: getStepIssues(draft), municipalities: [], onSelect: noop });
    assert.match(html, expected);
    assert.doesNotMatch(html, /referência confirmada no servidor/);
  });
}

test('falha de salvamento mantém navegação e informa que a confirmação do servidor não ocorreu', () => {
  const html = renderWizard(1, { saveError: Object.assign(new Error('Servidor indisponível.'), { errors: { collaborators: ['Informe os colaboradores.'] } }) });
  assert.match(html, /Servidor indisponível/);
  assert.match(html, /Informe os colaboradores/);
  assert.match(html, /Tentar salvar novamente/);
  assert.match(html, /Salvamento não confirmado. Seus valores continuam nesta sessão/);
  assert.doesNotMatch(html, /Campos salvos no servidor/);
});
