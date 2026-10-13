import assert from 'node:assert/strict'
import test from 'node:test'
import { createReportDraft, updateReportDraft } from '../src/service/report-draft-service.js'
import {
  ANSWERS, CHECKLIST, FORCES, INFRASTRUCTURE, MAX_FIGURES, MAX_FILE_BYTES, REPORT_SIZES, REPORT_STEPS,
  draftFieldsPayload, emptyReportDraft, figureNumber, fileMimeType, getStepIssues, hydrateReportDraft,
  orderedAssets, textLength, truncateText, validInspectionDate, validateSelectedFile,
} from '../src/service/report-form-model.js'

const id = '550e8400-e29b-41d4-a716-446655440000'
const reference = (suffix = '1') => ({
  storage_identifier: `reports/${id}/media/${id}.png`, file_name: `imagem-${suffix}.png`,
  mime_type: 'image/png', size_bytes: 42, checksum: suffix.repeat(64),
})
const asset = (kind = 'state_map', suffix = '1', order = 1) => ({
  id: `${id.slice(0, -1)}${suffix}`, kind, name: `imagem-${suffix}.png`, mimeType: 'image/png', size: 42,
  checksum: suffix.repeat(64), order, caption: '', description: '', reference: reference(suffix),
})
const filledDraft = () => {
  const draft = emptyReportDraft()
  draft.cover = { municipality_id: 7, force: 'PC-PM', size: '1B-1B', typology: 'CIPM e DT', sei_number: '123.456/2026' }
  draft.general_information = { inspection_date: '2024-02-29', collaborators: 'Equipe da vistoria' }
  draft.infrastructure = Object.fromEntries(INFRASTRUCTURE.map(([key], index) => [key, ANSWERS[index % 3]]))
  draft.checklist = Object.fromEntries(CHECKLIST.map(([key], index) => [key, ANSWERS[index % 3]]))
  draft.conclusion = 'Conclusão da avaliação técnica.\nSegundo parágrafo.'
  draft.assets = [asset()]
  return draft
}
const dtoImage = (suffix, order = 1) => ({ id: `${id.slice(0, -1)}${suffix}`, file: reference(suffix), order, caption: `Legenda ${suffix}` })
const mockData = (t, data) => t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ status: 'success', data })))

test('define nove etapas e enumera todos os itens previstos pelo contrato atual sem compartilhar estado', () => {
  assert.equal(REPORT_STEPS.length, 9)
  assert.equal(INFRASTRUCTURE.length, 10)
  assert.equal(CHECKLIST.length, 20)
  assert.deepEqual(FORCES, ['PM', 'PC', 'CBM', 'DPT', 'PC-PM', 'SSP'])
  assert.ok(REPORT_SIZES.includes('SEM PADRÃO'))
  assert.deepEqual(ANSWERS, ['SIM', 'NÃO', 'NÃO SE APLICA'])
  const first = emptyReportDraft()
  const second = emptyReportDraft()
  first.infrastructure.water_network = 'SIM'
  first.assets.push(asset())
  assert.equal(second.infrastructure.water_network, null)
  assert.equal(second.assets.length, 0)
})

test('revisão do rascunho vazio identifica todas as obrigatoriedades sem exigir arquivos opcionais', () => {
  const issues = getStepIssues(emptyReportDraft())
  assert.deepEqual(issues.map((section) => section.length), [5, 2, 1, 10, 0, 0, 20, 1])
  assert.equal(issues[2][0].field, 'state_map')
})

test('todas as seções obrigatórias completas permitem finalização sem fotos ou anexos opcionais', () => {
  assert.ok(getStepIssues(filledDraft()).every((issues) => issues.length === 0))
})

for (const [value, expected] of [
  ['2024-02-29', true], ['2023-02-29', false], ['2026-10-13', true], ['2026-10-14', false],
  ['2026-04-31', false], ['2026-00-10', false], ['2026-13-10', false], ['13/10/2026', false],
  ['2026-1-13', false], ['2026-10-13T00:00:00Z', false], ['', false],
]) {
  test(`valida a data civil e a ausência de data futura: ${value || 'vazia'}`, () => {
    assert.equal(validInspectionDate(value, '2026-10-13'), expected)
  })
}

