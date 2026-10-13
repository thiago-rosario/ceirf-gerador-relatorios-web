# Pesquisa e visualização de relatórios — entrega técnica

Data: 09/10/2026. Repositórios: `react-ceirf-gerador-relatorios-web` e `ceirf-gerador-relatorios-api`.

## A. Auditoria antes da implementação

O backend instalado usa PHP 8.4.23, Laravel 13.34.0, Dompdf 3.1.2 e Pest 5.2.1. O requisito do Composer continua sendo PHP `^8.3`; esta entrega não altera dependências. O frontend usa React 19, TypeScript, Vite e Tailwind, com navegação manual e componentes locais.

| Recurso | Situação encontrada |
| --- | --- |
| Criação, edição, geração e revisão de versão | Entidade, DTOs, adapters, usecases, repositórios e endpoints existentes. Reutilizados. Revisão de versão não equivale a decisão de aprovação humana. |
| Listagem | `GET /api/reports` existente, sem paginação; escolhia um único filtro pela precedência no controller. |
| Município | Consulta por ID existente. Não havia catálogo HTTP de municípios para o frontend. |
| Tipologia | Campo e validação de domínio existentes, sem filtro HTTP na listagem. |
| Consulta por ID | UUID real, entidade hidratada por mapper e resposta JSend existentes. Sem restrição de acesso a rascunhos. |
| PDF | Geração real Dompdf, nome institucional e armazenamento privado local existentes. Download existente com validação de caminho no controller. Sem opção inline. |
| Permissões | Autenticação `auth:api` com Bearer e bloqueio por troca obrigatória de senha. Escrita bloqueava apenas Viewer; não restringia coordenação. Leitura liberava registros privados para todo autenticado. |
| Estados | Somente `DRAFT` e `GENERATED`, explicitamente técnicos. Entidade/tabela de revisão humana existem, mas sem fila ou fluxo completo de aprovação/publicação. |
| Frontend | Seleção de coordenação, ações e regras visuais já existentes. Pesquisa era placeholder; não havia service de relatórios, catálogo de municípios, paginação ou PDF real. |
| Testes | Cobertura de domínio, persistência e geração existentes. `ReportApiTest` era um exemplo de GET `/` com expectativa incompatível com o bootstrap atual. |

A regra de consulta global foi confirmada pelo usuário: **`GENERATED`, excluindo versões com revisão pendente ou rejeitada**. Ela não cria transições de aprovação ou publicação. A coordenação escolhida na interface é contexto visual; a pesquisa permanece global.

| Perfil | Consulta global | Registros privados | Criação/escrita |
| --- | --- | --- | --- |
| Superusuário | Todos os consultáveis | Todas as coordenações | Todas as coordenações |
| Reviewer | Todos os consultáveis | Sua coordenação de origem | Sua coordenação |
| Criador (`OPERATOR`) | Todos os consultáveis | Seus próprios registros | Sua coordenação; escrita apenas de autoria própria |
| Viewer | Todos os consultáveis | Sem acesso | Sem permissão |

A autorização é aplicada no backend para ID, arquivo, edição, geração e revisão de versão. Coleções, histórico, última versão, dashboard e contagens seguem o mesmo escopo para impedir exposição por endpoints alternativos. A consulta global paginada sempre exclui rascunhos e versões com decisão incompleta ou não aprovada, inclusive para perfis administrativos; o acesso editorial continua disponível pelas consultas autorizadas existentes. A existência de uma revisão aprovada não sobrepõe outra revisão pendente/rejeitada na mesma versão.

O backend preserva sua organização em Domain, Application, Infra e Presentation. Não são criados módulos, bibliotecas visuais nem dependências.

## D. Contratos utilizados pela interface

Todas as operações exigem usuário ativo autenticado e senha sem troca obrigatória pendente. A autenticação atual é Bearer; o cliente também envia `credentials: include`, sem introduzir login por cookies no backend.

### Pesquisa

`GET /api/reports?page=1&per_page=10&municipality_id=123&typology=DEAM%201B`

