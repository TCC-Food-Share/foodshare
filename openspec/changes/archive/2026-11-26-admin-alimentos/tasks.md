## 1. Backend: base compartilhada

- [x] 1.1 Mover `lockOrders` de `admin-institutions.service.ts` para `orders/order-locks.ts` e usar dali na exclusão permanente de instituição; specs da 5.3 continuam passando (design D4)
- [x] 1.2 `institution-locks.ts`: `lockEstablishmentForShare(tx, id)` sem o filtro `deleted = false`, com o comentário da ordem de travas (design D3)
- [x] 1.3 `food-order-effects.ts`: `applyNewQuantityToPendingOrders` e `rejectAllPendingOrders` passam a devolver os `count`; chamadas existentes inalteradas (design D2)
- [x] 1.4 `food-order-effects.ts`: `pendingOrdersEffect(current, next)`, `applyAdminEditToPendingOrders(tx, foodId, effect)` (devolve `{ updated, rejected }`) e `countAdminEditEffect(client, foodId, effect)`, na ordem rejeitar todos → rejeitar tipo incompatível → RN20 no que sobrou (DT58, design D2)
- [x] 1.5 Extrair a checagem de vencimento (DT26) do `FoodsService` para `foods/food-dates.ts` e acrescentar `isAfterTodayInBrasilia(date)` e `brasiliaMidnight(date)` para a publicação; `FoodsService` passa a usar o helper sem mudar comportamento (design D3)

## 2. Backend: módulo `admin/foods`

- [x] 2.1 `admin-food.errors.ts`: `foodDeleted()` → `409 FOOD_DELETED` e `publishedAtInFuture()` → `400 PUBLISHED_AT_IN_FUTURE` (design D5)
- [x] 2.2 `admin-food.dto.ts`: `ListAdminFoodsQueryDto` (`createAdminListQueryDto` com os campos de ordenação do design D6, `status` em `FOOD_STATUS_NAMES`, `situation` `active`/`deleted`), `AdminFoodRowDto`, `PaginatedAdminFoodsDto`, `AdminFoodDetailDto` (com `orders` por status e `establishment { id, publicName, companyName, deleted }`), `AdminUpdateFoodDto` (todos opcionais, validadores do `CreateFoodDto`, `@NoProhibitedContent()` em `description` e `notes`, `notes` vazio → `null`, `publishedAt` `IsDateString`), `AdminFoodEditImpactQueryDto` e `AdminFoodEditImpactDto`, com descrições em pt-BR
- [x] 2.3 `AdminFoodsService.list`: carrega com catálogo, categoria, unidade, status e estabelecimento; filtros no `where`; busca em memória (`normalizeText` + datas `dd/mm/aaaa` no fuso de Brasília) e `paginateInMemory` com padrão `publishedAt desc`; imagem pelo `toUrl` (RF52, DT60, design D6)
- [x] 2.4 `AdminFoodsService.get`: detalhe de qualquer alimento, `404` se não existe, contagem de pedidos por status com `groupBy`, incluindo excluídos (RF53, design D7)
- [x] 2.5 `AdminFoodsService.editImpact`: valores omitidos = atuais, `pendingOrdersEffect` + `countAdminEditEffect`, sem escrita; `404` se não existe
- [x] 2.6 `AdminFoodsService.update`: imagem gravada antes; transação do design D3 (estabelecimento `FOR SHARE` → `lockFood` → checagens `FOOD_DELETED`/`FOOD_NOT_ACTIVE`/`FOOD_HAS_ORDERS_IN_PROGRESS` → item e unidade → `checkFoodQuantity` com valores finais → datas → update só do que mudou → efeitos → auditoria `food.update` com `{ changes, updatedOrders, rejectedOrders }` só se algo mudou); nenhum campo nem imagem → `400`; anterior removida depois do commit e nova removida se falhar
- [x] 2.7 `AdminFoodsService.remove`: transação do design D4 (estabelecimento `FOR SHARE` → `lockFood` → contagens por status → `lockOrders` → `deleteMany` dos pedidos → `delete` do alimento → auditoria `food.delete` com nome, estabelecimento e contagens); `removeQuietly` da imagem depois do commit; `404` se não existe ou sumiu
- [x] 2.8 `AdminFoodsController` (`@AdminController('foods')`): `GET /`, `GET /:id/edit-impact`, `GET /:id`, `PATCH /:id` com `@ImageUpload({ body: AdminUpdateFoodDto, required: false })` e `ImageFilePipe`, `DELETE /:id` com `204`; respostas documentadas em pt-BR citando RF50–RF53 e DT57–DT60 e os `code` de cada erro
- [x] 2.9 `AdminFoodsModule` registrado no `AdminModule`, com `PrismaService`, `ImageStorageService` e `AuditService`

