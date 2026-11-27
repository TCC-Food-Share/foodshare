## Context

Motivação e escopo em `proposal.md`; comportamento em `specs/admin/alimentos` e `specs/admin/painel`. O que existe hoje
e molda a solução:

- `foods/foods.service.ts` (2.1, 2.2) já tem a edição do estabelecimento: trava o alimento com `lockFood`
  (`SELECT … FOR UPDATE`), confere status e pedido `Em andamento` dentro da transação e chama
  `applyNewQuantityToPendingOrders` (`food-order-effects.ts`), que aplica a RN20 com dois `updateMany`. A prévia
  (`quantityImpact`) conta os mesmos `where` (`totalOrdersToUpdateWhere`, `partialOrdersToRejectWhere`).
  `checkFoodQuantity` (`food-quantity.ts`) valida fração e "Somente parcial" (DT21). Os códigos `FOOD_NOT_ACTIVE`,
  `FOOD_HAS_ORDERS_IN_PROGRESS`, `EXPIRATION_DATE_IN_PAST`, `INVALID_CATALOG_ITEM`, `INVALID_MEASUREMENT_UNIT`,
  `FRACTION_NOT_ALLOWED` e `PARTIAL_ONLY_QUANTITY_TOO_LOW` já existem em `foods.constants.ts`.
- `account-deletion/institution-locks.ts` fixa a ordem de travas da 4.4: instituição → alimentos (id crescente) →
  pedidos. A exclusão lógica e a permanente de estabelecimento travam o estabelecimento `FOR UPDATE`; a criação de
  alimento trava `FOR SHARE` (`lockLiveEstablishmentForShare`).
- `admin-institutions.service.ts` (5.2, 5.3) tem o padrão do painel: listagem em memória com `paginateInMemory` e
  `normalizeText`, data de cadastro formatada no fuso de Brasília com `Intl.DateTimeFormat`, auditoria pelo
  `AuditService` na mesma transação, imagem trocada com `ImageStorageService.store` antes e `removeQuietly` depois do
  commit, e um `lockOrders` privado que trava pedidos em ordem de id antes de um `deleteMany` (o comentário já cita a
  5.4).
- `@AdminController('<recurso>')`, `sessionAdministrator(session)`, `@ImageUpload({ body, required })` e
  `ImageFilePipe` são o padrão das rotas do painel com upload.
- Frontend: `AdminTable`, `use-admin-list-params` (estado na URL), `SearchableSelect`, os rótulos de
  `features/foods/food-status.ts` e `food-request-type.ts`, o formulário de cadastro (`create-food-dialog.tsx`,
  `create-food-schema.ts`) e os diálogos destrutivos de `features/admin/institutions/`. A seção "Alimentos" hoje cai no
  `AdminPlaceholderPage` porque não está em `ADMIN_LIST_PAGES`.

## Goals / Non-Goals

**Goals:**

- Edição do administrador com as mesmas garantias da edição do estabelecimento: uma transação, trava no alimento,
  checagem de estado dentro dela e efeitos nos pedidos sem janela de corrida.
- Prévia e edição calculando os efeitos pela mesma função, para a tela nunca prometer um número diferente do que o
  servidor faz.
- Exclusão permanente sem deadlock com a exclusão lógica e a permanente de estabelecimento.
- Reaproveitar o que já existe em `foods/` e no painel em vez de copiar.

**Non-Goals:**

- Busca e ordenação em SQL (`$queryRaw` com `unaccent`) como no feed: o painel segue o padrão em memória da 5.2 (ver
  Decisão 6).
- Mudar a edição do estabelecimento (`PATCH /foods/mine/:id`): ela continua só com validade e quantidade (RN20).
- Tela de auditoria (DT09).

## Decisions

### 1. Módulo `admin/foods` separado de `foods/`

`AdminFoodsModule` (`admin/foods/`) com `AdminFoodsController` (`@AdminController('foods')`), `AdminFoodsService`,
`admin-food.dto.ts` e `admin-food.errors.ts`, importado pelo `AdminModule`. Rotas:

| Rota                              | Uso                                         |
| --------------------------------- | ------------------------------------------- |
| `GET /admin/foods`                | listagem (RF52, DT60)                       |
| `GET /admin/foods/:id`            | detalhe com contagem de pedidos (RF53)      |
| `GET /admin/foods/:id/edit-impact`| prévia dos efeitos da edição (DT58)         |
| `PATCH /admin/foods/:id`          | edição multipart (RF50, DT57, DT58)         |
| `DELETE /admin/foods/:id`         | exclusão permanente, `204` (RF51, DT59)     |

O service importa as funções puras e os helpers de transação de `foods/` (`lockFood`, `orderStatusId`,
`applyNewQuantityToPendingOrders`, `checkFoodQuantity`, constantes), sem depender do `FoodsService`, que é todo
amarrado ao `userId` do estabelecimento.

Alternativa: métodos `admin*` no `FoodsService`. Misturaria duas regras de permissão (dono × administrador) no mesmo
service e quebraria a separação `/admin/*` das convenções.

### 2. Efeitos da edição numa função pura de plano + aplicação

`food-order-effects.ts` ganha:

```ts
interface FoodEditTarget { catalogItemId; measurementUnitId; requestType; quantity }  // valores finais
function pendingOrdersEffect(current: FoodEditTarget, next: FoodEditTarget):
  { rejectAll: boolean; rejectType: OrderType | null; newQuantity: number | null }
```

- `rejectAll` quando `catalogItemId` ou `measurementUnitId` mudou;
- senão `rejectType` = `PARTIAL` se o tipo virou `TOTAL_ONLY`, `TOTAL` se virou `PARTIAL_ONLY`, `null` nos demais;
- `newQuantity` quando a quantidade mudou.

Duas consumidoras:

- **Aplicação** (`applyAdminEditToPendingOrders(tx, foodId, effect)`): `rejectAll` → `rejectAllPendingOrders`; senão
  `updateMany` dos pendentes do `rejectType` para `Rejeitado`; depois, se `newQuantity`, `applyNewQuantityToPendingOrders`
  sobre o que sobrou. Devolve `{ updated, rejected }` somando os `count` dos `updateMany`, para a auditoria.
- **Prévia** (`countAdminEditEffect(client, foodId, effect)`): `rejectAll` → conta todos os pendentes como rejeitados e
  0 atualizados; senão conta os do `rejectType` e, com `newQuantity`, soma os parciais que não cabem
  (`partialOrdersToRejectWhere`) e os totais a atualizar (`totalOrdersToUpdateWhere`), ambos excluindo o tipo já
  rejeitado.

Para isso, `applyNewQuantityToPendingOrders` e `rejectAllPendingOrders` passam a devolver os `count` (hoje `void`);
as chamadas existentes ignoram o retorno.

Alternativa: só aplicar e, na prévia, rodar a edição numa transação com rollback. Funciona, mas trava o alimento e os
pedidos a cada tecla na tela; a função de plano dá o mesmo número sem escrita.

### 3. Transação da edição

```
valida DTO (class-validator, @NoProhibitedContent em description/notes)
se veio imagem: imageKey = storage.store('foods', image)        // antes da transação
$transaction:
  food0 = findUnique(id) → 404 se não existe                    // só para achar o establishmentId
  lockEstablishmentForShare(establishmentId)                    // ordem da 4.4: instituição → alimento → pedidos
  lockFood(id); food = findUnique(id, include unidade/status) → 404 se sumiu
  food.deleted → 409 FOOD_DELETED; status ≠ Ativo → 409 FOOD_NOT_ACTIVE
  pedido Em andamento → 409 FOOD_HAS_ORDERS_IN_PROGRESS
  resolve item do catálogo e unidade enviados → 400 INVALID_*
  checkFoodQuantity(quantidade final, unidade final, tipo final) → 400
  vencimento enviado e diferente → DT26; publicação enviada e diferente → não futura
  update(campos enviados que mudaram, image = imageKey)
  effect = pendingOrdersEffect(atual, final); counts = applyAdminEditToPendingOrders
  se algo mudou: audit food.update { changes: {campo: {from, to}}, updatedOrders, rejectedOrders }
commit → removeQuietly(imagem anterior)
falha → removeQuietly(imageKey) e relança
```

