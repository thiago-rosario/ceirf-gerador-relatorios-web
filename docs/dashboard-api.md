# Integração real do dashboard

O dashboard consome a API Laravel autenticada. O loader demonstrativo, sua flag de ambiente e a prévia simulada foram removidos. Não há dados estáticos de substituição.

## Endpoints confirmados

Todos os caminhos abaixo usam o prefixo configurado em `VITE_API_URL` (por padrão `/api`) e o token Bearer da sessão existente. O cliente HTTP já existente interpreta o envelope JSend.

| Endpoint | Contrato consumido | Uso |
| --- | --- | --- |
| `GET /reports/dashboard` | `{ total_reports: number, reports: (ReportResource & { author: { id: string, name: string } \| null })[] }` | Total de registros acessíveis e dez registros mais recentes por `created_at`, com autoria |
| `GET /reports/count-by-month?month=YYYY-MM` | `{ month: string, counts: [{ month, count }] }`; `counts: []` significa zero | Série mensal; consulta doze meses únicos para os filtros de seis meses, doze meses e ano atual |
| `GET /coordinations` | `{ coordinations: [{ id, code, name }] }` | Resolve `coordination_id` para a sigla real |
| `GET /reports/{uuid}` | `ReportResource` | Visualização real na página existente de relatórios |
| `GET /reports/{uuid}/pdf` | PDF autenticado ou erro JSON | Download com o hook e serviço existentes; disponível na tabela apenas quando `generated_document` existe |

`GET /reports/count` também existe, mas a tela aproveita `total_reports` do dashboard para evitar uma consulta redundante.

Os contratos foram conferidos em `src/Modules/Report/Presentation/Routes/api.php`, controllers, `ReportResource`, `ReportConsultationEloquentRepository` e `tests/Feature/ReportConsultationApiTest.php` do backend, exclusivamente por leitura.

## Semântica dos dados

O total e a contagem mensal contam registros de relatório acessíveis à sessão, incluindo rascunhos e revisões. A contagem mensal usa `created_at`, não a data da vistoria nem a data de geração. Os rótulos visuais são, portanto, **Relatórios registrados** e **Relatórios registrados por mês**. Não se presume que registros sejam vistorias distintas ou PDFs emitidos.

Os limites do período usam o calendário de `America/Bahia`; o mês atual integra os filtros. A coleção recente é ordenada por `created_at`, limitada a dez elementos, e mostra essa data em **Criado em**.

Os estados reais `DRAFT` e `GENERATED` aparecem como **Em elaboração** e **Gerado**. `GENERATED` não é interpretado como aprovação institucional. Estados desconhecidos permanecem visíveis conforme recebidos.

A coluna **Autor** e os cards no celular exibem `author.name`, retornado pelo dashboard. Registros com `author: null` mostram **Não informado**. O objeto representa o criador persistido e pode divergir de `created_by` em snapshots antigos; o frontend não resolve autoria por esse campo nem consulta `/users`.

## Dados ainda ausentes

- **Municípios visitados e forças vistoriadas:** o backend não fornece agregações com definição de vistoria, período ou deduplicação de revisões. Os cards existentes mostram `—` e comunicam a dependência; não são calculados a partir de uma amostra recente.
- **Série de vistorias por data da visita:** a contagem mensal disponível considera criação de relatórios. Uma agregação específica permanece necessária para restaurar esse indicador com sua semântica original.

As propostas de complementação estão em `APIS_PENDENTES_FRONTEND.md`; nenhuma rota proposta é chamada pelo dashboard.

## Falhas, autenticação e ações

- Loading mantém os skeletons existentes e oculta dados de uma sessão anterior.
- Erros do dashboard oferecem nova tentativa; HTTP 404 explica que a instalação ainda não publica o recurso.
- HTTP 401 em qualquer consulta ou download aciona o tratamento de sessão existente. HTTP 403 revalida o usuário pelo callback existente e apresenta o acesso negado.
- Uma falha não relacionada à autenticação no catálogo não impede exibir o total e os registros reais; os nomes afetados ficam indisponíveis.
- Uma falha mensal desabilita os períodos que dependem desse mês e oferece atualização. Um mês com falha nunca vira zero. `counts: []` confirmado pela API representa zero.
- Não há links diretos para armazenamento privado. O download solicita o PDF com Bearer, valida o arquivo pelo serviço existente, abre um link temporário local e revoga o recurso.
- A visualização navega para a página real; o dashboard não abre uma prévia demonstrativa.

## Organização e verificação

- Adapter e contratos: `src/service/dashboard-service.js`.
- Estado, cancelamento e nova tentativa: `src/hooks/use-dashboard-data.ts`.
- Composição, feedback e sessão: `src/views/Home.jsx`.
- Cards, gráfico e tabela existentes foram reutilizados; as ações compartilham `ReportActionProps`.
- `tests/dashboard-service.test.js` cobre contratos, autoria e autor nulo, autenticação, meses e virada de ano, zero real, respostas malformadas, falhas parciais e cancelamento.
