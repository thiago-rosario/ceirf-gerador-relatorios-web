# Dados do dashboard

O dashboard usa dados demonstrativos por padrão enquanto a API de relatórios não existe. O aviso “Dados demonstrativos” permanece visível; estes exemplos não são registros reais. A autenticação continua usando a API existente.

- Exemplos: `src/service/dashboard-demo.ts`.
- Modelo de apresentação: `src/types/dashboard.ts`.
- Carregamento, cancelamento e nova tentativa: `src/hooks/use-dashboard-data.ts`.
- Página inicial e composição: `src/views/Home.jsx`.
- Dashboard reutilizável (indicadores, gráfico e tabela): `src/components/dashboard/Dashboard.tsx`.
- Integração atual: `src/router/router.tsx`.

Para desativar a demonstração, defina `VITE_DASHBOARD_DEMO=false` no ambiente do Vite e reinicie/recompile. Sem um loader real, a tela apresenta dados indisponíveis. Ao integrar a API, substitua `loadDashboardDemo` por um `DashboardLoader` e passe `isDemo={false}`. Nenhum endpoint de dashboard foi presumido ou criado.

## Campos que a interface utiliza

| Campo | Tipo | Apresentação |
| --- | --- | --- |
| `metrics.municipalities` | número ou `null` | Municípios Visitados |
| `metrics.forces` | número ou `null` | Forças Vistoriadas |
| `metrics.reports` | número ou `null` | Relatórios Emitidos |
| `metrics.trends` | objeto opcional | Texto de tendência por indicador; omitir quando não houver comparação |
| `inspectionPeriods` | objeto de séries | Chaves `6-months`, `12-months`, `current-year`; omitir períodos não fornecidos |
| `inspectionPeriods[period][]` | `{ month: string, inspections: number }` | Rótulo de mês e quantidade de vistorias |
| `recentReports[].id` | string | Identificador estável do relatório |
| `recentReports[].municipality` | string | Nome do município |
| `recentReports[].coordination` | string ou `null` | Nome/sigla da coordenação |
| `recentReports[].author` | string ou `null` | Nome do autor |
| `recentReports[].date` | ISO 8601 ou `null` | Data em português; data sem horário mantém seu dia |
| `recentReports[].status` | string ou `null` | Estado recebido; ausente exibe “Não informado” |
| `recentReports[].viewHref` | string opcional | Destino real da página de visualização |
| `recentReports[].downloadHref` | string opcional | URL válida para baixar o arquivo |

Uma série presente e vazia indica ausência de vistorias naquele período. Um período ausente fica desabilitado no filtro. Indicadores com valor zero exibem `0`; valores indisponíveis exibem `—`. Relatórios vazios usam o estado “Nenhum relatório recente”.

O modelo acima é o formato normalizado da UI, não uma exigência sobre o formato do backend. Um adapter pode converter o contrato real para esse modelo usando o cliente JSend existente. O loader recebe `{ accessToken, signal }`, permitindo autenticação e cancelamento; rejeições mostram erro com nova tentativa.

## Cuidados ao criar a API

A API existente ainda não oferece indicadores, séries, listagem, criação, visualização ou download de relatórios. O schema atual permite obter autor por `reports.created_by` e coordenação por `report_type_id → report_types.coordination_id`. A definição de cada indicador, período e escopo por usuário deve ocorrer no backend.

`reports` ainda não tem um status global. O campo `report_reviews.status` não deve ser convertido automaticamente em status do relatório. Os estados `draft`, `in_review`, `approved` e `completed` deste arquivo são exemplos visuais; não definem transições nem regras de aprovação. Valores desconhecidos continuam visíveis como recebidos.

Na integração real, o olho usa `viewHref` e o download aparece somente com `downloadHref`. O destino/arquivo deve estar acessível com a autenticação escolhida pela aplicação; um link comum não envia automaticamente o token Bearer. Se o download exigir Bearer, implemente uma ação autenticada que obtenha o arquivo ou uma URL temporária autorizada. A demonstração abre apenas uma prévia local e não gera arquivos de relatório.

A configuração de navegação recebe os itens permitidos. As regras reais continuam no backend. `demo-navigation.ts` apresenta as opções futuras, mantendo Revisões/Administração desabilitadas; essa configuração não concede permissões. Os perfis existentes da API são `OPERATOR`, `VIEWER`, `REVIEWER` e `SUPERUSER`.