- `lockEstablishmentForShare` é helper novo em `institution-locks.ts`, igual ao `lockLiveEstablishmentForShare` mas sem
  `deleted = false`: o estabelecimento excluído também precisa ser travado (a exclusão permanente dele trava
  `FOR UPDATE`). Com o `FOR SHARE`, a edição espera uma exclusão lógica do estabelecimento em curso e, depois dela, vê o
  alimento `deleted = true` e responde `FOOD_DELETED`.
- O "não futura" da publicação compara a data enviada (`yyyy-mm-dd`) com o dia de hoje em `America/Sao_Paulo`. A data
  nova é gravada como meia-noite de Brasília (`yyyy-mm-ddT03:00:00Z`). Publicação enviada igual ao dia atual gravado não
  conta como mudança e mantém o horário original.
- O vencimento segue o formato que o cadastro grava (`new Date('yyyy-mm-dd')`, meia-noite UTC) e a mesma checagem do
  `FoodsService.assertNotPast`, extraída para `food-dates.ts` e usada pelos dois services.
- Observações: no multipart, `notes` vazio vira `null` (apaga); ausente não muda. `description` vazia é recusada.
- O DTO (`AdminUpdateFoodDto`) tem todos os campos opcionais, com os mesmos validadores do `CreateFoodDto`. Nenhum campo
  e nenhuma imagem → `400`. Campos enviados iguais aos atuais não geram auditoria nem efeitos.

### 4. Exclusão permanente

```
$transaction:
  food0 = findUnique(id) → 404
  lockEstablishmentForShare(establishmentId)
  lockFood(id); food = findUnique(id, include catálogo/estabelecimento/status) → 404 se sumiu
  counts = order.groupBy(statusId) where foodId = id             // para a auditoria
  lockOrders({ foodId: id }); order.deleteMany({ foodId: id }); food.delete(id)
  audit food.delete { foodName, establishment: { id, companyName }, deletedOrders: {Pendente: n, …} }
commit → removeQuietly(food.image)
```

- Mesma ordem de travas da 4.4, então não há deadlock com a exclusão lógica ou permanente do estabelecimento (que
  travam o estabelecimento `FOR UPDATE` primeiro) nem com o aceite e o cancelamento (que travam o alimento antes dos
  pedidos).
- Duas exclusões simultâneas: a segunda espera a trava do alimento e, depois do commit da primeira, o `findUnique` não
  acha nada → `404`.
- Nenhuma devolução de estoque: o alimento sai junto (DT59). Os lembretes de WhatsApp da 6.2 saem em cascata com o
  pedido.
- `lockOrders` sai de `admin-institutions.service.ts` para `orders/order-locks.ts` e passa a ser usado pelos dois
  services (e pela 5.5).

### 5. Erros novos

`admin-food.errors.ts`: `foodDeleted()` → `409 { code: 'FOOD_DELETED' }` e `publishedAtInFuture()` →
`400 { code: 'PUBLISHED_AT_IN_FUTURE' }`. Os demais reaproveitam as constantes de `foods.constants.ts`, para o
frontend usar um único mapa de mensagens por `code`.

### 6. Listagem em memória, como na 5.2

O service carrega os alimentos com `catalogItem.category`, `measurementUnit`, `status` e
`establishment { companyName, tradeName, deleted }`, aplica os filtros de status e situação no `where` do Prisma, e
busca e ordena em memória com `paginateInMemory`:

- texto (`normalizeText`): nome do item do catálogo, categoria, razão social e nome fantasia;
- datas: vencimento e publicação formatadas em `dd/mm/aaaa` no fuso de Brasília, casando por trecho (DT34, DT53);
- `sortValues`: `name`, `category`, `quantity`, `status`, `establishment` (nome público), `expirationDate`,
  `publishedAt`; padrão `publishedAt desc`.

O DTO de query estende `createAdminListQueryDto` com `status` (`IsIn(FOOD_STATUS_NAMES)`) e `situation`
(`active`/`deleted`).

Alternativa: SQL com `unaccent` e `to_char(... AT TIME ZONE 'America/Sao_Paulo')`, como o feed. Escala melhor, mas
duplica o padrão de busca do painel e a ordenação por campo; no volume esperado do TCC (centenas a poucos milhares de
alimentos) a leitura em memória fica dentro do RNF04. Se crescer, troca-se só o service.

### 7. Detalhe com contagem de pedidos

