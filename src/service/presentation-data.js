// Examples used by the screens on this presentation branch. No API interception.
export const presentationReports = [
  ['Salvador', 'COTEC', 'Coordenação Técnica', 'CIPM 1B', 'João Silva', '2026-10-13', 'PM'],
  ['Camaçari', 'COPROJ', 'Coordenação de Projetos', 'Projeto de Complexo Policial', 'Ana Santos', '2026-10-12', 'PC-PM'],
  ['Ilhéus', 'CORMAN', 'Coordenação de Manutenção', 'Manutenção de Delegacia Territorial', 'Mariana Costa', '2026-10-10', 'PC'],
  ['Feira de Santana', 'COTEC', 'Coordenação Técnica', 'CIPM 1A', 'Paulo Oliveira', '2026-10-09', 'PM'],
  ['Vitória da Conquista', 'COROB', 'Coordenação de Obras', 'Acompanhamento de obra do batalhão', 'Carlos Souza', '2026-10-08', 'PM'],
  ['Lauro de Freitas', 'CADM', 'Coordenação Administrativa', 'Levantamento de bens e equipamentos', 'Beatriz Lima', '2026-10-07', 'SSP'],
  ['Barreiras', 'COTEC', 'Coordenação Técnica', 'Unidade do Corpo de Bombeiros', 'Lucas Ferreira', '2026-10-06', 'CBM'],
  ['Juazeiro', 'COPROJ', 'Coordenação de Projetos', 'Projeto de unidade pericial', 'Rafael Santos', '2026-10-05', 'DPT'],
].map(([municipality, code, name, typology, author, date, force], index) => ({
  id: `dece0000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
  status: ['COMPLETED', 'IN_REVIEW', 'APPROVED', 'DRAFT'][index % 4], presentation: true,
  coordination: { id: ['COTEC', 'COPROJ', 'CORMAN', 'CADM', 'COROB'].indexOf(code) + 1, code, name },
  coordination_id: ['COTEC', 'COPROJ', 'CORMAN', 'CADM', 'COROB'].indexOf(code) + 1,
  created_by: 'presentation-example', created_by_name: author, created_at: `${date}T10:00:00-03:00`, revision_number: 1,
  cover: { municipality: { id: index + 1, name: municipality, state_code: 'BA' }, typology, force, size: '1B', sei_number: `020.0000.2026.00${String(index + 1).padStart(3, '0')}-00` },
  general_information: { inspection_date: date, collaborators: `${author}; equipe ${code}` },
  conclusion: { content: 'A vistoria identificou condições adequadas para continuidade do planejamento. Recomenda-se atualizar o levantamento técnico e atender às adequações de acessibilidade antes da execução dos serviços.' },
  generated_document: index % 4 === 3 ? null : { file_name: `relatorio-exemplo-${index + 1}.pdf`, generated_at: `${date}T15:00:00-03:00` },
  pdfUrl: `/presentation/relatorio-exemplo-${index + 1}.pdf`,
}))

export const findPresentationExample = (id) => presentationReports.find((report) => report.id === id)

export const downloadPresentationExample = (id) => {
  const report = findPresentationExample(id)
  if (!report?.generated_document) return false
  const link = document.createElement('a')
  link.href = report.pdfUrl
  link.download = report.generated_document.file_name
  document.body.append(link); link.click(); link.remove()
  return true
}

// Match examples to the IDs from the real municipality catalogue when available.
/** @param {{ municipalityId?: number | null, typology?: string, page?: number, perPage?: number, municipalities?: import('../types/reports').Municipality[] }} [options] */
export const searchPresentationExamples = ({ municipalityId, typology = '', page = 1, perPage = 10, municipalities = [] } = {}) => {
  const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
  const rows = presentationReports.map((report) => ({ ...report, cover: { ...report.cover,
    municipality: municipalities.find((item) => normalize(item.name) === normalize(report.cover.municipality.name)) ?? report.cover.municipality,
  } })).filter((report) => (!municipalityId || report.cover.municipality.id === municipalityId)
    && normalize(report.cover.typology).includes(normalize(typology.trim())))
  const start = (page - 1) * perPage
  return { reports: rows.slice(start, start + perPage), pagination: {
    current_page: page, per_page: perPage, total: rows.length, last_page: Math.max(1, Math.ceil(rows.length / perPage)),
    from: rows.slice(start, start + perPage).length ? start + 1 : null,
    to: rows.slice(start, start + perPage).length ? Math.min(start + perPage, rows.length) : null,
  } }
}