- [x] 2.10 `GET /admin/food-items/options` e `GET /admin/measurement-units/options` (mesma resposta do `/catalog`, via `CatalogService` exportado), porque `/catalog/*` é só das instituições (design D8)

## 3. Backend: testes

- [x] 3.1 Spec de `pendingOrdersEffect`: troca de item, de unidade, cada troca de tipo, só quantidade, tipo + quantidade e nada mudou
- [x] 3.2 Spec do service, listagem: todos os status e excluídos sem filtro; filtro de status; filtro de situação; busca sem acento por nome, categoria, razão social e nome fantasia; busca por data de publicação no fuso de Brasília (22h de 05/11 casa "05/11"); estabelecimento excluído indicado; ordem padrão; `pageSize` e `sort` inválidos → `400`
- [x] 3.3 Spec do service, detalhe: alimento de estabelecimento excluído; `Reservado` com contagem de `Em andamento`; inexistente → `404`
- [x] 3.4 Spec do service, edição aceita: troca de item e descrição; cada cenário de efeito nos pendentes da spec (troca de item, de unidade, para "Somente total", para "Somente parcial", para "Total ou parcial", nova quantidade para mais e para menos, tipo + quantidade, finalizados intactos); publicação no passado gravada como meia-noite de Brasília; alimento vencido com só a descrição; observações apagadas; troca de imagem com a anterior removida depois do commit; auditoria só com os campos alterados e as contagens
- [x] 3.5 Spec do service, edição recusada: `Reservado` e `Inativo` → `FOOD_NOT_ACTIVE`; `Em andamento` → `FOOD_HAS_ORDERS_IN_PROGRESS`; excluído → `FOOD_DELETED`; troca de unidade com quantidade fracionada → `FRACTION_NOT_ALLOWED`; "Somente parcial" com 1 → `PARTIAL_ONLY_QUANTITY_TOO_LOW`; vencimento passado alterado → `EXPIRATION_DATE_IN_PAST`; publicação futura → `PUBLISHED_AT_IN_FUTURE`; item e unidade inexistentes → `INVALID_*`; em todos, alimento, pedidos e imagem intactos, nova imagem removida e sem auditoria
- [x] 3.6 Spec do service, prévia: troca de unidade conta todos como rejeitados sem alterar; mesmos valores → zeros; números iguais aos efeitos aplicados para os mesmos valores
- [x] 3.7 Spec do service, exclusão permanente: pedidos de vários status apagados, imagem removida depois do commit, auditoria com contagens por status; alimento excluído logicamente aceito; inexistente → `404`; falha da auditoria → nada apagado e imagem mantida; falha ao remover a imagem → exclusão mantida
- [x] 3.8 Teste no banco de teste: duas exclusões permanentes ao mesmo tempo → uma `204` e outra `404`; exclusão permanente do alimento e exclusão lógica do estabelecimento ao mesmo tempo → sem deadlock nem `500`; edição e aceite de pedido ao mesmo tempo → um dos desfechos válidos, estoque nunca negativo
- [x] 3.9 Specs das rotas: sem sessão → `401`; instituição → `403 ROLE_NOT_ALLOWED`; id não numérico → `400`; `DELETE` com sucesso → `204` sem corpo; `PATCH` multipart com imagem inválida → `400`
- [x] 3.10 `npm run lint`, `npx tsc --noEmit` e `npm test` no backend sem erro

## 4. Frontend: API e listagem

- [x] 4.1 `features/admin/foods/admin-foods-api.ts`: tipos de linha, detalhe e prévia; `list`, `get`, `editImpact`, `update` (FormData só com os campos alterados e a imagem opcional), `remove`; `ADMIN_FOOD_ERROR_MESSAGES` por `code` (`FOOD_DELETED`, `FOOD_NOT_ACTIVE`, `FOOD_HAS_ORDERS_IN_PROGRESS`, `FRACTION_NOT_ALLOWED`, `PARTIAL_ONLY_QUANTITY_TOO_LOW`, `EXPIRATION_DATE_IN_PAST`, `PUBLISHED_AT_IN_FUTURE`, `INVALID_CATALOG_ITEM`, `INVALID_MEASUREMENT_UNIT`)
- [x] 4.2 `admin-foods-page.tsx`: `AdminTable` com busca, filtros de status e de situação, ordenação, itens por página e estado na URL (`use-admin-list-params`); colunas do spec com rótulos de `food-status.ts` e `food-request-type.ts`; selo "Excluído"; estabelecimento excluído destacado com "Estabelecimento excluído"; ações "Ver", "Editar" (só quando editável) e "Excluir permanentemente", com rótulo acessível com o nome
- [x] 4.3 `ADMIN_LIST_PAGES['/admin/alimentos']` e as rotas `/admin/alimentos/:id` e `/admin/alimentos/:id/editar` no `router.tsx`; a seção deixa de mostrar o placeholder