A interface sempre envia `page` e `per_page`; a paginação ocorre no banco. `municipality_id` e `typology` são opcionais. O município é selecionado pelo ID do catálogo, evitando comparação por grafia ou acentuação. Tipologia compara o texto completo sem distinguir maiúsculas/minúsculas, removendo espaços nas bordas e preservando os espaços internos existentes no registro. Os filtros são combináveis e o ordenamento usa `created_at DESC, id DESC`, com desempate estável. `page` deve ser inteiro ≥ 1; `per_page` deve estar entre 1 e 100 (padrão 10); `municipality_id` deve ser inteiro positivo; `typology` aceita até 100 caracteres. Os parâmetros legados `user_id` (UUID) e `coordination_id` (inteiro positivo) continuam aceitos pela API, mas a interface não envia a coordenação visual como filtro. Informar apenas `per_page` também ativa paginação com página 1.

```json
{
  "status": "success",
  "data": {
    "reports": [],
    "pagination": {
      "current_page": 1,
      "per_page": 10,
      "total": 0,
      "last_page": 1,
      "from": null,
      "to": null
    }
  }
}
```

Cada item paginado contém metadados do registro, com os nomes em `snake_case` usados pelo projeto:

| Campo | Tipo/uso |
| --- | --- |
| `id`, `root_report_id`, `parent_report_id` | UUIDs do relatório/linhagem; parent pode ser nulo. |
| `status`, `revision_number`, `revision_label`, `is_generated`, `is_revision` | Estado técnico e identificação da versão. |
| `created_at`, `updated_at` | Datas serializadas em ISO 8601. |
| `cover` | Capa ou nulo; inclui `municipality.{id,name,state_code}` e `typology`. |
| `general_information` | Dados gerais ou nulo; inclui `inspection_date`, usada como data do relatório quando disponível. |
| `generated_document` | Nulo ou `{file_name, generated_at}`; nenhuma URL/caminho privado. |
| `coordination_id`, `report_type_id` | IDs persistidos de origem, possivelmente nulos em registros legados. |

A coleção mantém a chave `reports` existente. O modo legado sem parâmetros de paginação é mantido para compatibilidade, com aplicação das restrições de acesso.

### Metadados

`GET /api/reports/{uuid}` retorna `{ "status": "success", "data": { ...relatorio } }`. Campos utilizados: `id`, `status`, `created_at`, `cover.municipality.{id,name,state_code}`, `cover.typology`, `general_information.inspection_date` e `generated_document.{file_name,generated_at}`. O identificador exibido é o UUID real; não se inventa numeração institucional. O caminho privado do PDF não é exposto em `generated_document`. Para leitores sem escopo editorial, o histórico `uploaded_images` é omitido e os identificadores privados de todas as mídias são removidos. As respostas editoriais preservam os identificadores das mídias necessários ao fluxo existente; a coleção paginada entrega somente metadados de consulta.

### Catálogo

`GET /api/reports/municipalities` retorna `{ "status": "success", "data": { "municipalities": [{ "id": 123, "name": "...", "state_code": "BA" }] } }`.

O contexto do cabeçalho reutiliza `GET /api/coordinations`; ele não limita a listagem de relatórios.

### Arquivo

- `GET /api/reports/{uuid}/pdf`: download com `Content-Disposition: attachment`.
- `GET /api/reports/{uuid}/pdf?disposition=inline`: visualização com `Content-Disposition: inline`.

As duas operações reutilizam o mesmo arquivo privado e endpoint. Retornam `Content-Type: application/pdf`, `Content-Length`, nome de arquivo adequado em `Content-Disposition`, `Cache-Control: private, no-store` e `X-Content-Type-Options: nosniff`. `disposition` aceita somente `inline` ou `attachment`, com padrão `attachment`. O frontend obtém o Blob com autenticação, valida MIME/assinatura básica, cria uma URL temporária e libera os recursos ao trocar de documento ou desmontar. O visualizador nativo oferece navegação, zoom, download e impressão conforme suporte do navegador; há opção de abrir o PDF em outra aba.

### Erros

