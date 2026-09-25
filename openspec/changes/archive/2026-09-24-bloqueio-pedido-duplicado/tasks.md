## 1. Backend — regra e `code` do 409

- [x] 1.1 `backend/src/orders/orders.constants.ts`: exportar
      `ORDER_CONFLICT_CODES = { limitReached: 'ORDERS_IN_PROGRESS_LIMIT_REACHED',
      duplicateInProgress: 'DUPLICATE_ORDER_IN_PROGRESS' } as const`.
- [x] 1.2 `backend/src/orders/orders.service.ts`: extrair `inProgressWhere(
      beneficiaryEntityId)` com o critério de "em andamento" que hoje está inline
      na contagem do limite (`{ beneficiaryEntityId, deleted: false, status: {
      name: { in: IN_PROGRESS_STATUSES } } }`) e usá-lo na contagem do limite (o
      objeto passado ao `count` não muda). O `ConflictException` do limite passa
      a receber `{ statusCode: 409, error: 'Conflict', message: <a mesma>, code:
      ORDER_CONFLICT_CODES.limitReached }`.
- [x] 1.3 `orders.service.ts`, em `create`: **depois** de `findAvailableById`
      confirmar o alimento e **antes** da validação da quantidade, `prisma.order.
      findFirst({ where: { ...inProgressWhere(entity.id), foodId: food.id },
      select: { id: true } })`; se achar, `ConflictException` com `message:
      'Beneficiary entity already has an order in progress for this food.'` e
      `code: ORDER_CONFLICT_CODES.duplicateInProgress`. Nenhum pedido é criado.

## 2. Backend — documentação da API

- [x] 2.1 `orders.controller.ts`: o `@ApiConflictResponse` do `POST /orders`
      passa a descrever, em pt-BR, os dois motivos e seus `code`
      (`ORDERS_IN_PROGRESS_LIMIT_REACHED`, `DUPLICATE_ORDER_IN_PROGRESS`); o
      `description` do `@ApiOperation` cita a regra de um pedido em andamento
      por alimento, mantendo o texto de RF14/RF15.

## 3. Backend — testes

- [x] 3.1 `orders.service.spec.ts`: agrupar os testes de `create` existentes num
      `describe('create')` com `beforeEach` que põe `order.findFirst` → `null`
      (o padrão do mock, um pedido `Pendente`, faria toda criação parecer
      duplicada). Verificar: os testes existentes seguem passando sem outra
      alteração.
- [x] 3.2 Teste: sem pedido em andamento do alimento (`findFirst` → `null`) →
      cria o pedido.
- [x] 3.3 Teste: `findFirst` acha um pedido → `ConflictException` com
      `response.code === 'DUPLICATE_ORDER_IN_PROGRESS'`; `order.create` não é
      chamado.
- [x] 3.4 Teste: o `where` do `findFirst` é `{ beneficiaryEntityId: 7, foodId: 5,
      deleted: false, status: { name: { in: ['Pendente', 'Aceito'] } } }`
      (isolamento por entidade e por alimento, exclusão de soft-delete e de
      status terminais).
- [x] 3.5 Teste: alimento indisponível (`findAvailableById` → `null`) →
      `NotFoundException` e `findFirst` não é chamado.
- [x] 3.6 Teste: limite prevalece — `count` → 10 → `ConflictException` com
      `code` do limite; `findAvailableById` e `findFirst` não são chamados.
- [x] 3.7 Teste: duplicidade antes da quantidade — `findFirst` acha pedido e
      `quantity` acima do estoque → `ConflictException`, não
      `BadRequestException`.