## 5. Frontend: detalhe, edição e exclusão

- [x] 5.1 `admin-food-detail-page.tsx`: campos do RF53, contagem de pedidos por status, `Alert` destrutivo quando o estabelecimento está excluído, selo "Excluído" no alimento, "Editar" só quando editável, "Excluir permanentemente"; `404` → "Alimento não encontrado" com link para a listagem
- [x] 5.2 `delete-food-permanently-dialog.tsx`: nome e estabelecimento, alerta de irreversível, contagens por status (só as maiores que zero), campo que só libera o botão com `EXCLUIR` exato; sucesso → toast, invalida a listagem e, no detalhe, `removeQueries` e volta para `/admin/alimentos`; erro → mensagem no diálogo
- [x] 5.3 `admin-food-edit-schema.ts`: zod espelhando o `AdminUpdateFoodDto`, reaproveitando as regras de quantidade de `create-food-schema.ts` (fração pela unidade, mínimo de "Somente parcial") e com a publicação não futura; imagem opcional
- [x] 5.4 `admin-food-edit-page.tsx`: formulário preenchido pelo detalhe, `mode: 'onChange'`, `useWatch` nos campos da validação cruzada, `SearchableSelect` de item do catálogo e unidade sem "Sugerir nova opção", seletor de imagem opcional, data de vencimento e de publicação; alimento não editável → motivo e link para o detalhe, sem formulário
- [x] 5.5 `edit-impact-dialog.tsx` e o fluxo de salvar: `editImpact` com os valores do formulário; com afetados, diálogo com quantos serão atualizados e rejeitados; sem afetados ou ao confirmar, `update`; sucesso → toast "Alimento atualizado", invalida listagem e detalhe e navega para o detalhe; `PROHIBITED_CONTENT` nos campos e demais `code` numa mensagem na tela, sem perder os valores
- [x] 5.6 `npm run lint` e `npx tsc -b` no frontend sem erro

## 6. Documentação

- [x] 6.1 `docs/REQUISITOS.md`: acrescentar a DT57 (edição só de `Ativo` sem `Em andamento`, todos os campos do RF50, RN20 na quantidade, `FOOD_DELETED`, publicação não futura gravada como meia-noite de Brasília, observações apagáveis, selects sem sugestão), a DT58 (efeitos de troca de item, unidade e tipo nos pendentes, com prévia), a DT59 (exclusão permanente de qualquer alimento, pedidos apagados sem devolver estoque, "EXCLUIR" conferido só na tela, auditoria) e a DT60 (listagem com excluídos, filtros de status e situação, busca única, destaque do estabelecimento excluído como leitura do "status desativado" do RF53); citar as DTs nas observações do RF50 a RF53
- [x] 6.2 `docs/MODELO-DE-DADOS.md`, "Exclusões permanentes": a ordem "Alimento" passa a ser estabelecimento `FOR SHARE` → alimento `FOR UPDATE` → pedidos travados em ordem de id → pedidos → alimento → imagem no MinIO depois do commit
- [x] 6.3 Conferir que o `.env.example` não precisa de variável nova (nenhuma prevista)

## 7. Verificação ponta a ponta e fechamento

- [x] 7.1 Pela API (Scalar ou curl): listagem com filtros e busca; detalhe de alimento de estabelecimento excluído; prévia e `PATCH` trocando unidade num alimento com pendentes (rejeitados no banco) e quantidade com pedido total (quantidade e `quantityUpdatedAt` atualizados); `PATCH` em `Inativo` → `409`; troca de imagem com o objeto anterior removido do MinIO; `DELETE` → `204` com alimento, pedidos e imagem removidos; `audit_log` com `food.update` e `food.delete`
- [x] 7.2 No navegador (dev): seção "Alimentos" com tabela, filtros mantidos ao recarregar e depois da exclusão, selo "Excluído" e destaque de estabelecimento excluído; detalhe com aviso; edição com diálogo de impacto e sem diálogo quando nada é afetado, mensagem de sucesso e volta ao detalhe; exclusão pelo detalhe e pela linha com botão travado até "EXCLUIR"; tela a 400 px sem rolagem horizontal, tema claro e escuro, sem erro no console além do `401` esperado do `/me`
- [x] 7.3 Marcar ✅ o item 5.4 em `docs/PLANO-IMPLEMENTACAO.md`