| HTTP | Significado |
| --- | --- |
| 401 | Sessão ausente, inválida ou expirada; interface retorna ao login com aviso. |
| 403 | Acesso ao registro/ação negado ou troca obrigatória de senha; interface mostra feedback e revalida usuário. |
| 404 | Relatório ou arquivo inexistente. |
| 409 | Documento ainda não gerado. |
| 422 | Parâmetro/UUID inválido ou conteúdo PDF inválido, conforme operação. |
| 500 | Falha inesperada ou de armazenamento; detalhes internos não são enviados à interface. |

Os controllers mantêm respostas `ResponseJsend` para erros tratados (`status: error`, `message`, `code`); no relatório inexistente, o código de domínio 2101 permanece no corpo e o HTTP é 404. A validação HTTP usa o formato Laravel `{message, errors}` já existente. O arquivo de sucesso é binário, sem envelope JSend.

## B. Alterações no backend

A tabela lista os arquivos desta entrega. A alteração preexistente em Identity não foi modificada.

| Arquivo | Responsabilidade e justificativa |
| --- | --- |
| [database/migrations/Report/2026_10_09_191130_add_coordination_id_to_reports.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/database/migrations/Report/2026_10_09_191130_add_coordination_id_to_reports.php) | Persistir a coordenação de origem, criar FK/índice e preencher dados legados pelo tipo ou autor; impedir que a transferência do autor altere o escopo do relatório. |
| [src/Modules/Report/Application/DTO/CreateReportInputDTO.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/DTO/CreateReportInputDTO.php) | Receber coordenação e tipo opcionais sem interromper os demais campos de criação. |
| [src/Modules/Report/Application/DTO/ReportCreationScopeDTO.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/DTO/ReportCreationScopeDTO.php) | Transportar o escopo de criação autorizado, independente de HTTP e Eloquent. |
| [src/Modules/Report/Application/DTO/ReportDataDTO.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/DTO/ReportDataDTO.php) | Transportar coordenação e tipo persistidos nas leituras, edições e versões. |
| [src/Modules/Report/Application/DTO/SearchReportsInputDTO.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/DTO/SearchReportsInputDTO.php) | Definir ator, filtros combináveis e parâmetros de paginação. |
| [src/Modules/Report/Application/DTO/SearchReportsOutputDTO.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/DTO/SearchReportsOutputDTO.php) | Entregar registros e metadados da página, preservando o formato legado sem paginação. |
| [src/Modules/Report/Application/DTO/ReportPdfFileDTO.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/DTO/ReportPdfFileDTO.php) | Transportar stream, nome e tamanho; fechar recursos remanescentes. |
| [src/Modules/Report/Application/Exception/ReportAccessDeniedException.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/Exception/ReportAccessDeniedException.php) | Comunicar rejeição de escopo sem acoplar a Application ao HTTP. |
| [src/Modules/Report/Application/Exception/ReportPdfUnavailableException.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/Exception/ReportPdfUnavailableException.php) | Distinguir indisponibilidade, ausência e conteúdo inválido do PDF. |
| [src/Modules/Report/Application/Interfaces/Adapter/ReportInputAdapterInterface.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/Interfaces/Adapter/ReportInputAdapterInterface.php) | Ampliar a conversão dos dados de criação com coordenação/tipo opcionais. |
| [src/Modules/Report/Application/Interfaces/Repository/ReportConsultationRepositoryInterface.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/Interfaces/Repository/ReportConsultationRepositoryInterface.php) | Contratar pesquisa paginada, catálogo e leituras auxiliares autorizadas. |
| [src/Modules/Report/Application/Interfaces/Service/ReportAccessServiceInterface.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/Interfaces/Service/ReportAccessServiceInterface.php) | Contratar autorização de leitura, escrita, escopo de criação e determinação em lote de referências editoriais autorizadas. |
| [src/Modules/Report/Application/Interfaces/Service/ReportPdfStorageInterface.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/Interfaces/Service/ReportPdfStorageInterface.php) | Isolar a obtenção do PDF privado da orquestração e do controller. |
| [src/Modules/Report/Application/Interfaces/Usecase/SearchReportsUsecaseInterface.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/Interfaces/Usecase/SearchReportsUsecaseInterface.php) | Contratar a consulta de relatórios com paginação e filtros. |
| [src/Modules/Report/Application/Interfaces/Usecase/ListReportMunicipalitiesUsecaseInterface.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/Interfaces/Usecase/ListReportMunicipalitiesUsecaseInterface.php) | Contratar o catálogo de municípios da pesquisa. |
| [src/Modules/Report/Application/Interfaces/Usecase/GetReportPdfUsecaseInterface.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/Interfaces/Usecase/GetReportPdfUsecaseInterface.php) | Contratar a recuperação do arquivo usando a consulta por ID existente. |
| [src/Modules/Report/Application/Service/ReportDataMapperService.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/Service/ReportDataMapperService.php) | Mapear coordenação/tipo entre entidade e DTO sem perder a origem. |
| [src/Modules/Report/Application/Usecase/CreateReportUsecase.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/Usecase/CreateReportUsecase.php) | Validar o escopo pelo serviço de acesso antes de inserir; reutilizar a criação existente. |
| [src/Modules/Report/Application/Usecase/SearchReportsUsecase.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/Usecase/SearchReportsUsecase.php) | Orquestrar pesquisa pelo contrato de leitura. |
| [src/Modules/Report/Application/Usecase/ListReportMunicipalitiesUsecase.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/Usecase/ListReportMunicipalitiesUsecase.php) | Orquestrar catálogo sem persistência no controller. |
| [src/Modules/Report/Application/Usecase/GetReportPdfUsecase.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Application/Usecase/GetReportPdfUsecase.php) | Consultar o relatório, identificar documento ainda não gerado e solicitar o arquivo ao storage. |
| [src/Modules/Report/Domain/Entity/ReportEntity.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Domain/Entity/ReportEntity.php) | Manter coordenação/tipo no agregado, na hidratação e nas revisões; preservar dados existentes. |
| [src/Modules/Report/Domain/Service/ReportAccessPolicy.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Domain/Service/ReportAccessPolicy.php) | Centralizar regras de consulta, criação e escrita por perfil, autoria, coordenação e decisões de revisão; sem Laravel. |
| [src/Modules/Report/Infra/Adapter/ReportInputAdapter.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Infra/Adapter/ReportInputAdapter.php) | Converter os campos de escopo seguindo o adapter existente. |
| [src/Modules/Report/Infra/Mapper/LegacyReportQueryMapper.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Infra/Mapper/LegacyReportQueryMapper.php) | Hidratar origem nos registros anteriores ao payload atual. |
| [src/Modules/Report/Infra/Mapper/ReportPersistenceMapper.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Infra/Mapper/ReportPersistenceMapper.php) | Persistir coordenação/tipo no payload e nas colunas relacionais. |
| [src/Modules/Report/Infra/Provider/ReportServiceProvider.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Infra/Provider/ReportServiceProvider.php) | Registrar os contratos e implementações de consulta, autorização e PDF no container. |
| [src/Modules/Report/Infra/Repositories/Commands/CreateReportEloquentRepository.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Infra/Repositories/Commands/CreateReportEloquentRepository.php) | Salvar origem no caminho de escrita legado. |
| [src/Modules/Report/Infra/Repositories/Commands/UpdateReportEloquentRepository.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Infra/Repositories/Commands/UpdateReportEloquentRepository.php) | Preservar origem ao atualizar no caminho legado. |
| [src/Modules/Report/Infra/Repositories/Queries/ReportConsultationEloquentRepository.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Infra/Repositories/Queries/ReportConsultationEloquentRepository.php) | Aplicar filtros e paginação SQL, catálogo ativo da Bahia e leituras auxiliares com escopo de acesso. |
| [src/Modules/Report/Infra/Repositories/Queries/ReportVisibilityQuery.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Infra/Repositories/Queries/ReportVisibilityQuery.php) | Aplicar a visibilidade a coleções, totais, histórico, última versão e dashboard, evitando vias alternativas de exposição. |
| [src/Modules/Report/Infra/Service/ReportAccessService.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Infra/Service/ReportAccessService.php) | Obter usuário, origem e decisões persistidas e delegar as regras à policy; consultar escopo editorial em lote para evitar consultas por item na serialização de coleções. |
| [src/Modules/Report/Infra/Service/ReportPdfStorage.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Infra/Service/ReportPdfStorage.php) | Ler arquivo privado em stream, validar caminho pertencente ao relatório, assinatura/terminador e disponibilidade. |
| [src/Modules/Report/Infra/Service/ReportPersistenceService.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Infra/Service/ReportPersistenceService.php) | Preservar origem nas transações de criação, edição e revisão atuais. |
| [src/Modules/Report/Model/Report.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Model/Report.php) | Declarar o campo de persistência coordination_id e seu cast; sem regras de autorização no model. |
| [src/Modules/Report/Presentation/Http/Controllers/ListReportsController.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Controllers/ListReportsController.php) | Converter a entrada validada para DTO, invocar a pesquisa e retornar JSend com coleção e paginação. |
| [src/Modules/Report/Presentation/Http/Controllers/ListReportMunicipalitiesController.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Controllers/ListReportMunicipalitiesController.php) | Entregar o catálogo real pelo usecase e padrão JSend. |
| [src/Modules/Report/Presentation/Http/Controllers/CreateReportRevisionController.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Controllers/CreateReportRevisionController.php) | Preservar respostas editoriais autorizadas das revisões existentes, sem expor o caminho privado do PDF. |
| [src/Modules/Report/Presentation/Http/Controllers/FindByIdReportController.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Controllers/FindByIdReportController.php) | Consultar pelo usecase existente e escolher serialização de leitura/editorial conforme autorização do serviço. |
| [src/Modules/Report/Presentation/Http/Controllers/GenerateReportController.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Controllers/GenerateReportController.php) | Preservar metadados editoriais na resposta de geração autorizada. |
| [src/Modules/Report/Presentation/Http/Controllers/UpdateReportController.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Controllers/UpdateReportController.php) | Preservar metadados editoriais na resposta de edição autorizada. |
| [src/Modules/Report/Presentation/Http/Controllers/CreateReportController.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Controllers/CreateReportController.php) | Encaminhar campos de origem ao adapter e traduzir rejeição de escopo para HTTP 403. |
| [src/Modules/Report/Presentation/Http/Controllers/DownloadReportPdfController.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Controllers/DownloadReportPdfController.php) | Entregar stream inline/attachment e cabeçalhos HTTP; traduzir erros sem expor detalhes internos de armazenamento. |
| [src/Modules/Report/Presentation/Http/Controllers/CountAllReportsController.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Controllers/CountAllReportsController.php) | Usar contagem com visibilidade do ator autenticado. |
| [src/Modules/Report/Presentation/Http/Controllers/CountReportsByMonthController.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Controllers/CountReportsByMonthController.php) | Aplicar o mesmo escopo às contagens mensais. |
| [src/Modules/Report/Presentation/Http/Controllers/FindLatestReportController.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Controllers/FindLatestReportController.php) | Consultar somente versões que o ator pode acessar. |
| [src/Modules/Report/Presentation/Http/Controllers/FindReportHistoryController.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Controllers/FindReportHistoryController.php) | Filtrar histórico por acesso de cada versão. |
| [src/Modules/Report/Presentation/Http/Controllers/GetDashboardReportsController.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Controllers/GetDashboardReportsController.php) | Aplicar visibilidade aos dados e totais do dashboard existente. |
| [src/Modules/Report/Presentation/Http/Requests/CreateReportRequest.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Requests/CreateReportRequest.php) | Bloquear Viewer mantendo validação HTTP no Form Request. |
| [src/Modules/Report/Presentation/Http/Requests/ReportPayloadRequest.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Requests/ReportPayloadRequest.php) | Validar coordenação/tipo opcionais na criação usando tabelas existentes. |
| [src/Modules/Report/Presentation/Http/Requests/ListReportsRequest.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Requests/ListReportsRequest.php) | Validar filtros, normalizar bordas da tipologia e limitar páginas/tamanho; per_page sozinho ativa paginação. |
| [src/Modules/Report/Presentation/Http/Requests/ReportIdRequest.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Requests/ReportIdRequest.php) | Delegar autorização de leitura ao serviço e validar UUID. |
| [src/Modules/Report/Presentation/Http/Requests/WriteReportIdRequest.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Requests/WriteReportIdRequest.php) | Delegar autorização de escrita ao serviço; proteger geração e revisão de versões existentes. |
| [src/Modules/Report/Presentation/Http/Requests/UpdateReportRequest.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Requests/UpdateReportRequest.php) | Aplicar autorização de escrita à edição, preservando a validação do payload. |
| [src/Modules/Report/Presentation/Http/Requests/ReportPdfRequest.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Http/Requests/ReportPdfRequest.php) | Reutilizar autorização por ID e validar disposition inline ou attachment. |
| [src/Modules/Report/Presentation/Resources/ReportResource.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Resources/ReportResource.php) | Serializar DTOs no formato existente; ocultar caminho do PDF em todas as respostas e sanitizar histórico/mídias para leitores sem escopo editorial, preservando referências autorizadas para edição. |
| [src/Modules/Report/Presentation/Resources/ReportConsultationResource.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Resources/ReportConsultationResource.php) | Entregar somente campos necessários à coleção de consulta paginada. |
| [src/Modules/Report/Presentation/Routes/api.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/src/Modules/Report/Presentation/Routes/api.php) | Adicionar apenas o catálogo de municípios; reutilizar rotas de consulta e PDF existentes. |
| [tests/Feature/ReportConsultationApiTest.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/tests/Feature/ReportConsultationApiTest.php) | Validar contratos, filtros, paginação, PDF real, falhas, quatro perfis, origem estável e migration. |
| [tests/Feature/ReportApiTest.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/tests/Feature/ReportApiTest.php) | Corrigir a expectativa do exemplo da rota raiz para o 404 que o bootstrap já produz. |
| [tests/Unit/Report/Application/Service/ReportDataMapperServiceTest.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/tests/Unit/Report/Application/Service/ReportDataMapperServiceTest.php) | Verificar os novos campos de origem nos DTOs existentes. |
| [tests/Unit/Report/Application/Usecase/CreateReportUsecaseTest.php](/Users/thiago/INOVA/ceirf-gerador-relatorios-api/tests/Unit/Report/Application/Usecase/CreateReportUsecaseTest.php) | Cobrir a autorização obrigatória antes da persistência sem alterar testes de criação válidos. |

