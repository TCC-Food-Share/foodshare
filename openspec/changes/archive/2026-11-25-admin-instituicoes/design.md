## Context

Motivação e escopo em `proposal.md`; comportamento em `specs/admin/instituicoes`, com os ajustes em `specs/admin/painel`,
`specs/auth/confirmacao-email` e nos dois `*/cadastro`. O que existe hoje e molda a solução:

- `EstablishmentsService` e `BeneficiaryEntitiesService` são quase iguais. `create(dto, image)`: confere unicidade
  (só na tabela do próprio tipo), `store(USERS, image)`, `auth.api.signUpEmail` (conta não confirmada, código enviado,
  sem sessão), e cria `Address` + instituição numa transação; se a transação falha, apaga o usuário e a imagem.
  `update(userId, dto, image?)`: confere unicidade de contato (de novo, só no próprio tipo), imagem antes, transação,
  imagem antiga apagada depois do commit. O erro de duplicidade é `409` com `message` e `fields`
  (`cnpj`, `institutionalEmail`, `institutionalPhone`, `personal`), sem `code`.
- Os DTOs públicos (`CreateEstablishmentDto`, `UpdateEstablishmentDto` e os da entidade) já têm as máscaras, o
  `@NoProhibitedContent()` em nome fantasia e descrição, o `trimToNull` do nome fantasia (DT40) e o `AddressDto`.
- `AccountDeletionService.closeEstablishment(tx, id, cancellation)` e `closeBeneficiaryEntity(...)` aplicam a RN28 e a
  RN29 com as travas da 4.4 (instituição `FOR UPDATE` → alimentos em ordem de id → pedidos) e devolvem `false` sem
  mudar nada quando a instituição já está excluída. `closeUser` (usuário `deleted` + sessões apagadas) e `impact`
  (contagem de pendentes e em andamento) são privados. O comentário de `ClosureCancellation` já prevê o painel
  passando o motivo e `ADMINISTRATOR`.
- Painel: `@AdminController`, `createAdminListQueryDto`, `paginateInMemory` (busca sem acento, id exato, ordenação,
  página), `sessionAdministrator(session)`, `AuditService.record(tx, entry)` e o padrão do `admin/administrators` da
  5.1. A busca por data em `dd/mm/aaaa` no fuso de Brasília já existe nos pedidos (`to_char(... AT TIME ZONE
  'America/Sao_Paulo')`).
- `RN48`: a tarefa de limpeza apaga usuário não confirmado com mais de 24 horas, junto da instituição e do endereço.
  Vale sem mudança para a instituição criada pelo painel.
- Frontend: o cadastro público é um wizard com passos que usam `useFormContext<SignUpInput>()`
  (`ResponsibleStep`, `InstitutionalStep`, `AddressStep` com CEP e `CityAutocomplete`, `ProfilePhotoStep`); o perfil
  usa `profileSchema` e `mapResponseToFormValues`. O router monta as seções por `ADMIN_LIST_PAGES[item.to]`.

## Goals / Non-Goals

**Goals:**

- Um único núcleo de cadastro e de edição de instituição, usado pelas rotas públicas e pelo painel, para as regras
  (unicidade, imagem, DT40, DT24) não divergirem.
- RN26 entre os dois tipos sem janela de corrida, sem migration.
- Exclusão lógica pelo painel reaproveitando exatamente o `closeEstablishment`/`closeBeneficiaryEntity` da 4.4.
- Auditoria de cada escrita na mesma transação.

**Non-Goals:**

- Mudar o formato da resposta de duplicidade do cadastro público (ver Pergunta em aberto da proposta).
- Mover a listagem para SQL paginado no banco: o volume de instituições de um TCC cabe em memória (Decisão 4).
- Tela de alimento ou de pedido do painel (5.4, 5.5).

## Decisions

### 1. Módulo `admin/institutions` e rotas

`AdminInstitutionsModule` (controller, service, DTOs, `institution-activity.ts` com as consultas do perfil), importado
no `AdminModule`, com `AuditModule`, `FilesModule`, `AccountDeletionModule` e os módulos de cadastro.

