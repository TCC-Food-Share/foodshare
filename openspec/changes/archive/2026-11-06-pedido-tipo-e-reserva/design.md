## Context

A motivação está em `proposal.md`. O que existe hoje em `develop`:

- **`OrdersService.create`:** confere o limite (RN04) fora da transação. Dentro dela:
  1. trava o alimento (`lockFood`, `SELECT … FOR UPDATE`);
  2. lê o alimento disponível;
  3. confere a duplicidade (RN05);
  4. compara a quantidade só com o estoque (`400` sem `code`);
  5. deriva o tipo por `orderTypeFor`, que já trata "Somente parcial" como sempre parcial.
- **`OrdersService.accept`:** trava o alimento, relê o pedido, confere status e disponibilidade, faz
  CAS do status e decremento condicional (`quantity >= x`). Não grava `acceptedAt`, não muda o status
  do alimento e não rejeita ninguém. Os `409` não têm `code`.
- **`OrdersService.receive`:** CAS do status, fora de transação e sem travar o alimento.
- **`foods/food-order-effects.ts`:** `lockFood` e os `where` de efeito da RN20
  (`totalOrdersToUpdateWhere`, `partialOrdersToRejectWhere`). A aplicação desses efeitos
  (`applyNewQuantityToPendingOrders`) e a rejeição de todos os pendentes (`rejectPendingOrders`) são
  privadas em `FoodsService`.
- **`foods/food-quantity.ts`:** passo mínimo da quantidade (1 ou 0,01) e a regra da DT21.
- **Ordem de travas da 2.2:** linha do alimento primeiro, depois as de pedido. Toda ação de alimento
  e de pedido segue essa ordem, e por isso não há impasse.
- **Testes:** de unidade, com `PrismaService` mockado. A concorrência foi verificada na 2.2 contra o
  Postgres local, com requisições paralelas.

## Goals / Non-Goals

**Goals:**

- Uma única função pura decide se a quantidade do pedido é aceita e qual o tipo dele. O formulário
  do frontend usa a mesma regra.
- Aceite e confirmação aplicam todas as consequências (RN07, RN08) numa transação, com o alimento
  travado, mantendo a ordem de travas da 2.2.
- A prévia do aceite e o aceite usam as mesmas conferências e os mesmos `where` de efeito. Assim as
  contagens mostradas são as que o aceite aplicaria naquele momento.
- O efeito do aceite sobre os pendentes (DT31) reaproveita o da edição de quantidade (RN20), sem
  regra paralela.

**Non-Goals:**

- Mudar a rejeição manual (RF24). Ela continua um CAS do status, sem travar o alimento, porque não
  mexe em estoque.
- Reclassificar o tipo de pedidos que já existem. O tipo é decidido na criação e não muda (ver
  Decisões).
- Mostrar `type` ou `acceptedAt` na tela. O detalhe ganha campos de pedido na 3.3, e os lembretes
  usam `acceptedAt` na 6.2.

## Decisions

### 1. Regra de quantidade numa função pura, com o passo mínimo compartilhado

`orders/order-quantity.ts` exporta duas funções:

- `checkOrderQuantity(quantity, available, allowsFraction, requestType)`, que devolve o `code` da
  recusa ou `null`;
- `orderTypeFor(quantity, available, requestType)`.

A ordem de conferência é a da spec: estoque, fração, tipo. A sobra da DT30 é a condição
`available <= step`, em que `step` é 1 ou 0,01. É o mesmo limiar da DT21, então `food-quantity.ts`
passa a exportar `quantityStep(allowsFraction)` e `allowsPartialOrder(available, allowsFraction)`, e
as duas regras usam esse helper.

- **Alternativa descartada:** validar no DTO com `class-validator`. A regra depende do alimento lido
  dentro da transação travada, então não cabe no DTO.
- **Tipo:**
  - "Somente total" gera `TOTAL`;
  - "Somente parcial" gera `PARTIAL`, inclusive na sobra;
  - "Total ou parcial" gera `TOTAL` se a quantidade for igual ao estoque, e `PARTIAL` se for menor.

  É o que `orderTypeFor` já faz. A revisão da DT28 só confirma esse comportamento, agora que a
  quantidade é validada antes.
- **Comparação decimal:** usar `Prisma.Decimal` (`equals`, `greaterThan`), como o código atual. Nada
  de `===` em `number` vindo de `Decimal`.
- **Códigos:** os `400` usam `QUANTITY_EXCEEDS_AVAILABLE`, `FRACTION_NOT_ALLOWED` (a mesma string de
  `foods.constants.ts`), `TOTAL_QUANTITY_REQUIRED` e `PARTIAL_QUANTITY_REQUIRED`. Ficam num objeto
  `ORDER_QUANTITY_CODES` em `orders.constants.ts`.

