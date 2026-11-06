## Context

A motivação está em `proposal.md`. O que existe hoje em `develop`:

- **`OrdersService`:**
  - `accept` e `receive` rodam numa transação. Nelas, o alimento é travado primeiro (`lockFood`,
    `SELECT … FOR UPDATE`), depois o pedido é relido e o status muda por CAS (`updateMany` com o status
    de origem no `where`).
  - `reject` faz só o CAS, porque não mexe em estoque.
  - O dono do pedido é resolvido pela sessão (`findOwnOrder`), com `deleted: false`.
- **`foods/food-order-effects.ts`:**
  - `lockFood`, `orderStatusId` e `applyNewQuantityToPendingOrders`;
  - `applyNewQuantityToPendingOrders` ajusta os totais pendentes ao novo estoque e rejeita os
    parciais que não cabem, como na RN20 e na DT31.
- **`FoodsService.remove`** (exclusão de alimento, RF16) já cancela pedidos `Em andamento` com motivo.
  A validação do motivo é o método privado `assertSelectableReason`, que usa os códigos
  `CANCELLATION_REASON_REQUIRED` e `INVALID_CANCELLATION_REASON`, definidos em `foods.constants.ts`.
- **`GET /catalog/cancellation-reasons`** já lista os motivos sem os de sistema. No frontend, o
  `FoodDeleteDialog` já usa:
  - `useCancellationReasons`;
  - `SearchableSelect`, com `onSuggest`;
  - `SuggestOptionDialog`.
- **Frontend de pedidos:**
  - `ORDER_ACTIONS` e `availableActions` decidem os botões do `OrderActionsCard`;
  - `OrderActionDialog` confirma ações sem campo extra;
  - `situationText(role, status)` dá o texto do card;
  - `OrdersTable` (desktop) e `OrderCards` (celular) renderizam a listagem de qualquer aba.
- **`Order.cancellationReasonId`** já existe. Não há registro de quem cancelou.

## Goals / Non-Goals

**Goals:**

- Uma única função de devolução de estoque, para o cancelamento comum agora e para as changes 4.4
  e 5.3 depois. Ela devolve a quantidade, faz `Reservado` → `Ativo` e ajusta os totais.
- A validação do motivo fica num lugar só, usada pela exclusão de alimento e pelo cancelamento.
- O cancelamento segue a ordem de travas da 2.2 (alimento primeiro), para não haver impasse com
  aceite, confirmação e ações de alimento.

**Non-Goals:**

- Cancelamentos automáticos (contas, administrador, expiração). O enum já traz os valores deles, mas
  quem grava `ADMINISTRATOR` e `SYSTEM` são as changes 4.4, 5.3 e 6.1.
- Data do cancelamento. `updatedAt` já registra a última mudança, e nenhum requisito pede a data na
  tela.
- Mudar `ORDER_ACTIONS` para ações com corpo. O cancelamento tem diálogo próprio (Decisão 6).

## Decisions

### 1. Rota `PATCH /orders/:id/cancel` com corpo opcional no DTO

O `CancelOrderDto` traz `cancellationReasonId?: number`, com `@IsOptional() @IsInt() @Min(1)`.

- O campo é opcional no DTO para que a falta dele chegue ao service e responda com a `code`
  `CANCELLATION_REASON_REQUIRED`. Com `@IsDefined`, o `ValidationPipe` responderia um `400` sem
  `code`.
- Valor não inteiro continua sendo recusado pelo pipe, com o `400` genérico.
- A exclusão de alimento já faz assim, na query.
- A rota fica no `OrdersController`, que já é `@RequireRoles(...INSTITUTION_ROLES)`. Por isso o
  administrador recebe `403 ROLE_NOT_ALLOWED` sem código novo.

**Alternativa descartada:** `DELETE /orders/:id`. O pedido não é apagado, só muda de status, e as
outras transições já são `PATCH /orders/:id/<ação>`.

### 2. Validação do motivo vira helper compartilhado

`assertSelectableReason(tx, cancellationReasonId)` sai de `FoodsService` para
`orders/cancellation-reason.ts`. Os dois códigos continuam em `foods.constants.ts`: movê-los para
`orders.constants.ts` com reexport criaria um import circular, porque `orders.constants.ts` já importa
de `foods.constants.ts`.

A validação roda dentro da transação, antes da trava do alimento. Assim, a ordem das respostas é a
da spec: `400` antes de `409`.

### 3. Sequência do cancelamento

`OrdersService.cancel(userId, orderId, dto)`:

1. Resolve a parte pela sessão: estabelecimento ou entidade. Isso define o filtro de dono e o
   `cancelledBy` (`ESTABLISHMENT` ou `BENEFICIARY_ENTITY`). Sem nenhum dos dois, responde `404`.
2. Chama `findOwnOrder`. Pedido inexistente, excluído ou de outra instituição responde `404` (RN14).
3. Abre a transação:
   1. `assertSelectableReason`;
   2. `lockFood(tx, order.foodId)`;
   3. relê o pedido. Se o status não é `Pendente` nem `Em andamento`, responde `409 ORDER_NOT_OPEN`;
   4. faz o CAS: `updateMany({ where: { id, statusId: <status lido>, deleted: false }, data: { statusId: cancelado, cancellationReasonId, cancelledBy } })`.
      Se nenhuma linha muda, responde `409 ORDER_NOT_OPEN`;
   5. se o status lido era `Em andamento`, chama `returnReservedQuantity(tx, foodId, quantity)`
      (Decisão 4).
4. Devolve `OrderResponseDto`, como as outras ações.

O efeito sobre o estoque vem do status lido **depois** da trava. Um aceite que ganhou a corrida já
descontou o estoque, e o cancelamento devolve. Um cancelamento que ganhou faz o aceite ver o pedido
`Cancelado` e responder `ORDER_NOT_PENDING`. Com a trava, o CAS do passo 4 nunca falha, mas fica,
como pede `docs/CONVENCOES.md`.

**Alternativa descartada:** o cliente mandar o status que viu e o cancelamento recusar se o status
mudou. O RF26 permite cancelar nos dois status, então o resultado é válido nos dois casos, e o
diálogo já recarrega o pedido depois da ação. O campo extra não mudaria nada.

### 4. `returnReservedQuantity` em `food-order-effects.ts`

```ts
returnReservedQuantity(tx, foodId, quantity): Promise<void>
```

1. Lê o alimento, já travado pelo chamador.
2. Se `food.deleted`, não faz nada (DT27). Hoje isso não acontece: a exclusão do alimento ou do
   estabelecimento cancela os pedidos `Em andamento` antes. O teste existe para não depender disso.
3. Faz `update` com `quantity: { increment }` e, se o status é `Reservado`, troca para `Ativo`.
4. Chama `applyNewQuantityToPendingOrders(tx, foodId, novaQuantidade)` (DT32). Os totais pendentes
   passam a pedir o novo estoque, com `quantityUpdatedAt`. A parte que rejeita parciais não acha
   nenhum, porque todo parcial pendente cabe no estoque anterior, que só aumentou. A função é a
   mesma da RN20 e da DT31, sem regra paralela.

A validade não é checada. O alimento vencido volta a `Ativo` e continua fora do feed por RN19, como
diz a spec.

**Alternativa descartada:** devolver com `update` direto no service de pedidos. As changes 4.4 e 5.3
cancelam pedidos `Em andamento` de entidades excluídas (RN29) e precisam do mesmo efeito.

### 5. Schema: enum `OrderCancelledBy` e `Order.cancelledBy`

```prisma
enum OrderCancelledBy {
  ESTABLISHMENT
  BENEFICIARY_ENTITY
  ADMINISTRATOR
  SYSTEM
}

model Order {
  // ...
  cancelledBy OrderCancelledBy?
}
```

- O campo é nulo em todo pedido não cancelado.
- Os quatro valores entram já. Assim as changes 4.4, 5.3 e 6.1 não precisam de outra migration de
  enum, e a tela já sabe exibir todos.
- O valor de cada fluxo futuro é decidido na change dele. Ex.: a exclusão da própria conta pela
  entidade (RF05) usa motivo de sistema, mas quem cancelou é a entidade.
- A migration é criada com `prisma migrate dev --create-only` e recebe à mão o preenchimento:
  `UPDATE "order" SET "cancelledBy" = 'ESTABLISHMENT' WHERE "statusId" = (SELECT id FROM order_status WHERE name = 'Cancelado')`.
  Até aqui só a exclusão de alimento (RF16) cancelava.
- `FoodsService.remove` passa a gravar `cancelledBy: ESTABLISHMENT`.

**Alternativa descartada:** `cancelledByUserId` (FK para `User`). Diria qual usuário cancelou, mas
a tela só precisa do papel, e o sistema não tem usuário. A FK também complicaria a exclusão
permanente de contas pelo administrador.

### 6. Respostas da API

`OrderResponseDto` (listagem) e `OrderDetailResponseDto` ganham:

- `cancellationReason: { id, name } | null`;
- `cancelledBy: OrderCancelledBy | null`.