O tipo vai no caminho como segmento fixo, não como parâmetro livre: `establishments` ou `beneficiary-entities`,
validado por `ParseEnumPipe` sobre `INSTITUTION_KIND`. Os ids das duas tabelas se repetem, então todo endereço de uma
instituição leva o tipo.

| Rota                                                    | Corpo / query                                                         | Resposta                               |
| ------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------- |
| `GET /admin/institutions`                               | `page, pageSize, search, sort, order, type?, status?`                  | `Paginated<AdminInstitutionRowDto>`    |
| `POST /admin/institutions/:kind`                        | multipart, mesmo corpo do cadastro público + `image` obrigatória       | `201` `AdminInstitutionProfileDto`     |
| `GET /admin/institutions/:kind/:id`                     | —                                                                     | `AdminInstitutionProfileDto`           |
| `PATCH /admin/institutions/:kind/:id`                   | multipart parcial: campos do RF44 + `deleted?` + `cancellationReasonId?` | `200` `AdminInstitutionProfileDto`   |
| `GET /admin/institutions/:kind/:id/impact`              | —                                                                     | `{ pendingOrders, inProgressOrders }`  |
| `GET /admin/institutions/establishments/:id/foods`      | `page, pageSize`                                                      | `Paginated<AdminInstitutionFoodDto>`   |
| `GET /admin/institutions/:kind/:id/orders`              | `page, pageSize`                                                      | `Paginated<AdminInstitutionOrderDto>`  |
| `GET /admin/cancellation-reasons/options`               | —                                                                     | `{ id, name }[]`                       |

- `type` aceita `ESTABLISHMENT` e `BENEFICIARY_ENTITY`; `status` aceita `active` e `deleted`. `sort` aceita `type`,
  `companyName`, `tradeName`, `cnpj`, `responsibleName`, `city`, `state`, `createdAt` e `deleted`; sem `sort`, a ordem
  é `createdAt` decrescente.
- `AdminInstitutionProfileDto = { kind, id, companyName, tradeName, cnpj, institutionalEmail, institutionalPhone,
  description, image, address, responsible: { userId, name, email, personalPhone }, createdAt, deleted, emailVerified,
  activity }`, com `activity.foods` (só estabelecimento: `{ active, reserved, inactive, deleted }`) e `activity.orders`
  (`{ pending, inProgress, rejected, donated, cancelled }`, recebidos ou feitos conforme o tipo).
- `options` fica no controller de motivos da 1.3, declarada antes de `:id` para não colidir.
- DTOs do painel: `AdminCreateEstablishmentDto`/`AdminCreateBeneficiaryEntityDto` são os DTOs públicos (mesma classe,
  sem cópia). `AdminUpdateInstitutionDto` estende o `Update*Dto` público com `deleted` (`@IsBoolean`, com o
  `Transform` de `'true'`/`'false'` do multipart) e `cancellationReasonId` (`@IsInt`, `@Type(() => Number)`); o
  `ValidationPipe` com `forbidNonWhitelisted` já recusa `email`, `cnpj` e `companyName` com `400` (RN27).

### 2. Núcleo compartilhado de cadastro e edição

`institutions/institution-registration.service.ts` (módulo novo `InstitutionsCoreModule`, sem controller):

- `register(kind, dto, image, hooks?)`: o fluxo atual do `create`, parametrizado pelo tipo (papel e delegate do
  Prisma). `hooks.inTransaction(tx, institution)` roda dentro da transação que cria `Address` + instituição; o painel
  passa a gravação da auditoria por ele. Falha em qualquer ponto da transação mantém a compensação de hoje (apaga
  usuário e imagem).
- `applyUpdate(tx, kind, institution, dto, newImageKey)`: os updates de `user`, `address` e instituição que hoje
  ficam dentro do `update`, recebendo a instituição já carregada. Devolve os campos que mudaram (antes/depois) para a
  auditoria.