test('validação da capa exige ID positivo e seleções pertencentes aos enums reais', () => {
  const draft = filledDraft()
  draft.cover.municipality_id = -1
  draft.cover.force = 'PMBA'
  draft.cover.size = 'GRANDE'
  assert.deepEqual(getStepIssues(draft)[0].map(({ field }) => field), ['municipality_id', 'force', 'size'])
})

test('limites de caracteres contam caracteres Unicode como o mb_strlen do backend', () => {
  assert.equal(textLength('A😀ç'), 3)
  assert.equal(truncateText('A😀ç', 2), 'A😀')
  const draft = filledDraft()
  draft.cover.typology = '😀'.repeat(100)
  draft.cover.sei_number = 'ç'.repeat(80)
  draft.general_information.collaborators = '😀'.repeat(1000)
  assert.equal(getStepIssues(draft)[0].length, 0)
  assert.equal(getStepIssues(draft)[1].length, 0)
  draft.cover.typology += 'A'
  draft.cover.sei_number += 'B'
  draft.general_information.collaborators += 'C'
  assert.deepEqual(getStepIssues(draft)[0].map(({ field }) => field), ['typology', 'sei_number'])
  assert.equal(getStepIssues(draft)[1][0].field, 'collaborators')
})

test('conclusão respeita limite de 3.000 caracteres Unicode sem perder os parágrafos no payload', () => {
  const draft = filledDraft()
  draft.conclusion = `${'😀'.repeat(1499)}\n${'ç'.repeat(1500)}`
  assert.equal(textLength(draft.conclusion), 3000)
  assert.equal(getStepIssues(draft)[7].length, 0)
  assert.equal(draftFieldsPayload(draft).conclusion.content, draft.conclusion)
  draft.conclusion += 'A'
  assert.ok(getStepIssues(draft)[7].some(({ message }) => /3\.000 caracteres/.test(message)))
  draft.conclusion = '   \n'
  assert.ok(getStepIssues(draft)[7].some(({ message }) => /Preencha a conclusão/.test(message)))
})

for (const [name, type] of [['mapa.PNG', 'image/png'], ['foto.jpg', 'image/jpeg'], ['foto.JPEG', 'image/jpeg'], ['planta.pdf', 'application/pdf']]) {
  test(`aceita formato autorizado com até 5 MB e infere MIME quando vazio: ${name}`, () => {
    assert.equal(validateFile({ name, type, size: MAX_FILE_BYTES }), null)
    assert.equal(validateFile({ name, type: '', size: 1 }), null)
    assert.equal(fileMimeType({ name, type: '' }), type)
  })
}

function validateFile(file) {
  // Using the same public validator as the upload component avoids requiring a browser for metadata checks.
  return validateSelectedFile(file)
}

test('rejeita arquivo vazio, acima do tamanho, extensão não permitida e MIME divergente', () => {
  assert.match(validateFile({ name: 'vazio.png', type: 'image/png', size: 0 }), /vazio/)
  assert.match(validateFile({ name: 'grande.png', type: 'image/png', size: MAX_FILE_BYTES + 1 }), /5 MB/)
  assert.match(validateFile({ name: 'mapa.svg', type: 'image/svg+xml', size: 42 }), /PNG, JPG, JPEG ou PDF/)
  assert.match(validateFile({ name: 'mapa.png', type: 'application/pdf', size: 42 }), /PNG, JPG, JPEG ou PDF/)
})

test('arquivo obrigatório selecionado continua pendente enquanto seu envio não foi confirmado', () => {
  const draft = filledDraft()
  draft.assets = [{ ...asset(), reference: undefined, file: new File(['imagem'], 'mapa.png', { type: 'image/png' }) }]
  const issues = getStepIssues(draft)[2]
  assert.equal(issues.length, 1)
  assert.equal(issues[0].field, draft.assets[0].id)
  assert.match(issues[0].message, /aguardando envio ao servidor/)
})

test('revisão informa arquivo inválido e duplicidade de conteúdo entre diferentes seções', () => {
  const draft = filledDraft()
  draft.assets.push({ ...asset('photograph'), id: `${id.slice(0, -1)}2`, reference: undefined, file: new File(['pdf'], 'fotografia.gif', { type: 'image/gif' }) })
  const issues = getStepIssues(draft)[5]
  assert.ok(issues.some(({ message }) => /duplicado/.test(message)))
  assert.ok(issues.some(({ message }) => /PNG, JPG, JPEG ou PDF/.test(message)))
  assert.ok(issues.some(({ message }) => /aguardando envio/.test(message)))
})

