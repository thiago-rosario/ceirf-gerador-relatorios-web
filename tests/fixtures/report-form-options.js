// Representative API response; the complete catalogs are owned by the backend.
export const reportFormOptions = {
  forces: [{ key: 'PM', label: 'Polícia Militar' }, { key: 'PC-PM', label: 'PC-PM' }],
  typologies: [{ key: '1B', label: 'Tipo 1B' }, { key: '1B-1B', label: '1B-1B' }],
  answers: [{ key: 'SIM', label: 'Sim' }, { key: 'NÃO', label: 'Não' }, { key: 'NÃO SE APLICA', label: 'Não se aplica' }],
  infrastructure: [{ key: 'water_network', label: 'Rede de Água' }, { key: 'internet', label: 'Internet' }],
  checklist: [{ key: 'state_owned_land', label: 'Terreno escriturado em nome do Estado.' }, { key: 'flood_history', label: 'Terreno em área com histórico de alagamentos.' }],
}