A ordem atual da criação continua igual: limite, alimento disponível, duplicidade e só então
quantidade. A quantidade é conferida dentro da transação, depois do `lockFood`, contra o estoque
lido sob trava.

### 2. Aceite: uma conferência compartilhada com a prévia

Um método privado `evaluateAccept(client, orderId, establishmentId)` faz as conferências na ordem
abaixo e, se tudo passar, devolve o pedido, o alimento e a `newQuantity`:

1. o pedido existe, é do estabelecimento e não está excluído (`404`);
2. está `Pendente` (`409 ORDER_NOT_PENDING`);
3. o alimento está disponível (`409 FOOD_NOT_AVAILABLE`);
4. o estoque cobre o pedido (`409 INSUFFICIENT_FOOD_QUANTITY`).

**Aceite**, numa transação:

1. `lockFood`;
2. `evaluateAccept` com `tx`;
3. CAS do pedido (`statusId: pending` no `where`), gravando `statusId` e `acceptedAt: new Date()`;
4. decremento condicional (`quantity: { gte }`);
5. se `newQuantity` é 0, o alimento passa a `Reservado`;
6. efeito nos outros `Pendente` do alimento (DT31):
   - se `newQuantity > 0`: `applyNewQuantityToPendingOrders(tx, foodId, newQuantity)`. Os totais
     passam a pedir `newQuantity`, com `quantityUpdatedAt`, e os parciais com
     `quantity > newQuantity` viram `Rejeitado`. É a mesma função da edição (RN20);
   - se `newQuantity = 0`: `rejectAllPendingOrders(tx, foodId)`. Um total não pode passar a pedir 0.

O pedido aceito já não está `Pendente` quando o passo 6 roda, então os `where` não o alcançam.

Os passos 3 e 4 continuam condicionais, mesmo com a trava. É a defesa que `docs/CONVENCOES.md`
exige, e o custo é zero.

**Prévia** (`GET /orders/:id/accept-impact`): roda `evaluateAccept` com `this.prisma`, sem trava, e
conta com os mesmos `where`. A resposta é `{ pendingOrdersToReject, totalOrdersToUpdate,
foodWillBeReserved }`:

- se `newQuantity > 0`: conta `partialOrdersToRejectWhere` e `totalOrdersToUpdateWhere`;
- se `newQuantity = 0`: todos os pendentes entram em `pendingOrdersToReject`, e
  `totalOrdersToUpdate` é 0. Sem trava, a
prévia pode envelhecer até o clique. Isso é aceitável: o aceite reconfere tudo, e o diálogo já trata o
`409`. O padrão é o mesmo de `GET /foods/mine/:id/quantity-impact`.

- **Alternativa descartada:** calcular a prévia no frontend. O frontend não conhece os outros
  pedidos do alimento.
- **Alternativa descartada:** rejeitar também os totais que não cabem, como dizia o texto original
  da RN07. A dupla decidiu (DT31) que o total acompanha o estoque também no aceite, coerente com a
  RN20: o pedido total significa "tudo o que houver".

### 3. Confirmação: transação com o alimento travado

`receive` passa a rodar numa transação:

1. ler o pedido da entidade, fora da transação, para obter `foodId` (`404` como hoje);
2. `lockFood(foodId)`;
3. CAS `Em andamento` → `Doado` (`409 ORDER_NOT_IN_PROGRESS` se nenhuma linha mudar);
4. ler o alimento;
5. contar os outros pedidos `Em andamento`, não excluídos, do alimento;
6. se `quantity = 0`, `deleted = false` e a contagem é 0: o alimento passa a `Inativo`, e os
   `Pendente` passam a `Rejeitado`.

A trava resolve o caso das duas últimas confirmações simultâneas. A segunda espera a primeira
terminar. No Postgres, em `READ COMMITTED`, cada comando enxerga o que já foi confirmado, então a
contagem da segunda confirmação já vê o primeiro `Doado` e o alimento vira `Inativo`. Sem a trava, as
duas poderiam contar um `Em andamento` uma da outra, e o alimento ficaria preso em `Reservado`.

A rejeição de todos os pendentes e a aplicação da nova quantidade saem de `FoodsService` e vão para
`food-order-effects.ts`, como `rejectAllPendingOrders(tx, foodId)` e
`applyNewQuantityToPendingOrders(tx, foodId, quantity)`:

- `rejectAllPendingOrders` é usada pela desativação (RN21), pelo aceite que zera o estoque e pela
  confirmação (RN08), e depois pela exclusão de conta (4.4);
- `applyNewQuantityToPendingOrders` é usada pela edição (RN20) e pelo aceite (DT31).