test('o limite global inclui mapas, fotografias, pré-implantação e documentos anexos', () => {
  const draft = filledDraft()
  draft.assets = Array.from({ length: MAX_FIGURES }, (_, index) => {
    const checksum = index.toString(16).padStart(64, '0')
    return { ...asset(index === 0 ? 'state_map' : index < 10 ? 'photograph' : 'other'), id: `figura-${index}`, checksum, caption: 'Vista do terreno', description: 'Documento complementar' }
  })
  assert.ok(getStepIssues(draft).every((issues) => issues.length === 0))
  draft.assets.push({ ...asset('pre_implementation'), checksum: 'f'.repeat(64) })
  assert.ok(getStepIssues(draft)[5].some(({ message }) => /no máximo 20 figuras/.test(message)))
})

test('fotografia sem legenda gera pendência e texto preenchido resolve a obrigatoriedade', () => {
  const draft = filledDraft()
  draft.assets.push(asset('photograph', '2'))
  assert.ok(getStepIssues(draft)[5].some(({ message }) => /informe a legenda/.test(message)))
  draft.assets[1].caption = '   '
  assert.ok(getStepIssues(draft)[5].some(({ message }) => /informe a legenda/.test(message)))
  draft.assets[1].caption = 'Vista frontal do terreno'
  assert.equal(getStepIssues(draft)[5].length, 0)
})

test('outros documentos exigem descrição e mantêm limites de 500 para legenda e descrição', () => {
  const draft = filledDraft()
  draft.assets.push(asset('other', '2'))
  assert.ok(getStepIssues(draft)[6].some(({ message }) => /informe a descrição/.test(message)))
  draft.assets[1].description = 'ç'.repeat(500)
  draft.assets[1].caption = '😀'.repeat(500)
  assert.equal(getStepIssues(draft)[6].length, 0)
  draft.assets[1].description += 'A'
  assert.ok(getStepIssues(draft)[6].some(({ message }) => /até 500/.test(message)))
})

test('payload parcial normaliza ausências e preserva anexos remotos sem inventar referências locais', () => {
  const draft = emptyReportDraft()
  draft.assets = [asset('municipality_map', '1'), asset('topographic_plan', '2'), { ...asset('other', '3'), description: 'Certidão' },
    { ...asset('photograph', '4'), reference: undefined, file: new File(['foto'], 'foto.png', { type: 'image/png' }) }]
  draft.cover.sei_number = '  '
  const payload = draftFieldsPayload(draft)
  assert.deepEqual(payload.cover, { municipality_id: null, force: null, size: null, typology: '', sei_number: null })
  assert.deepEqual(payload.general_information, { inspection_date: null, collaborators: '' })
  assert.equal(payload.attachments.municipality_location_map.file, draft.assets[0].reference)
  assert.equal(payload.attachments.topographic_plan.file, draft.assets[1].reference)
  assert.equal(payload.attachments.others[0].description, 'Certidão')
  assert.deepEqual(Object.keys(payload.attachments.others[0]), ['id', 'file', 'description'])
  assert.deepEqual(payload.location, { location_map: null, municipality_in_state_map: null })
  assert.deepEqual(payload.pre_implementation, { image: null })
  assert.deepEqual(payload.photographic_documentation, { images: [] })
  assert.equal(JSON.stringify(payload).includes('foto.png'), false)
  assert.equal(draft.cover.sei_number, '  ')
})

test('modelo e serviço omitem anexos na criação e preservam todos ao atualizar o checklist', async (t) => {
  const draft = filledDraft()
  draft.assets.push({ ...asset('other', '2'), description: 'Documento existente' })
  const payload = draftFieldsPayload(draft)
  const fetchMock = mockData(t, { id, status: 'DRAFT', revision_number: 0, created_at: '2026-10-13T10:00:00-03:00' })
  await createReportDraft('token', 2, payload)
  await updateReportDraft('token', id, payload)
  const createBody = JSON.parse(fetchMock.mock.calls[0].arguments[1].body)
  const updateBody = JSON.parse(fetchMock.mock.calls[1].arguments[1].body)
  assert.deepEqual(Object.keys(createBody.attachments), ['checklist'])
  assert.equal(createBody.location, undefined)
  assert.equal(createBody.pre_implementation, undefined)
  assert.equal(createBody.photographic_documentation, undefined)
  assert.deepEqual(updateBody.location.municipality_in_state_map.file, draft.assets[0].reference)
  assert.equal(updateBody.attachments.others.length, 1)
  assert.equal(updateBody.attachments.others[0].file.storage_identifier, draft.assets[1].reference.storage_identifier)
  assert.equal(updateBody.attachments.others[0].description, 'Documento existente')
})