`GET /admin/foods/:id` devolve o `AdminFoodDetailDto` (campos do RF53, ids do item e da unidade para preencher a edição,
`allowsFraction` da unidade, `establishment { id, publicName, companyName, deleted }`) e
`orders: { pending, inProgress, rejected, donated, cancelled }` por `groupBy`, como o `institutionActivity` da 5.2. A
tela deriva "pode editar" (`!deleted && status = Ativo && inProgress = 0`) e o diálogo de exclusão usa as mesmas
contagens, sem rota extra. O servidor continua sendo quem decide na edição.

### 8. Opções de item do catálogo e de unidade para o painel

`GET /catalog/food-items` e `GET /catalog/measurement-units` são só das instituições
(`@RequireRoles(...INSTITUTION_ROLES)`), e as convenções não deixam o administrador usar rotas de
instituição. Seguindo o precedente de `GET /admin/cancellation-reasons/options` (5.2), os controllers
de lista do painel ganham `GET /admin/food-items/options` e `GET /admin/measurement-units/options`,
sem paginação e com a mesma resposta do `/catalog`, delegando ao `CatalogService` (agora exportado
pelo `CatalogModule` e importado pelo `AdminListsModule`). Achado na verificação no navegador: a
edição recebia `403` ao carregar os selects.

### 9. Frontend

- `features/admin/foods/`: `admin-foods-page.tsx` (tabela, filtros, ações), `admin-food-detail-page.tsx`,
  `admin-food-edit-page.tsx`, `delete-food-permanently-dialog.tsx`, `edit-impact-dialog.tsx` e `admin-foods-api.ts`
  (`list`, `get`, `editImpact`, `update` multipart, `remove`, mapa `ADMIN_FOOD_ERROR_MESSAGES` por `code`).
- Rotas: `/admin/alimentos` entra em `ADMIN_LIST_PAGES`; `/admin/alimentos/:id` e `/admin/alimentos/:id/editar` ao lado
  das rotas de instituições no `router.tsx`.
- Formulário da edição: schema zod próprio (`admin-food-edit-schema.ts`) que reaproveita as regras de quantidade de
  `create-food-schema.ts` (fração pela unidade, mínimo de "Somente parcial") e acrescenta a publicação não futura; a
  imagem é opcional. Os selects usam `SearchableSelect` com as listas de `/admin/.../options` (Decisão 8), sem "Sugerir nova opção".
  `useWatch` para os campos que alimentam a validação cruzada (lição registrada sobre `form.watch`).
- Salvar: chama `editImpact` com os valores do formulário; com `updated + rejected > 0`, abre o `EditImpactDialog`;
  senão (ou ao confirmar) envia o `PATCH` só com os campos alterados. Sucesso → toast, invalida a listagem e o detalhe,
  navega para o detalhe.
- Diálogo de exclusão: segue `delete-institution-permanently-dialog.tsx` (alerta, contagens por status, campo
  "EXCLUIR"); no detalhe navega para a listagem e faz `removeQueries` do detalhe.
- Destaques: selo "Excluído" no alimento; na coluna/campo do estabelecimento, texto com `text-destructive` e o rótulo
  "Estabelecimento excluído"; no detalhe, um `Alert` destrutivo no topo.

## Risks / Trade-offs

- [Listagem em memória fica lenta com muitos alimentos] → aceitável no volume do TCC; a troca para SQL fica isolada no
  `list` do service, sem mudar a API.
- [Prévia e gravação divergirem se um pedido mudar entre as duas] → a gravação recalcula tudo dentro da transação; a
  prévia é só aviso. A spec não exige que os números batam se outra pessoa agir no meio.
- [Administrador troca o item do catálogo por engano e rejeita pedidos] → o diálogo de confirmação mostra quantos
  serão rejeitados antes; rejeição não tem volta, como na RN20.
- [Imagem nova órfã se o processo cair entre `store` e a transação] → mesmo risco aceito na 0.3; nada referencia o
  objeto.
- [Publicação gravada como meia-noite de Brasília muda a ordem do feed entre alimentos do mesmo dia] → efeito visível só
  no dia alterado; é a forma mais previsível de representar "a data" escolhida.

## Migration Plan

Sem migration e sem variável nova. Deploy normal do backend e do frontend; rollback é reverter o merge.