`ORDER_INCLUDE` e o include do detalhe passam a trazer `cancellationReason`. O Swagger documenta o
enum.

### 7. Frontend

- **`orders-api.ts`:**
  - `cancelOrder(id, cancellationReasonId)`;
  - os tipos ganham os dois campos;
  - `ORDER_CONFLICT_CODES.notOpen`.
- **Rótulos de quem cancelou** em `order-status.ts`, que já guarda os rótulos do domínio de pedidos.
  São duas funções, porque o texto depende de quem vê:
  - `cancelledByLabel(cancelledBy, role)` dá o rótulo curto da listagem: "Você", "Estabelecimento",
    "Entidade", "Nossa equipe" ou "Automático";
  - `cancelledBySentence(cancelledBy, role)` dá a frase do detalhe. São as quatro frases da spec.
- **`situationText`** passa a receber o pedido inteiro. Para `Cancelado`, usa
  `cancelledBySentence` e mostra o motivo logo abaixo.
- **`OrderCancelDialog`** (novo) segue a estrutura do `FoodDeleteDialog`: `SearchableSelect` de
  motivos, `onSuggest` → `SuggestOptionDialog` com o tipo `CANCELLATION_REASON` e erro de campo
  quando falta o motivo. A descrição muda pelo status:
  - `Pendente`: "O pedido será cancelado e o estoque do alimento não muda.";
  - `Em andamento`: "{quantidade} {unidade} voltam ao estoque de {alimento}.";
  - nos dois: "Esta ação não pode ser desfeita."

  Respostas de erro:
  - `409 ORDER_NOT_OPEN`: recarrega o detalhe, mostra o toast "Este pedido já foi atualizado…",
    como as outras ações, e fecha o diálogo;
  - `400 INVALID_CANCELLATION_REASON`: limpa a escolha, recarrega os motivos e mostra o erro no
    diálogo;
  - `404`: `onNotFound`.

  No sucesso, invalida `['orders']`, `['foods']` e `['food']`, porque o estoque e o status do
  alimento podem ter mudado.
- **`OrderActionsCard`** mostra "Cancelar pedido" para as duas partes quando o status é `Pendente`
  ou `Em andamento`. O botão é o último da lista, `variant="ghost"` com texto destrutivo, para não
  competir com "Rejeitar" no pendente do estabelecimento. O card não usa o `ORDER_ACTIONS`, porque a
  ação tem corpo e diálogo próprio.
- **Listagem:**
  - `OrdersTable` recebe o status da aba. Na aba `Cancelado`, troca a coluna "Status" por "Motivo"
    (com o nome do motivo) e "Cancelado por";
  - `OrderCards` mostra as duas linhas no card.
  - As outras abas não mudam.
- **`OrderLimitNotice`:** o texto passa a citar o cancelamento como forma de liberar espaço (DT07):
  "…confirme o recebimento dos pedidos em andamento, cancele um pedido ou aguarde a resposta dos
  pendentes."

## Risks / Trade-offs

- **[Risco] O estabelecimento vê "Rejeitar" e "Cancelar pedido" no mesmo pedido pendente, e a
  diferença não é óbvia** → É o que o RF26 pede. O cancelamento exige motivo e o diálogo explica o
  efeito. O botão de cancelar fica menos destacado (`ghost`). Se o teste com usuários confundir, o
  caso vai para `docs/PENDENCIAS.md`, sem mudar a regra.
- **[Risco] Pedido total pendente muda de quantidade sem a entidade agir (DT32)** → Mesmo
  comportamento da RN20 e da DT31. Grava `quantityUpdatedAt`, e o aviso na tela entra na 3.3.
- **[Trade-off] Valores `ADMINISTRATOR` e `SYSTEM` sem uso nesta change** → Evita uma migration de
  enum por change futura. Os rótulos dos quatro valores já existem em `order-status.ts`.
- **[Risco] Migration de preenchimento num banco com pedidos cancelados** → O `UPDATE` vale só para
  pedidos já `Cancelado`, e todos vieram da exclusão de alimento. No staging, roda no deploy, sem
  reset.

## Migration Plan

1. Rodar `prisma migrate dev --create-only`, acrescentar o `UPDATE` de preenchimento e aplicar no
   local. Depois pedir o restart do `start:dev`, porque o client mudou.
2. No staging, a migration roda no deploy (`prisma migrate deploy`) e não precisa de reset nem de seed.
3. Rollback: reverter o deploy. Sem cancelamentos novos, a coluna nula e o enum não afetam o código
   anterior, que ignora o campo.