test('PATCH serializa mapas e fotos remotas com identidade e ordem originais, permitindo editar legenda e remover arquivo', async (t) => {
  const draft = hydrateReportDraft({
    location: { location_map: dtoImage('1'), municipality_in_state_map: dtoImage('2') },
    pre_implementation: { image: dtoImage('3') },
    photographic_documentation: { images: [dtoImage('4', 7), dtoImage('8', 2)] },
    attachments: { municipality_location_map: { ...dtoImage('5'), type: 'MUNICIPALITY_LOCATION_MAP' },
      topographic_plan: { ...dtoImage('6'), type: 'TOPOGRAPHIC_PLAN' }, others: [{ ...dtoImage('7'), type: 'OTHER', description: 'Certidão' }] },
    uploaded_images: [dtoImage('4', 7), dtoImage('8', 2)],
  })
  const fetchMock = mockData(t, { id, status: 'DRAFT' })
  const photo = draft.assets.find((item) => item.kind === 'photograph' && item.order === 7)
  photo.caption = 'Legenda corrigida após o salvamento'
  await updateReportDraft('token', id, draftFieldsPayload(draft))
  const firstBody = JSON.parse(fetchMock.mock.calls[0].arguments[1].body)
  assert.deepEqual(firstBody.location.location_map.file, reference('1'))
  assert.deepEqual(firstBody.location.municipality_in_state_map.file, reference('2'))
  assert.deepEqual(firstBody.pre_implementation.image.file, reference('3'))
  assert.deepEqual(firstBody.attachments.municipality_location_map.file, reference('5'))
  assert.deepEqual(firstBody.attachments.topographic_plan.file, reference('6'))
  assert.deepEqual(firstBody.photographic_documentation.images.map(({ order }) => order), [2, 7])
  assert.equal(firstBody.photographic_documentation.images[1].id, photo.id)
  assert.equal(firstBody.photographic_documentation.images[1].caption, 'Legenda corrigida após o salvamento')
  assert.deepEqual(firstBody.photographic_documentation.images[1].file, photo.reference)
  assert.deepEqual(draft.assets.filter((item) => item.kind === 'photograph').map(({ order }) => order), [7, 2])

  draft.assets = draft.assets.filter((item) => item.id !== photo.id && item.kind !== 'location_map' && item.kind !== 'topographic_plan')
  await updateReportDraft('token', id, draftFieldsPayload(draft))
  const secondBody = JSON.parse(fetchMock.mock.calls[1].arguments[1].body)
  assert.equal(secondBody.location.location_map, null)
  assert.equal(secondBody.attachments.topographic_plan, null)
  assert.equal(secondBody.photographic_documentation.images.length, 1)
  assert.equal(secondBody.photographic_documentation.images[0].order, 2)
  assert.deepEqual(secondBody.location.municipality_in_state_map.file, reference('2'))
  assert.deepEqual(secondBody.pre_implementation.image.file, reference('3'))
  assert.deepEqual(secondBody.attachments.municipality_location_map.file, reference('5'))
  assert.equal(draft.photoHistory['4'.repeat(64)], 7)
  assert.equal(draft.nextPhotoOrder, 8)
})

