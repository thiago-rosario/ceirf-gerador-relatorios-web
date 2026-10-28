// Labels follow the official report model. Enum values and field keys follow the Laravel contract.
export const REPORT_STEPS = [
  ['Capa', 'Preencha as informações da capa do relatório'],
  ['Informações Gerais', 'Registre a data da vistoria, os colaboradores presentes e os representantes institucionais'],
  ['Localização do Terreno', 'Adicione os mapas que identificam a localização do terreno'],
  ['Infraestrutura Existente', 'Informe a infraestrutura identificada durante a vistoria'],
  ['Sugestão Pré-Implantação', 'Adicione a sugestão de pré-implantação, quando disponível'],
  ['Documentação Fotográfica', 'Organize as fotografias da vistoria e suas legendas'],
  ['Anexos', 'Preencha o checklist do terreno e adicione documentos complementares'],
  ['Conclusão', 'Registre a conclusão técnica da vistoria'],
  ['Revisão Final', 'Confira todas as seções e as pendências antes de finalizar'],
]
export const PRE_IMPLEMENTATION_NOTE = 'Obs.: A pré-implantação foi realizada com imagens de drone e não substitui o projeto de implantação, que deverá ser realizada pela Coordenação de Projetos após a realização dos estudos planialtimétricos e sondagens.'
export const ASSET_CAPTIONS = {
  location_map: 'Mapa de Localização', state_map: 'Localização do município em relação ao estado da Bahia',
  pre_implementation: 'Sugestão de pré-implantação COTEC', municipality_map: 'Mapa de Localização do Município', topographic_plan: 'Planta Topográfica',
}
export const MAX_FIGURES = 20
export const MAX_FILE_BYTES = 25 * 1024 * 1024
export const isAssetConfirmed = (asset) => Boolean(asset.reference && !asset.file && (!asset.uploadStatus || asset.uploadStatus === 'success'))
export const textLength = (value) => Array.from(value).length
export const truncateText = (value, limit) => Array.from(value).slice(0, limit).join('')
export const todayInBahia = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bahia' }).format(new Date())
let nextParticipantId = 0
const participantIdPrefix = Math.random().toString(36).slice(2)
const participantId = () => `participant-${participantIdPrefix}-${++nextParticipantId}`
export const createCollaborator = (name = '') => ({ id: participantId(), name })
export const createInstitutionalRepresentative = (name = '', position = '') => ({ id: participantId(), name, position })
export const serializeCollaborators = (rows) => rows.filter(({ name }) => name.trim()).map(({ name }) => name).join('\n')

/** Validation that also applies to partial drafts; empty optional rows are not records. */
export const getGeneralInformationSaveIssues = (draft) => {
  /** @type {import('../types/report-draft').StepIssue[]} */
  const issues = []
  const { collaborators, institutional_representatives } = draft.general_information
  if (textLength(serializeCollaborators(collaborators)) > 1000) issues.push({ field: 'collaborators', message: 'Informe até 1.000 caracteres no total dos colaboradores.' })
  for (const representative of institutional_representatives) {
    if (!representative.name.trim() && !representative.position.trim()) continue
    for (const [field, label] of [['name', 'o nome'], ['position', 'o cargo']]) {
      const value = representative[field]
      const key = `institutional_representatives.${representative.id}.${field}`
      if (!value.trim()) issues.push({ field: key, message: `Informe ${label} do representante.` })
      else if (textLength(value) > 255) issues.push({ field: key, message: `Informe até 255 caracteres para ${label} do representante.` })
    }
  }
  return issues
}

export const validInspectionDate = (value, today = todayInBahia()) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= today
}
/** @returns {import('../types/report-draft').ReportDraft} */
export const emptyReportDraft = () => ({
  cover: { municipality_id: null, force: '', size: '', typology: '', sei_number: '' },
  general_information: { inspection_date: '', collaborators: [createCollaborator()], institutional_representatives: [createInstitutionalRepresentative()] },
  infrastructure: {},
  checklist: {}, conclusion: '', assets: [], mediaHistory: {}, photoHistory: {}, nextPhotoOrder: 1,
})

/** @param {import('../types/report-draft').ReportDraft} draft
 * @param {Partial<import('../types/report-catalogs').ReportFormOptions> | null} [options]
 * @returns {import('../types/report-draft').StepIssue[][]}
 */
