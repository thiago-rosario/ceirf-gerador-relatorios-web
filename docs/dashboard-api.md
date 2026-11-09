# Integração real do dashboard

O dashboard consome a API Laravel autenticada e apresenta, nesta ordem, o cabeçalho com filtro global, os três indicadores principais, a distribuição de vistorias por força, o gráfico mensal existente e os relatórios recentes. Não há dados estáticos de substituição nem alterações no backend.

## Endpoints confirmados

Todos os caminhos abaixo usam o prefixo configurado em `VITE_API_URL` (por padrão `/api`) e o token Bearer da sessão existente. O cliente HTTP já existente interpreta o envelope JSend.

| Endpoint | Contrato consumido | Uso |
| --- | --- | --- |
| `GET /reports/dashboard` | `{ total_reports: number, reports: (ReportResource & { author: { id: string, name: string } \| null })[] }` | Total e registros acessíveis, com autoria; o adapter existente do frontend ordena por `created_at` e seleciona os dez mais recentes |
| `GET /reports/count-by-month?month=YYYY-MM` | `{ month: string, counts: [{ month, count }] }`; `counts: []` significa zero | Série mensal; consulta doze meses únicos para os filtros de seis meses, doze meses e ano atual |
| `GET /coordinations` | `{ coordinations: [{ id, code, name }] }` | Resolve `coordination_id` para a sigla real |
| `GET /reports/{uuid}` | `ReportResource` | Visualização real na página existente de relatórios |
| `GET /reports/{uuid}/pdf` | PDF autenticado ou erro JSON | Download com o hook e serviço existentes; disponível na tabela apenas quando `generated_document` existe |

`GET /reports/count` também existe, mas a tela aproveita `total_reports` do dashboard para evitar uma consulta redundante.

Os contratos foram conferidos em `src/Modules/Report/Presentation/Routes/api.php`, controllers, `ReportResource`, `ReportConsultationEloquentRepository` e `tests/Feature/ReportConsultationApiTest.php` do backend, exclusivamente por leitura.

## Semântica dos dados

O total e a contagem mensal contam registros de relatório acessíveis à sessão, incluindo rascunhos e revisões. A contagem mensal usa `created_at`, não a data da vistoria nem a data de geração. Os rótulos visuais são, portanto, **Relatórios registrados** e **Relatórios registrados por mês**. Não se presume que registros sejam vistorias distintas ou PDFs emitidos.

O gráfico mantém seu filtro próprio, com **Últimos 6 meses** selecionado inicialmente, além de **Últimos 12 meses** e **Ano atual**. Sua seleção de meses preserva o calendário de `America/Bahia` e inclui o mês atual. A coleção recente é ordenada por `created_at`, limitada a dez elementos no adapter do frontend e mostra essa data em **Criado em**. O filtro global não altera essas consultas.

Os estados reais `DRAFT` e `GENERATED` aparecem como **Em elaboração** e **Gerado**. `GENERATED` não é interpretado como aprovação institucional. Estados desconhecidos permanecem visíveis conforme recebidos.

A coluna **Autor** e os cards no celular exibem `author.name`, retornado pelo dashboard. Registros com `author: null` mostram **Não informado**. O objeto representa o criador persistido e pode divergir de `created_by` em snapshots antigos; o frontend não resolve autoria por esse campo nem consulta `/users`.

## Filtro global e integração futura

O filtro global oferece **Últimos 7 dias**, **Últimos 30 dias** (padrão), **Últimos 6 meses** e **Sempre**. As chaves `7-days`, `30-days`, `6-months` e `all-time` são seleções internas da interface, não valores de um parâmetro HTTP confirmado. O frontend não calcula intervalos de datas para esses indicadores.

`loadDashboardIndicators`, em `src/service/dashboard-indicators-service.js`, é o ponto de integração separado dos dados existentes. Sua implementação padrão retorna `null` sem fazer requisição, pois ainda não existe contrato confirmado para os novos indicadores. A interface informa a indisponibilidade e mantém o total histórico de **Relatórios Registrados**, identificado como **Todo o histórico**, com seus critérios atuais. Não se afirma que esse total responde ao filtro global.

Os tipos `DashboardIndicators`, `DashboardCompletion` e `DashboardForceInspections`, em `src/types/dashboard.ts`, são modelos de apresentação. Não definem uma resposta HTTP proposta nem duplicam o catálogo de forças. Quando houver contrato confirmado, o adapter deverá consumir o cliente `api-client.js`, respeitar JSend e mapear os parâmetros e dados reais para esses modelos.