test('hidrata os DTOs snake_case e todos os tipos de mídia mantendo metadados privados recebidos para edição', () => {
  const draft = hydrateReportDraft({
    cover: { municipality: { id: 7, name: 'Salvador', state_code: 'BA' }, force: 'PM', size: '1B', typology: 'CIPM', sei_number: 'SEI-123' },
    general_information: { inspection_date: '2026-10-12T00:00:00-03:00', collaborators: 'Ana e Paulo' },
    infrastructure: { water_network: 'SIM' },
    location: { location_map: dtoImage('1'), municipality_in_state_map: dtoImage('2') },
    pre_implementation: { image: dtoImage('3') }, photographic_documentation: { images: [dtoImage('4', 7)] },
    attachments: { checklist: { state_owned_land: 'NÃO SE APLICA' }, municipality_location_map: { ...dtoImage('5'), type: 'MUNICIPALITY_LOCATION_MAP' },
      topographic_plan: { ...dtoImage('6'), type: 'TOPOGRAPHIC_PLAN' }, others: [{ ...dtoImage('7'), type: 'OTHER', description: 'Certidão' }] },
    conclusion: { content: 'Conclusão\nSegundo parágrafo' }, uploaded_images: [dtoImage('8', 10)],
  })
  assert.equal(draft.cover.municipality_id, 7)
  assert.equal(draft.cover.sei_number, 'SEI-123')
  assert.equal(draft.general_information.inspection_date, '2026-10-12')
  assert.equal(draft.infrastructure.water_network, 'SIM')
  assert.equal(draft.infrastructure.internet, null)
  assert.equal(draft.checklist.state_owned_land, 'NÃO SE APLICA')
  assert.equal(draft.conclusion, 'Conclusão\nSegundo parágrafo')
  assert.deepEqual(draft.assets.map(({ kind }) => kind), ['location_map', 'state_map', 'pre_implementation', 'photograph', 'municipality_map', 'topographic_plan', 'other'])
  assert.ok(draft.assets.every((item) => !item.file && item.reference))
  assert.equal(draft.assets[6].description, 'Certidão')
  assert.equal(draft.nextPhotoOrder, 11)
  assert.equal(draft.photoHistory['4'.repeat(64)], 7)
  assert.equal(draft.photoHistory['8'.repeat(64)], 10)
  assert.equal(draftFieldsPayload(draft).attachments.others[0].type, undefined)
})

test('hidratação aceita seções nulas e normaliza enum/texto inválido sem enviar campos desconhecidos', () => {
  assert.deepEqual(hydrateReportDraft({ cover: null, general_information: null, infrastructure: null, attachments: null, conclusion: null }), emptyReportDraft())
  const draft = hydrateReportDraft({
    cover: { municipality: { id: '7' }, force: 'PMBA', size: 'GRANDE', typology: 42, sei_number: null },
    general_information: { inspection_date: 42, collaborators: null },
    infrastructure: { water_network: 'YES', internet: 'SIM', invented_question: 'SIM' },
    attachments: { checklist: { state_owned_land: 'NO', flood_history: 'NÃO', invented_question: 'SIM' } }, conclusion: { content: 42 },
  })
  assert.equal(draft.cover.municipality_id, null)
  assert.equal(draft.cover.force, '')
  assert.equal(draft.cover.size, '')
  assert.equal(draft.cover.typology, '')
  assert.equal(draft.infrastructure.water_network, null)
  assert.equal(draft.infrastructure.internet, 'SIM')
  assert.equal(draft.infrastructure.invented_question, undefined)
  assert.equal(draft.checklist.flood_history, 'NÃO')
  assert.equal(draft.checklist.invented_question, undefined)
  assert.doesNotThrow(() => getStepIssues(draft))
})

test('histórico vazio não apaga a ordem das fotos ativas ao recuperar o próximo upload', () => {
  const draft = hydrateReportDraft({ uploaded_images: [], photographic_documentation: { images: [dtoImage('2', 8)] } })
  assert.equal(draft.nextPhotoOrder, 9)
  assert.equal(draft.photoHistory['2'.repeat(64)], 8)
})

test('numeração segue a composição do PDF, mantém ordem de upload e não muda o array de estado', () => {
  const assets = [asset('other', '7'), asset('photograph', '4', 5), asset('state_map', '2'), asset('municipality_map', '5'),
    asset('location_map', '1'), asset('pre_implementation', '3'), asset('topographic_plan', '6'), asset('photograph', '8', 2)]
  const originalOrder = assets.map(({ id: assetId }) => assetId)
  const sorted = orderedAssets(assets)
  assert.deepEqual(sorted.map(({ kind, order }) => [kind, order]), [
    ['location_map', 1], ['state_map', 1], ['pre_implementation', 1], ['photograph', 2], ['photograph', 5], ['municipality_map', 1], ['topographic_plan', 1], ['other', 1],
  ])
  assert.equal(figureNumber(assets, assets[1].id), 5)
  assert.deepEqual(assets.map(({ id: assetId }) => assetId), originalOrder)
  assert.equal(figureNumber(assets.filter(({ kind }) => kind !== 'location_map'), assets[1].id), 4)
})