- `EstablishmentsService.create/update` e `BeneficiaryEntitiesService.create/update` passam a delegar a esse núcleo;
  o comportamento público não muda, salvo a RN26 (Decisão 3).

Alternativa: o painel chamar `EstablishmentsService.create` direto e auditar depois. Não dá auditoria na mesma
transação (a transação é interna ao `create`) e não serve para a edição, que hoje é por `userId` da sessão.

### 3. RN26 entre os dois tipos (DT52)

`InstitutionUniquenessService.findConflicts(client, values, exclude?)` confere, em paralelo:

- `user.email` e `user.personalPhone` (uma tabela só; inclui administradores e contas excluídas);
- `cnpj`, `institutionalEmail` e `institutionalPhone` em `establishment` **e** em `beneficiary_entity`, sem filtrar
  `deleted`;
- `exclude = { kind, institutionId, userId }` na edição, para não colidir consigo mesma.

Devolve os nomes reais dos campos (`cnpj`, `institutionalEmail`, `institutionalPhone`, `email`, `personalPhone`). As
rotas públicas juntam `email`/`personalPhone` em `personal` e mantêm o `409` de hoje (`message` + `fields`); as rotas
do painel respondem `409` com `code: INSTITUTION_DATA_ALREADY_REGISTERED` e os campos reais.

**Corrida entre tabelas:** as constraints `@unique` só protegem dentro de uma tabela. Toda transação que grava
`cnpj`, `institutionalEmail` ou `institutionalPhone` (cadastro e edição, pública ou do painel) começa com
`SELECT pg_advisory_xact_lock(<INSTITUTION_UNIQUENESS_LOCK>)` e refaz a conferência dentro da transação antes de
gravar. A trava é por transação (sai no commit/rollback), serializa só essas escritas, que são raras, e não interfere
nas travas de linha da 4.4. A primeira conferência, fora da transação, continua existindo para recusar o caso comum
sem gravar a imagem nem chamar o `signUpEmail`.

Alternativas: tabela de unicidade compartilhada (migration e mudança de modelo sem ganho real) ou trigger no banco
(regra de negócio escondida no SQL, fora do padrão do projeto). A trava consultiva é a menor mudança que fecha a janela.

### 4. Listagem em memória

O service busca os dois tipos com `select` só das colunas da linha (instituição, endereço e usuário), monta
`AdminInstitutionRowDto` e entrega ao `paginateInMemory`, depois de aplicar os filtros `type` e `status`:

- `searchText`: todos os campos do RF47 e do RF58, mais as versões só com dígitos de CNPJ, celulares e CEP, e a data de
  cadastro formatada `dd/MM/yyyy` em `America/Sao_Paulo` (`Intl.DateTimeFormat('pt-BR', { timeZone })`). O termo
  buscado é normalizado como hoje (sem acento, minúsculo); um termo só com dígitos e pontuação também é comparado
  sem a pontuação.
- O `id` da linha não é único entre os tipos. O `paginateInMemory` só usa o id para busca exata e desempate; o
  desempate passa a ser `kind` + `id` por uma chave `sortKey` composta no `sortValues`, e a busca exata por id fica como
  está (pode trazer as duas instituições de mesmo id, o que é aceitável numa busca).
- Ordem padrão: `createdAt` decrescente, passado ao helper como `sort = 'createdAt'`, `order = 'desc'` quando a query
  não traz `sort`.

Alternativa: `$queryRaw` com `UNION ALL`, `immutable_unaccent` e `LIMIT/OFFSET`. Mais escalável, mas reescreve busca,
dígitos e data em SQL para um volume pequeno. Fica registrado como caminho se o volume crescer.

### 5. Edição, exclusão lógica e restauração numa transação (DT49, DT50)