O hook `useDashboardIndicators` recebe período, sessão e loader; cancela a consulta anterior, ignora respostas tardias e oculta dados de outro período ou sessão. O envio é adiado até uma microtarefa para evitar duplicação no replay de efeitos do StrictMode. Renderizações com as mesmas dependências não refazem a consulta. A alteração do filtro global não recarrega o gráfico mensal nem a tabela recente.

## Dados ainda ausentes

- **Municípios Visitados:** quantidade de municípios distintos visitados no período, calculada pela API.
- **Relatórios Registrados por período:** contrato com seus critérios de contabilização e parâmetro temporal confirmados. Até a integração, permanece o total histórico existente de `total_reports`.
- **Taxa de Conclusão:** percentual fornecido pela API e, quando disponíveis, quantidades concluída e total. Ausência de base válida deve ser representada sem percentual, não como desempenho de 0%. O componente não deduz conclusão a partir de status nem calcula a taxa.
- **Vistorias por Força:** relação de código, nome e quantidade calculada pela API. A interface renderiza as categorias recebidas, inclusive quantidades zero, e usa seus valores apenas para dimensionar as barras. Não divide PC-PM nem monta um catálogo local. O endpoint existente `GET /reports/catalogs/forces` fornece somente catálogo, sem contagens; por isso não é usado como fonte dessa distribuição.

As definições de vistoria, período, revisão válida, deduplicação e autorização estatística continuam sob responsabilidade do backend. Nenhuma agregação é produzida a partir dos relatórios recentes. A série mensal existente continua representando criação de registros, conforme seu contrato atual.

## Falhas, autenticação e ações

- Loading mantém os skeletons existentes e oculta dados de uma sessão anterior.
- Erros do dashboard oferecem nova tentativa; HTTP 404 explica que a instalação ainda não publica o recurso.
- HTTP 401 em qualquer consulta ou download aciona o tratamento de sessão existente. HTTP 403 revalida o usuário pelo callback existente e apresenta o acesso negado.
- Os novos indicadores têm estados próprios de carregamento, indisponibilidade e erro, com nova tentativa. Uma falha nessa consulta não impede o funcionamento das seções existentes; HTTP 404 é apresentado como recurso indisponível.
- Uma falha não relacionada à autenticação no catálogo não impede exibir o total e os registros reais; os nomes afetados ficam indisponíveis.
- Uma falha mensal desabilita os períodos que dependem desse mês e oferece atualização. Um mês com falha nunca vira zero. `counts: []` confirmado pela API representa zero.
- Não há links diretos para armazenamento privado. O download solicita o PDF com Bearer, valida o arquivo pelo serviço existente, abre um link temporário local e revoga o recurso.
- A visualização navega para a página real; o dashboard não abre uma prévia demonstrativa.

## Organização e verificação

- Adapter dos endpoints existentes: `src/service/dashboard-service.js`; estado, cancelamento e nova tentativa: `src/hooks/use-dashboard-data.ts`.
- Integração futura e consulta independente dos indicadores: `src/service/dashboard-indicators-service.js` e `src/hooks/use-dashboard-indicators.ts`.
- Composição, filtro global, feedback e sessão: `src/views/Home.jsx` e `src/components/dashboard/Dashboard.tsx`.
- Filtro acessível: `src/components/dashboard/DashboardPeriodFilter.tsx`; distribuição por força: `src/components/dashboard/ForceInspections.tsx`; indicadores e barra de conclusão: `src/components/section-cards.tsx`.
- Gráfico e tabela existentes foram preservados em `src/components/chart-area-interactive.tsx` e `src/components/data-table.tsx`, com ajustes visuais. A tabela mantém as seis colunas e os cards no celular; as ações compartilham `ReportActionProps` e os componentes de apresentação existentes.
- `ReportEntryDialog.tsx` foi removido após busca de referências: era um componente sem utilização que informava indisponibilidade de criação, enquanto o fluxo real de relatórios já existe.
- `tests/dashboard-service.test.js` cobre contratos, autoria e autor nulo, autenticação, meses e virada de ano, zero real, respostas malformadas, falhas parciais e cancelamento.
- `tests/dashboard-indicators.test.js` cobre ausência de contrato sem requisição, cancelamento do serviço, filtro acessível, total histórico, zero real, conclusão sem base válida e categorias dinâmicas da distribuição. `tests/dashboard-ui.test.js` verifica a apresentação e a preservação das seções existentes.
- A validação no navegador, com fixtures temporárias e React em StrictMode, verificou trocas rápidas de período, descarte de respostas atrasadas, troca de sessão, nova tentativa isolada e independência do gráfico e da tabela. Os layouts foram conferidos em larguras CSS de 320, 800 e 1600 px, sem transbordamento horizontal da página. As fixtures não integram a aplicação entregue.
