// Labels follow the official report model. Enum values and field keys follow the Laravel contract.
export const REPORT_STEPS = [
  ['Capa', 'Preencha as informações da capa do relatório'],
  ['Informações Gerais', 'Registre a data da vistoria e os colaboradores presentes'],
  ['Localização do Terreno', 'Adicione os mapas que identificam a localização do terreno'],
  ['Infraestrutura Existente', 'Informe a infraestrutura identificada durante a vistoria'],
  ['Sugestão Pré-Implantação', 'Adicione a sugestão de pré-implantação, quando disponível'],
  ['Documentação Fotográfica', 'Organize as fotografias da vistoria e suas legendas'],
  ['Anexos', 'Preencha o checklist do terreno e adicione documentos complementares'],
  ['Conclusão', 'Registre a conclusão técnica da vistoria'],
  ['Revisão Final', 'Confira todas as seções e as pendências antes de finalizar'],
]
export const FORCES = ['PM', 'PC', 'CBM', 'DPT', 'PC-PM', 'SSP']
export const REPORT_SIZES = ['1B', '1A', '1', '1B-1B', '1B-1A', '1B-1', '1A-1A', '1A-A', '1-1', '1A-1B', 'SEM PADRÃO']
export const ANSWERS = ['SIM', 'NÃO', 'NÃO SE APLICA']
export const INFRASTRUCTURE = [
  ['water_network', 'Rede de Água'], ['high_voltage_network', 'Rede Elétrica de Alta'],
  ['low_voltage_network', 'Rede Elétrica de Baixa'], ['sewage_network', 'Rede de Esgoto'],
  ['telephony', 'Telefonia'], ['public_lighting', 'Iluminação Pública'], ['internet', 'Internet'],
  ['waste_collection', 'Coleta de Lixo'], ['paving', 'Pavimentação'], ['existing_buildings', 'Edificações existente'],
]
export const CHECKLIST = [
  ['sei_construction_request', 'Solicitação via Sistema Eletrônico de Informação – SEI para construção da unidade.'],
  ['sei_land_and_typology_identification', 'Indicação no processo SEI do terreno e da tipologia da unidade a ser construída.'],
  ['state_owned_land', 'Terreno escriturado em nome do Estado.'], ['simov_legalized', 'Terreno possui código SIMOV com o status de legalizado.'],
  ['compatible_dimensions', 'Dimensões do Terreno compatíveis com a tipologia da unidade a ser construída.'], ['slope_or_level_risk', 'Terreno próximo a encostas ou com cota de implantação inferior a edificações vizinhas ou nível da rua que gerem vulnerabilidade da unidade.'],
  ['stormwater_drainage', 'Existência de sistema de drenagem pluvial no acesso à unidade.'], ['flood_history', 'Terreno em área com histórico de alagamentos.'],
  ['electricity_supply', 'Existência de sistema de fornecimento de energia elétrica.'], ['water_supply', 'Existência de sistema de fornecimento de água potável.'],
  ['sewage_supply', 'Existência de sistema de esgotamento sanitário.'], ['paving_and_sidewalk', 'Existência de pavimentação e passeio no acesso à unidade.'],
  ['regular_waste_collection', 'Existência de serviço de coleta regular de resíduos sólidos.'], ['demolition_required', 'Necessidade de demolição de edificação existente no terreno.'],
  ['easy_public_access', 'Localização de fácil acesso ao cidadão.'], ['domain_strip_or_non_buildable_area', 'Terreno em faixa de domínio ou em área não edificante.'],
  ['technical_feasibility_report', 'Elaboração de relatório técnico conclusivo sobre a viabilidade do terreno.'], ['report_attached_to_sei', 'Encarte do relatório no processo SEI, para conhecimento das Forças e Gabinete do Secretário.'],
  ['works_dashboard_updated', 'Atualização do Painel de Obras.'], ['environmental_protection_area', 'Verificar se o terreno se encontra em área de preservação ambiental.'],
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

export const validInspectionDate = (value, today = todayInBahia()) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value && value <= today
}
/** @returns {import('../types/report-draft').ReportDraft} */
export const emptyReportDraft = () => ({
  cover: { municipality_id: null, force: '', size: '', typology: '', sei_number: '' },
  general_information: { inspection_date: '', collaborators: '' },
  infrastructure: Object.fromEntries(INFRASTRUCTURE.map(([key]) => [key, null])),
  checklist: Object.fromEntries(CHECKLIST.map(([key]) => [key, null])), conclusion: '', assets: [], mediaHistory: {}, photoHistory: {}, nextPhotoOrder: 1,
})

/** @param {import('../types/report-draft').ReportDraft} draft
 * @returns {import('../types/report-draft').StepIssue[][]}
 */
export const getStepIssues = (draft) => {
  /** @type {import('../types/report-draft').StepIssue[][]} */
  const issues = Array.from({ length: 8 }, () => [])
  const add = (step, field, message) => issues[step].push({ field, message })
  if (!Number.isSafeInteger(draft.cover.municipality_id) || draft.cover.municipality_id <= 0) add(0, 'municipality_id', 'Selecione o município.')
  if (!FORCES.includes(draft.cover.force)) add(0, 'force', 'Selecione a força.')
  if (!REPORT_SIZES.includes(draft.cover.size)) add(0, 'size', 'Selecione o tamanho.')
  if (!draft.cover.typology.trim()) add(0, 'typology', 'Informe a tipologia.')
  if (textLength(draft.cover.typology) > 100) add(0, 'typology', 'A tipologia deve ter até 100 caracteres.')
  if (!draft.cover.sei_number.trim()) add(0, 'sei_number', 'Informe o número SEI.')
  if (textLength(draft.cover.sei_number) > 80) add(0, 'sei_number', 'O número SEI deve ter até 80 caracteres.')
  if (!validInspectionDate(draft.general_information.inspection_date)) add(1, 'inspection_date', 'Informe uma data válida que não seja futura.')
  if (!draft.general_information.collaborators.trim()) add(1, 'collaborators', 'Informe os colaboradores presentes.')
  if (textLength(draft.general_information.collaborators) > 1000) add(1, 'collaborators', 'Informe até 1.000 caracteres.')
  if (!draft.assets.some((asset) => asset.kind === 'state_map')) add(2, 'state_map', 'Adicione a localização do município em relação ao estado da Bahia.')
  for (const [key, label] of INFRASTRUCTURE) if (!ANSWERS.includes(draft.infrastructure[key])) add(3, key, `${label}: selecione uma resposta.`)
  for (const [key, label] of CHECKLIST) if (!ANSWERS.includes(draft.checklist[key])) add(6, key, `${label}: selecione uma resposta.`)
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
    general_information: { ...draft.general_information, inspection_date: draft.general_information.inspection_date || null },
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
    force: FORCES.includes(report.cover.force) ? report.cover.force : '', size: REPORT_SIZES.includes(report.cover.size) ? report.cover.size : '',
    typology: text(report.cover.typology), sei_number: text(report.cover.sei_number),
  }
  if (report.general_information) draft.general_information = { inspection_date: text(report.general_information.inspection_date).slice(0, 10), collaborators: text(report.general_information.collaborators) }
  for (const [key] of INFRASTRUCTURE) draft.infrastructure[key] = ANSWERS.includes(report.infrastructure?.[key]) ? report.infrastructure[key] : null
  for (const [key] of CHECKLIST) draft.checklist[key] = ANSWERS.includes(report.attachments?.checklist?.[key]) ? report.attachments.checklist[key] : null
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