```
validar: cancellationReasonId só com deleted=true; deleted=true exige cancellationReasonId
         motivo existe e não é de sistema (fora da transação, 400)
conferir unicidade dos campos enviados (fora da transação, 409)
newImageKey = image ? store(USERS, image) : undefined
$transaction:
  se mexe em campo único: pg_advisory_xact_lock + nova conferência
  carregar instituição do tipo (404 se não existe)
  se deleted=true e ainda não excluída:
     closed = closeEstablishment|closeBeneficiaryEntity(tx, id, { reasonId, ADMINISTRATOR })   // trava a linha primeiro
     se closed: closeUser(tx, userId); audit soft_delete { reasonId, rejected, cancelled }
  se deleted=false e excluída:
     lock da instituição FOR UPDATE; instituição.deleted=false; user.deleted=false; audit restore
  changes = applyUpdate(tx, kind, instituição, dto, newImageKey)
  se changes: audit update { before, after }
depois do commit: removeQuietly(imagem antiga) se trocou
em erro: removeQuietly(newImageKey); P2002 → 409 INSTITUTION_DATA_ALREADY_REGISTERED
```

- A exclusão roda **antes** dos demais updates para respeitar a ordem de travas da 4.4 (instituição → alimentos →
  pedidos). Os updates seguintes tocam a mesma linha já travada.
- As contagens de rejeitados e cancelados para a auditoria vêm do retorno do `closeX`, que passa a devolver
  `{ closed, rejected, cancelled }` em vez de `boolean` (a autoexclusão só usa `closed`).
- `closeUser` e `impact` saem de `private` em `AccountDeletionService`; o impacto ganha uma variante por id de
  instituição (`impactOf({ establishmentId } | { beneficiaryEntityId })`).
- Restauração não mexe em alimentos nem pedidos (DT50); `user.deleted = false` volta a permitir o login, que já recusa
  pela `deleted` do usuário (RN32).
- `emailVerified` e sessões não mudam na edição comum.

Alternativa: rotas separadas `POST .../soft-delete` e `POST .../restore`. Mais simples de validar, mas o RF44 põe o
"deletado" dentro da edição; a 5.3 pode criar a rota dedicada da ação "Excluir" chamando o mesmo trecho.

### 6. Perfil completo e indicadores (DT51)

- Indicadores por `groupBy`: alimentos por `statusId` com `deleted = false` + `count` com `deleted = true`; pedidos
  por `statusId` filtrando `establishmentId` ou `beneficiaryEntityId`, sem filtrar `deleted` (o administrador vê
  tudo). Os ids de status vêm das constantes `FOOD_STATUS`/`ORDER_STATUS` e viram as chaves fixas do DTO.
- Listas: `findMany` com `skip/take` e `count`, ordenadas por data decrescente (`publishedAt` nos alimentos,
  `orderDate` nos pedidos). Alimento: `{ id, name (item do catálogo), quantity, unit (sigla), expirationDate, status,
  deleted }`. Pedido: `{ id, foodName, counterpartName (nome fantasia ou razão social), quantity, unit, orderDate,
  status, deleted }`.

### 7. Erros

`admin/institutions/institution.errors.ts`: `INSTITUTION_DATA_ALREADY_REGISTERED` (`409`, com `fields`) e
`CANCELLATION_REASON_REQUIRED`, `INVALID_CANCELLATION_REASON` e `CANCELLATION_REASON_WITHOUT_DELETE` (`400`). `404`
sem `code`, como nas outras seções.

### 8. Auditoria

`entityType` `Establishment` ou `BeneficiaryEntity`; ações `establishment.create|update|soft_delete|restore` e
`beneficiary_entity.*`. `create` grava `{ companyName, cnpj, email }`; `update`, `{ before, after }` só dos campos que
mudaram (imagem como chave do arquivo); `soft_delete`, `{ cancellationReasonId, rejectedOrders, cancelledOrders }`. O
`AuditService` já tira chaves com `password`.

### 9. Frontend

`features/admin/institutions/`:

- `institutions-api.ts`: tipos, `list`, `get`, `create(kind, values, image)`, `update(kind, id, changes, image?)`,
  `impact`, `foods`, `orders`, `cancellationReasonOptions`; mensagens por `code` e mapa de `fields` → campo do
  formulário.