A migration é necessária porque a coordenação antes dependia do vínculo mutável do autor ou de um tipo opcional. Ela salva a origem do relatório e conserva esse vínculo nas revisões. Foi aplicada à base local pela execução isolada do novo arquivo; nenhuma base de produção foi alterada. O catálogo de tipos existente não tem carga inicial completa: quando não há tipo único disponível, o relatório conserva a coordenação sem inventar um tipo. Registros legados cuja origem não pode ser determinada permanecem com valor nulo, sem ampliar acesso privado.

## C. Alterações no frontend

| Arquivo | Responsabilidade e justificativa |
| --- | --- |
| [src/views/SearchReports.tsx](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/src/views/SearchReports.tsx) | Página de pesquisa global: contexto de coordenação, filtros, consulta inicial, limpeza, total, paginação e feedback. |
| [src/views/ViewReport.tsx](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/src/views/ViewReport.tsx) | Página de visualização: UUID real, metadados, PDF autenticado, download, retorno à pesquisa e erros. |
| [src/views/Reports.tsx](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/src/views/Reports.tsx) | Resolver as novas páginas na navegação atual e reutilizar o catálogo de coordenações apenas para contexto visual. |
| [src/views/CoordinationActions.tsx](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/src/views/CoordinationActions.tsx) | Incluir o contexto visual da coordenação no link para pesquisa global. |
| [src/views/ReportDestination.tsx](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/src/views/ReportDestination.tsx) | Retirar o placeholder de pesquisa; preservar os destinos de criação e revisão existentes. |
| [src/components/reports/ReportsShell.tsx](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/src/components/reports/ReportsShell.tsx) | Reutilizar o layout CEIRF, com título e retorno adequados à visualização. |
| [src/components/reports/MunicipalityPicker.tsx](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/src/components/reports/MunicipalityPicker.tsx) | Seleção com busca textual pelo Combobox da dependência Base UI já instalada. |
| [src/components/reports/ReportsTable.tsx](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/src/components/reports/ReportsTable.tsx) | Tabela em telas maiores, cartões em telas menores e ações por UUID sem dados fixos. |
| [src/components/reports/ReportPagination.tsx](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/src/components/reports/ReportPagination.tsx) | Navegação numerada limitada a páginas existentes, primeira/última página, recuperação de página fora do intervalo e controles acessíveis. |
| [src/components/reports/ReportPdfViewer.tsx](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/src/components/reports/ReportPdfViewer.tsx) | Incorporar o visualizador nativo, com loading, indisponibilidade, falhas e recuperação. |
| [src/hooks/use-reports.ts](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/src/hooks/use-reports.ts) | Compartilhar consultas canceláveis, revalidação da sessão, Blob/Object URL, download e liberação de recursos. |
| [src/service/reports-service.js](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/src/service/reports-service.js) | Centralizar API real, validação dos contratos, PDF e nome seguro do arquivo; componentes não fazem HTTP direto. |
| [src/service/reports-navigation.js](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/src/service/reports-navigation.js) | Interpretar/construir URLs de filtro e retorno, corrigir páginas fora do intervalo, validar UUID e formatar a data sem deslocamento de fuso. |
| [src/service/api-client.js](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/src/service/api-client.js) | Ampliar o cliente compartilhado para cancelamento, timeout e resposta binária, preservando Bearer e tratamento de erros existente. |
| [src/service/reports-access.js](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/src/service/reports-access.js) | Reconhecer a rota de visualização e preservar permissões visuais existentes. |
| [src/types/reports.ts](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/src/types/reports.ts) | Tipar municípios, metadados, paginação, filtros e PDF recebidos da API. |
| [src/router/router.tsx](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/src/router/router.tsx) | Observar query string junto ao pathname e passá-la ao fluxo de relatórios. |
| [tests/reports-service.test.js](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/tests/reports-service.test.js) | Cobrir consultas, contratos, autenticação, cancelamento, timeout, erros e PDF inválido. |
| [tests/reports-navigation.test.js](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/tests/reports-navigation.test.js) | Cobrir parâmetros de URL, preservação/limpeza, retorno seguro, UUID e datas. |
| [tests/reports-pages.test.js](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/tests/reports-pages.test.js) | Cobrir renderização SSR das páginas/componentes, metadados, estados, links, paginação e seleção. |
| [tests/reports-ui.test.js](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/tests/reports-ui.test.js) | Atualizar links de contexto e isolar o cache Vite dos testes para não interferir no servidor de desenvolvimento. |
| [docs/relatorios-pesquisa-visualizacao.md](/Users/thiago/INOVA/react-ceirf-gerador-relatorios-web/docs/relatorios-pesquisa-visualizacao.md) | Registrar auditoria, inventário, contratos efetivos, verificações e limitações desta entrega. |