export const getStepIssues = (draft, options = null) => {
  /** @type {import('../types/report-draft').StepIssue[][]} */
  const issues = Array.from({ length: 8 }, () => [])
  const add = (step, field, message) => issues[step].push({ field, message })
  if (!Number.isSafeInteger(draft.cover.municipality_id) || draft.cover.municipality_id <= 0) add(0, 'municipality_id', 'Selecione o município.')
  if (!options?.forces?.length) add(0, 'catalogs.forces', 'Carregue as forças institucionais antes de finalizar.')
  if (!options?.typologies?.length) add(0, 'catalogs.typologies', 'Carregue os tamanhos antes de finalizar.')
  if (!options?.infrastructure?.length) add(3, 'catalogs.infrastructure', 'Carregue os itens de infraestrutura antes de finalizar.')
  if (!options?.checklist?.length) add(6, 'catalogs.checklist', 'Carregue as perguntas do checklist antes de finalizar.')
  if (!options?.answers?.length) {
    add(3, 'catalogs.answers', 'Carregue as respostas permitidas antes de finalizar.')
    add(6, 'catalogs.answers', 'Carregue as respostas permitidas antes de finalizar.')
  }
  if (!options?.forces?.some(({ key }) => key === draft.cover.force)) add(0, 'force', 'Selecione a força.')
  if (!options?.typologies?.some(({ key }) => key === draft.cover.size)) add(0, 'size', 'Selecione o tamanho.')
  if (!draft.cover.typology.trim()) add(0, 'typology', 'Informe a tipologia.')
  if (textLength(draft.cover.typology) > 100) add(0, 'typology', 'A tipologia deve ter até 100 caracteres.')
  if (!draft.cover.sei_number.trim()) add(0, 'sei_number', 'Informe o número SEI.')
  if (textLength(draft.cover.sei_number) > 80) add(0, 'sei_number', 'O número SEI deve ter até 80 caracteres.')
  if (!validInspectionDate(draft.general_information.inspection_date)) add(1, 'inspection_date', 'Informe uma data válida que não seja futura.')
  if (!serializeCollaborators(draft.general_information.collaborators).trim()) add(1, 'collaborators', 'Informe os colaboradores presentes.')
  issues[1].push(...getGeneralInformationSaveIssues(draft))
  if (!draft.assets.some((asset) => asset.kind === 'state_map')) add(2, 'state_map', 'Adicione a localização do município em relação ao estado da Bahia.')
  const isAnswer = (value) => options?.answers?.some(({ key }) => key === value)
  for (const { key, label } of options?.infrastructure ?? []) if (!isAnswer(draft.infrastructure[key])) add(3, key, `${label}: selecione uma resposta.`)
  for (const { key, label } of options?.checklist ?? []) if (!isAnswer(draft.checklist[key])) add(6, key, `${label}: selecione uma resposta.`)
  const checksums = new Set()
  for (const asset of draft.assets) {
    const step = ({ location_map: 2, state_map: 2, pre_implementation: 4, photograph: 5, municipality_map: 6, topographic_plan: 6, other: 6 })[asset.kind]
    const checksum = asset.checksum.toLowerCase()
    if (checksum && checksums.has(checksum)) add(step, asset.id, `${asset.name}: este arquivo está duplicado no relatório.`)
    if (checksum) checksums.add(checksum)
    if (asset.kind === 'photograph' && !asset.caption.trim()) add(step, asset.id, `${asset.name}: informe a legenda da fotografia.`)
    if (asset.kind === 'other' && !asset.description.trim()) add(step, asset.id, `${asset.name}: informe a descrição.`)
    if (textLength(asset.caption) > 500 || textLength(asset.description) > 500) add(step, asset.id, `${asset.name}: use até 500 caracteres.`)
    if (asset.file) {
      const fileIssue = validateSelectedFile(asset.file)
      if (fileIssue) add(step, asset.id, `${asset.name}: ${fileIssue}`)
    }
    if (!isAssetConfirmed(asset)) add(step, asset.id, `${asset.name}: ${asset.uploadStatus === 'error' ? asset.uploadError || 'envio não confirmado. Tente novamente.' : asset.uploadStatus === 'processing' ? 'aguardando confirmação do vínculo com o relatório.' : 'aguardando envio e confirmação no servidor.'}`)
  }
  if (draft.assets.length > MAX_FIGURES) add(5, 'assets', 'O relatório admite no máximo 20 figuras.')
  if (!draft.conclusion.trim()) add(7, 'conclusion', 'Preencha a conclusão técnica.')
  if (textLength(draft.conclusion) > 3000) add(7, 'conclusion', 'A conclusão deve ter até 3.000 caracteres.')
  return issues
}

/** Persist scalar fields and existing server references. Local files never become fabricated references. */
export const draftFieldsPayload = (draft) => {
  const attachment = (asset) => asset ? { id: asset.id, file: asset.reference, description: asset.description } : null
  // While uploading a replacement, keep the previously linked reference in every section PATCH.
  // Once POST returns, include its real reference even before PATCH has been confirmed.
  const remote = draft.assets.map((asset) => asset.reference ? asset : asset.previous ? { ...asset.previous, caption: asset.caption, description: asset.description } : null).filter(Boolean)
  const image = (asset) => asset ? { id: asset.id, file: asset.reference, order: asset.order, caption: asset.caption } : null
  return {
    cover: { ...draft.cover, force: draft.cover.force || null, size: draft.cover.size || null, sei_number: draft.cover.sei_number.trim() || null },
    general_information: {
      inspection_date: draft.general_information.inspection_date || null,
      collaborators: serializeCollaborators(draft.general_information.collaborators),
      institutional_representatives: draft.general_information.institutional_representatives
        .filter(({ name, position }) => name.trim() || position.trim()).map(({ name, position }) => ({ name, position })),
    },
    infrastructure: draft.infrastructure,
    location: { location_map: image(remote.find((asset) => asset.kind === 'location_map')), municipality_in_state_map: image(remote.find((asset) => asset.kind === 'state_map')) },
    pre_implementation: { image: image(remote.find((asset) => asset.kind === 'pre_implementation')) },
    photographic_documentation: { images: remote.filter((asset) => asset.kind === 'photograph').sort((a, b) => a.order - b.order).map(image) },
    attachments: { checklist: draft.checklist,
      municipality_location_map: attachment(remote.find((asset) => asset.kind === 'municipality_map')),
      topographic_plan: attachment(remote.find((asset) => asset.kind === 'topographic_plan')),
      others: remote.filter((asset) => asset.kind === 'other').map(attachment),
    }, conclusion: { content: draft.conclusion },
  }
}