- [x] 3.8 Teste existente do limite ("throws ConflictException when the entity
      already has 10 orders in progress") passa a conferir também o `code`
      `ORDERS_IN_PROGRESS_LIMIT_REACHED`.

## 4. Backend — verificação

- [x] 4.1 `backend/`: `npm run lint:check` (0 warnings), `npm test` e `npm run
      build` sem erro.
- [x] 4.2 Verificação contra o Postgres local (servidor em `:3000`, contas de
      teste criadas via cadastro real, script Node temporário): primeiro pedido
      → `201`; segundo do mesmo alimento → `409` com `code:
      DUPLICATE_ORDER_IN_PROGRESS` e nenhuma linha nova em `order`; com o
      primeiro `Aceito` → `409`; depois de `Rejeitado` e depois de `Recebido` →
      `201`; outro alimento → `201`; outra entidade, mesmo alimento → `201`;
      alimento vencido por SQL → `404`; quantidade acima do estoque + duplicado
      → `409` (não `400`); entidade com 10 em andamento pedindo o alimento que
      já tem → `409` com `code: ORDERS_IN_PROGRESS_LIMIT_REACHED`. Dados de
      teste removidos ao final via SQL direto.
- [x] 4.3 `/openapi.json` (servidor local): `POST /orders` lista a resposta
      `409` com a descrição dos dois motivos; `201/400/401/404`, body e `201`
      inalterados.

## 5. Frontend — contrato e hook

- [x] 5.1 `frontend/src/features/orders/orders-api.ts`: `ORDER_CONFLICT_CODES`
      (mesmos valores do backend, com o comentário curto de que espelha
      `orders.constants.ts`); `conflictCode(error)` → `body.code` de um
      `ApiError` `409`, ou `undefined`; `countOrdersByStatus` vira
      `listOrdersByStatus(status)` → `GET /orders` com `{ status, pageSize: 50 }`,
      devolvendo `PaginatedOrders`.
- [x] 5.2 `frontend/src/features/orders/use-orders-in-progress.ts`: as duas
      `useQueries` passam a `queryKey: ['orders', 'in-progress', status]` e
      `listOrdersByStatus`; `count` = soma dos `total` (só com as duas em mãos),
      `limitReached` como hoje, e novo `hasInProgressOrderFor(foodId)` (algum
      `order.food.id === foodId` nas linhas carregadas; `false` se ainda não
      carregou ou falhou).

## 6. Frontend — aviso, modal e card

- [x] 6.1 `frontend/src/features/orders/duplicate-order-notice.tsx`:
      `Alert variant="warning"` (não `destructive`: é um estado esperado, não um
      erro) com `TriangleAlertIcon`, título "Sua entidade já tem um pedido em
      andamento para este alimento" e a descrição do `design.md` (decisão 3).
      Reusa a variante `warning` do `Alert` e o token `--warning`, criados com o
      `OrderLimitNotice` no F6.
- [x] 6.2 `frontend/src/features/orders/create-order-dialog.tsx`: `limitReached`
      (boolean) vira `blocked` (`'limit' | 'duplicate' | null`), resetado ao abrir.
      No `409`, decidir por `conflictCode`: limite → `'limit'`, duplicidade →
      `'duplicate'` (ambos invalidam `['orders']`); `409` com outro código ou sem
      código → `serverError = 'network'` (banner genérico). O estado bloqueado
      mostra `OrderLimitNotice` ou `DuplicateOrderNotice` conforme o motivo, com
      o mesmo footer `Fechar` + `Ver meus pedidos`, em ramo de JSX distinto do
      formulário (nenhum botão alterna `type`).
- [x] 6.3 `frontend/src/features/orders/request-donation-card.tsx`: precedência
      (1) sem quantidade → (2) `limitReached` → (3) `hasInProgressOrderFor(
      food.id)` com `DuplicateOrderNotice` + botão desabilitado → (4) normal.

## 7. Verificação e fechamento

- [x] 7.1 `frontend/`: `npm run lint:check` (0 warnings) + `npm run build` sem
      erro.
- [x] 7.2 Verificação de ponta a ponta no browser (`playwright-cli`, backend
      `:3000` + Postgres + `npm run dev`; contas de teste via cadastro real):
  - Entidade sem pedido do alimento A: card habilitado; enviar → `201`, toast,
    modal fecha; o card do alimento A passa a mostrar o aviso de duplicidade com
    o botão desabilitado (a invalidação de `['orders']` refaz a consulta), e o
    card de um alimento B segue habilitado.
  - Recarregar o detalhe do alimento A → aviso de duplicidade vem da consulta
    (não do estado anterior); `GET /orders?status=…&pageSize=50` são os únicos
    requests de pedido novos (nenhum a mais que no F6).
  - **Reativo**: com o modal aberto num alimento sem pedido, criar o pedido do
    mesmo alimento por API e então enviar → `409` com `DUPLICATE_ORDER_IN_PROGRESS`
    → o corpo do modal vira o aviso de duplicidade; "Fechar" fecha e o card atrás
    já está desabilitado; "Ver meus pedidos" navega para `/pedidos`.
  - **Liberar**: pedido `Aceito` → duplicidade continua; estabelecimento rejeita
    (ou entidade confirma o recebimento) → recarregar → card volta habilitado e
    um novo pedido do mesmo alimento é aceito (`201`).
  - **Limite × duplicidade**: entidade com 10 em andamento, um deles do alimento
    aberto → o card mostra o aviso de **limite** (não o de duplicidade); um `409`
    reativo nessa situação também cai no estado de limite.
  - **`409` desconhecido**: interceptar o `POST /api/orders` (`playwright-cli
    route`) devolvendo `409` sem `code` → banner genérico, nem limite nem
    duplicidade.
  - Sem regressão do F6: total/parcial, validação inline, `400`, `404`, estoque
    zero, estabelecimento sem o card, limite reativo (agora por `code`).
  - `playwright-cli console` sem erro nem warning de código. Dados de teste
    removidos ao final via SQL direto.
  - **Resultado**: verificado no browser com 1 estabelecimento e 2 entidades
    beneficiárias de teste (cadastro real), 12 alimentos e ~20 pedidos por
    API/UI. Confirmado: com 10 em andamento o card de um alimento **já pedido** e
    o de um alimento **novo** mostram o aviso de **limite** (limite antes da
    duplicidade); com 5, o alimento já pedido mostra o aviso de duplicidade
    (título/descrição do `design.md`) e o novo segue habilitado; enviar Total →
    `201`, toast, modal fecha e o card do alimento passa a duplicidade sem
    recarregar (a invalidação de `['orders']` refaz as duas consultas); recarregar
    traz o aviso da própria consulta; **os únicos requests de pedido por visita são
    `GET /orders?status=Pendente&pageSize=50` e `…status=Aceito&pageSize=50`**
    (nenhum a mais que o F6); `409` reativo (pedido do mesmo alimento criado por
    API com o modal aberto) → corpo do modal vira o aviso de duplicidade, o card
    atrás já desabilitado, "Ver meus pedidos" navega para `/pedidos` (dialog
    desmonta) e ao voltar o card segue em duplicidade; pedido `Aceito` continua
    bloqueando, `Recebido` libera e um novo pedido parcial (`2.5`) do mesmo
    alimento dá `201`; com o modal aberto num alimento novo e o 10º pedido criado
    por API (limite **e** duplicidade valem) → estado de **limite**; `409` sem
    `code` (interceptado com `playwright-cli route`) → banner genérico, formulário
    intacto, nenhum pedido criado; `404` (alimento vencido por SQL) e `400`
    (estoque reduzido por SQL) seguem como no F6; estabelecimento sem o card e
    sem nenhuma consulta de pedidos; console só com o host fictício da imagem e o
    `400` provocado, sem erro/warning de código.
    Observação de teste (não é bug): "Total" num alimento de 20 unidades, uma
    vez aceito, zera o estoque e o card passa a "sem quantidade" (precedência 1) —
    a liberação foi refeita num alimento com estoque sobrando. Observação de dev:
    rodar `npm run build` em `backend/` com o `nest start --watch` ligado derrubou
    o processo da API sem o watcher subir de novo; uma alteração real de conteúdo
    num arquivo do backend (revertida em seguida) religou.
- [x] 7.3 `openspec validate bloqueio-pedido-duplicado --strict` sem erro.
- [x] 7.4 `docs/PLANO-FRONTEND.md`: na seção F6, registrar a regra "um pedido em
      andamento por alimento" (aviso proativo no card, estado no modal, `code`
      do `409`) e que os `409` do `POST /orders` agora se distinguem pelo `code`.