Rotas efetivas: `/relatorios/pesquisar` e `/relatorios/:reportId`. Filtros aplicados usam `municipality_id`, `typology` e `page` na URL; `coordination_id` é somente contexto visual e não é enviado como restrição à API de pesquisa. A visualização guarda `return_to` para restaurar a pesquisa. Alterar ou limpar filtros retorna à página 1. Uma URL com página acima de `last_page` é corrigida com substituição no histórico, preservando os filtros e evitando ciclos no botão voltar.

Foram reutilizados AppLayout, ReportsShell, Button, Input, Table, Skeleton, ícones Lucide, o catálogo de coordenações e a sessão existentes. Não foi adicionada biblioteca de PDF; o iframe recebe apenas URL Blob temporária de uma requisição autenticada.

## E. Testes, resultados e limites

Execução inicial, anterior às alterações: frontend **169/169 aprovados**; backend **764/765 aprovados**, com falha preexistente em `ReportApiTest` (rota `/` já removida retorna 404).

| Verificação final | Resultado efetivamente obtido |
| --- | --- |
| Backend completo: `vendor/bin/pest --compact` | **869/869 aprovados**, 3.801 assertions, 34,8 s. Executado após as correções finais. |
| HTTP novo + exemplo da raiz, SQLite | **104/104 aprovados**, 522 assertions; inclui os 103 cenários novos. |
| HTTP novo, PostgreSQL 17 real | **103/103 aprovados**, 521 assertions, 6,57 s; base temporária isolada removida ao concluir. |
| Regressões existentes do módulo Report | **385/385 aprovados**, 1.310 assertions. Também incluídas na suíte completa. |
| PHPStan completo, nível 7 | **0 erros**; execução `--debug --no-progress --memory-limit=512M` para evitar o servidor paralelo bloqueado pelo sandbox. |
| Pint: `vendor/bin/pint --dirty --format agent` | Aprovado. |
| Frontend: `npm test` | **223/223 aprovados**, 54 cenários a mais que a execução inicial. |
| Frontend: `npm run build` | TypeScript e Vite aprovados; permanece aviso de chunk principal acima de 500 kB (aproximadamente 557,9 kB). |
| Frontend: `npm run lint` | Aprovado, sem avisos/erros. |
| `git diff --check`, nos dois repositórios | Sem erros de whitespace. |
| Migration | Backfill e rollback cobertos nos testes SQLite/PostgreSQL; nova migration aplicada com sucesso à base local. |