/** @returns {import('../types/report-draft').ReportDraft} */
export const hydrateReportDraft = (report) => {
  const draft = emptyReportDraft()
  const text = (value) => typeof value === 'string' ? value : ''
  if (report.cover) draft.cover = {
    municipality_id: Number.isSafeInteger(report.cover.municipality?.id) && report.cover.municipality.id > 0 ? report.cover.municipality.id : null,
    force: text(report.cover.force), size: text(report.cover.size),
    typology: text(report.cover.typology), sei_number: text(report.cover.sei_number),
  }
  if (report.general_information) {
    const information = report.general_information
    const collaborators = text(information.collaborators)
    const representatives = Array.isArray(information.institutional_representatives) ? information.institutional_representatives : []
    draft.general_information = {
      inspection_date: text(information.inspection_date).slice(0, 10),
      collaborators: collaborators ? collaborators.split(/\r?\n/).map(createCollaborator) : [createCollaborator()],
      institutional_representatives: representatives.length
        ? representatives.map((item) => createInstitutionalRepresentative(text(item?.name), text(item?.position))) : [createInstitutionalRepresentative()],
    }
  }
  const answers = (values) => values && typeof values === 'object' && !Array.isArray(values)
    ? Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === 'string' ? value : null])) : {}
  draft.infrastructure = answers(report.infrastructure)
  draft.checklist = answers(report.attachments?.checklist)
  draft.conclusion = text(report.conclusion?.content)
  const assetFrom = (kind, item) => item?.file ? ({ id: item.id, kind, name: item.file.file_name, mimeType: item.file.mime_type, size: item.file.size_bytes, checksum: item.file.checksum,
    order: item.order ?? 1, caption: text(item.caption), description: text(item.description), reference: item.file }) : null
  const add = (kind, item) => {
    const asset = assetFrom(kind, item)
    if (asset) draft.assets.push(asset)
  }
  add('location_map', report.location?.location_map); add('state_map', report.location?.municipality_in_state_map)
  add('pre_implementation', report.pre_implementation?.image)
  for (const photo of report.photographic_documentation?.images ?? []) add('photograph', photo)
  add('municipality_map', report.attachments?.municipality_location_map); add('topographic_plan', report.attachments?.topographic_plan)
  for (const item of report.attachments?.others ?? []) add('other', item)
  for (const asset of draft.assets) {
    if (asset.checksum) draft.mediaHistory[asset.checksum.toLowerCase()] = asset
  }
  for (const image of report.uploaded_images ?? []) {
    const asset = draft.assets.find((item) => item.id === image.id) ?? assetFrom('photograph', image)
    if (asset?.checksum) draft.mediaHistory[asset.checksum.toLowerCase()] ??= asset
  }
  for (const photo of [...report.uploaded_images ?? [], ...report.photographic_documentation?.images ?? []]) {
    if (photo.file?.checksum && Number.isSafeInteger(photo.order) && photo.order > 0) draft.photoHistory[photo.file.checksum.toLowerCase()] = photo.order
  }
  draft.nextPhotoOrder = Math.max(0, ...Object.values(draft.photoHistory)) + 1
  return draft
}

export const orderedAssets = (assets) => {
  const kinds = ['location_map', 'state_map', 'pre_implementation', 'photograph', 'municipality_map', 'topographic_plan', 'other']
  return [...assets].sort((a, b) => kinds.indexOf(a.kind) - kinds.indexOf(b.kind) || a.order - b.order)
}
export const figureNumber = (assets, id) => orderedAssets(assets).findIndex((asset) => asset.id === id) + 1

export const validateSelectedFile = (file) => {
  if (!file.size) return 'O arquivo está vazio.'
  if (file.size > MAX_FILE_BYTES) return 'O arquivo deve ter até 25 MiB.'
  const extension = file.name.split('.').pop()?.toLowerCase()
  const types = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', pdf: 'application/pdf' }
  if (!types[extension] || (file.type && file.type !== types[extension])) return 'Selecione um arquivo PNG, JPG, JPEG ou PDF.'
  return null
}
export const fileMimeType = (file) => file.type || ({ png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', pdf: 'application/pdf' })[file.name.split('.').pop()?.toLowerCase()]