### 4. Códigos de conflito

`ORDER_CONFLICT_CODES` ganha `notPending`, `foodNotAvailable`, `insufficientQuantity` e
`notInProgress`. O aceite, a prévia e a confirmação usam esses códigos. A rejeição manual também passa
a mandar `ORDER_NOT_PENDING` no seu `409`, porque a constante é a mesma e o custo é zero. Isso não
muda a spec dela.

### 5. Schema e migration

- `Order.acceptedAt DateTime?` e `@@index([beneficiaryEntityId, statusId])`, como em
  `docs/MODELO-DE-DADOS.md`.
- A migration preenche `acceptedAt = "updatedAt"` nos pedidos `Em andamento`, buscando o status pelo
  nome. Depois do aceite, nada mais altera um pedido `Em andamento`: a RN20 bloqueia a edição, e
  `quantityUpdatedAt` só vale para pedidos pendentes. Por isso `updatedAt` é a data do aceite.
  Pedidos `Doado` antigos ficam com `null`, porque nenhuma regra usa `acceptedAt` depois do
  encerramento.
- Pedidos `Pendente` antigos que violem a RN03 não são alterados.

### 6. Frontend

- **Regra no formulário:** `features/orders/order-quantity.ts` espelha a regra do backend:
  - `orderModes(requestType, available, allowsFraction)` devolve `['total']`, `['partial']`,
    `['remainder']` ou `['total', 'partial']`;
  - a validação parcial usa máximo `< available` em "Somente parcial" e `<= available` em
    "Total ou parcial";
  - quantidade inteira quando a unidade não aceita fração.

  O passo mínimo vem de `features/foods/food-quantity.ts`, que já existe para a DT21. Um comentário
  curto marca que a regra espelha o backend.
- **`create-order-schema.ts`:** recebe `{ available, allowsFraction, requestType }`. O modo inicial é
  o primeiro permitido.
- **`create-order-dialog.tsx`:**
  - mostra só os cartões permitidos;
  - `remainder` é um cartão único com a quantidade fixa e o texto "É o que restou deste alimento";
  - o `step` do input segue a unidade;
  - os `400` com `code` continuam no banner "a quantidade pode ter mudado", e o modal recarrega o
    alimento.
- **Diálogo de aceite:**
  - `useQuery(['order', id, 'accept-impact'])`, habilitado só com o diálogo de aceite aberto e com
    `staleTime: 0`;
  - o texto vem de `dialogCopy` mais uma linha de efeito;
  - o botão fica desabilitado enquanto a prévia carrega ou se ela falhar;
  - em `409`, o diálogo avisa que o pedido foi atualizado e invalida o pedido.
- **Invalidações:** depois de aceitar ou confirmar, invalidar também `['foods']` e `['food', id]`,
  além das chaves de pedido atuais, porque o status do alimento muda. Também a chave de "Meus
  Alimentos", se for outra.

## Risks / Trade-offs

- [Prévia sem trava pode divergir do aceite] → O aceite reconfere tudo sob trava, e um `409` leva o
  diálogo a avisar e recarregar.
- [Testes com mock não exercitam `FOR UPDATE`] → Uma tarefa repete a verificação da 2.2 contra o
  Postgres local, com requisições paralelas: dois aceites que não cabem juntos, dois que cabem e as
  duas últimas confirmações simultâneas.
- [Pedidos `Pendente` antigos podem ter quantidade acima do estoque] → O aceite deles responde
  `INSUFFICIENT_FOOD_QUANTITY`, e a última confirmação rejeita os que sobrarem (cenário da spec).
- [Pedido total ajustado pelo aceite mostra "Quantidade atualizada pelo estabelecimento"] → É
  intencional: o aceite é uma ação do estabelecimento, e a entidade precisa saber que o pedido mudou.
  O aviso aparece na 3.3.
- [Pedido pendente parcial com quantidade igual ao novo estoque continua parcial] → É o que a RN07
  diz: só os parciais que não cabem mudam. Depois disso, se o estabelecimento editar a quantidade (só
  possível sem pedido `Em andamento`), esse pedido segue a regra do parcial da RN20, e não a do
  total. Fica registrado como comportamento esperado.
- [Regra duplicada no frontend] → Ela fica num arquivo só, com teste de unidade do lado do backend, e
  o servidor continua sendo a autoridade (`400` com `code`).

## Migration Plan

1. `prisma migrate dev --name pedido_tipo_e_reserva` no ambiente local: coluna, índice e `UPDATE` de
   preenchimento.
2. No staging, o deploy aplica a migration (`migrate deploy`). Não precisa de reset, porque a
   migration só adiciona.
3. **Rollback:** reverter o código. A coluna nula e o índice não atrapalham a versão anterior.