Os testes HTTP usam usuários/perfis reais nas factories, autenticação pelo endpoint existente, persistência e PDFs binários gerados por Dompdf para fixtures de teste. Cobrem consulta global, filtros combinados, paginação, metadados, ausência de relatório/arquivo, inline/download/cabeçalhos, indisponibilidade, conteúdo inválido, falha de leitura, caminho indevido, pendência/rejeição, autorização, revisão de versão, origem após transferência do autor e sanitização de mídias. Dados de teste não foram inseridos na base local utilizada pela aplicação.

Os testes frontend cobrem o contrato da API, Bearer/credentials, erros HTTP/rede/timeout, cancelamento, MIME/assinatura/terminador do PDF, nomes de arquivo, URLs de filtros/retorno, correção idempotente de página fora do intervalo e renderização SSR de páginas/componentes. As suites SSR usam caches temporários próprios, evitando interferência com a otimização do Vite em desenvolvimento.

No navegador Firefox, com sessão Reviewer existente e API local real, foi observada a página de pesquisa, cabeçalho/contexto COTEC, catálogo de municípios habilitado e resposta de **zero resultados** com feedback visível. A base local não continha relatórios consultáveis com PDF para validar manualmente o fluxo completo com documentos.

Limites e pendências:

- Os testes Node/SSR não executam interações e efeitos no DOM. Download efetivo pelo navegador, revogação de Blob observada no navegador, zoom, impressão, navegação entre páginas do PDF e comparação visual em viewport móvel **não foram validados manualmente** nesta entrega. Renderização, branches de estado, contratos e classes responsivas foram verificados automaticamente.
- A verificação de PDF confirma MIME, cabeçalho e terminador. Não substitui um parser completo de corrupção estrutural. O visualizador nativo oferece sua própria mensagem para arquivos que não consegue interpretar e a página mantém ações de abertura/download; esses controles variam conforme o navegador.
- A aprovação/publicação humana completa e sua fila/tela de revisão continuam dependendo da implementação desse fluxo no projeto. Esta entrega respeita os estados/decisões existentes e a regra confirmada para consulta, sem introduzir transições novas. Destinos frontend de criação/revisão existentes permanecem como estavam.
- A carga administrativa do catálogo de tipos de relatório continua necessária quando se deseja um subtítulo/tipo institucional específico. A interface utiliza os dados disponíveis e o UUID real, sem gerar numeração fictícia.

As alterações estão nos arquivos locais dos dois repositórios, sem instalação de dependências. A única mudança na base local foi a migration de origem; não houve implantação em produção.