- `institution-kind.ts`: slug da URL (`estabelecimentos`/`entidades`) ↔ segmento da API ↔ rótulo; rótulos de status
  vêm dos arquivos de rótulos que já existem (alimento, pedido).
- `admin-institutions-page.tsx`: `AdminTable` + `useAdminListParams` com dois `Select` de filtro no `toolbar` (estado
  na URL, binding direto em `field.value`); colunas da spec; selos "Excluída" e "Aguardando confirmação"; ações "Ver
  perfil" e "Editar". Registrada em `ADMIN_LIST_PAGES['/admin/instituicoes']`.
- `admin-institution-create-page.tsx` (`/admin/instituicoes/nova`): `RadioGroup` de tipo e, abaixo, um único
  `FormProvider` com o `signUpSchema` (imagem obrigatória) e os componentes de passo do cadastro público renderizados
  em sequência, como seções (`ResponsibleStep`, `InstitutionalStep`, `AddressStep`, `ProfilePhotoStep`). Sem wizard,
  então não há troca de botão de submit; `mode: 'onChange'`.
- `admin-institution-profile-page.tsx` (`/admin/instituicoes/:slug/:id`): cards de dados institucionais, responsável,
  endereço e situação; cards de indicadores; duas tabelas simples paginadas (`PaginationBar`, `PageSizeSelect`).
- `admin-institution-edit-page.tsx` (`/admin/instituicoes/:slug/:id/editar`): `profileSchema` +
  `mapResponseToFormValues` adaptados ao DTO do painel, diff com os valores iniciais, `ImagePicker`, campos fixos
  somente leitura; bloco "Situação da conta" com o `RadioGroup` que já existe ("Ativa" / "Excluída logicamente"; o
  projeto não tem `Switch` nem `Checkbox`) que, ao escolher a exclusão, busca o impacto e mostra o `SearchableSelect`
  de motivos (obrigatório no zod condicional); ao voltar para "Ativa" numa excluída, mostra o aviso da restauração. Sucesso → toast e volta ao perfil; invalida
  `['admin', 'institutions']`.
- Rotas novas no `router.tsx`, filhas do layout do painel, antes do redirecionamento de endereço inexistente.

## Risks / Trade-offs

- [Refatorar o cadastro público junto] → o comportamento público fica coberto pelos specs de serviço existentes
  (`establishments.service.spec.ts`, `beneficiary-entities.service.spec.ts`), que precisam continuar passando sem
  mudança de expectativa, exceto os cenários novos da RN26.
- [Trava consultiva global] → serializa só cadastros e edições de campos únicos de instituição; volume baixo. Se
  virar gargalo, a trava pode ser por hash do valor.
- [Listagem em memória] → carrega todas as instituições a cada página. Aceito para o volume do TCC (Decisão 4).
- [Restauração com dados que outra conta passou a usar] → impossível: a RN26 conta as excluídas, então os valores da
  excluída nunca ficam livres.
- [Admin exclui instituição que ainda não confirmou] → exclusão normal; a tarefa da RN48 ainda a apaga de vez depois
  de 24 horas, o que é coerente (a conta nunca entrou).
- [Corrida da exclusão pelo painel com a autoexclusão] → a primeira trava a linha; a segunda acorda com
  `deleted = true`, o `closeX` devolve `closed = false` e nada é refeito nem auditado como `soft_delete`.
- [Corrida com a tarefa da RN48] → a tarefa trava o usuário `FOR UPDATE`; a edição que chegar depois da exclusão de vez
  responde `404`.

## Migration Plan

Sem migration nem variável nova. Deploy normal no staging. Antes do deploy, conferir no banco do staging se já existe
CNPJ, e-mail ou celular institucional repetido entre as duas tabelas (consulta na tarefa 9.1); se existir, corrigir o
dado à mão, porque a partir daqui a edição desse campo em qualquer um dos dois passa a ser recusada. Rollback: reverter o merge.
