## 1. Backend — constantes e seed

- [x] 1.1 `backend/src/orders/orders.constants.ts`: trocar `INITIAL_STATUS`,
      `ACCEPTED_STATUS`, `REJECTED_STATUS` e `RECEIVED_STATUS` por
      `ORDER_STATUS` (`as const`, cinco status); `ORDER_STATUS_NAMES =
      Object.values(ORDER_STATUS)`; `IN_PROGRESS_STATUSES` vira
      `OPEN_ORDER_STATUSES` (`Pendente`, `Em andamento`). `ORDER_CONFLICT_CODES`
      não muda (design, decisões 1 e 3).
- [x] 1.2 Criar `backend/src/foods/foods.constants.ts` com `FOOD_STATUS`
      (`Ativo`, `Reservado`, `Inativo`) e `FOOD_STATUS_NAMES`.
- [x] 1.3 `backend/prisma/seed.ts`: remover as listas locais de status e
      usar `ORDER_STATUS_NAMES` e `FOOD_STATUS_NAMES` importados do `src/`
      (design, decisão 2). Conferir que `npx tsx prisma/seed.ts` resolve os
      imports.

## 2. Backend — services, DTOs e documentação

- [x] 2.1 `orders/orders.service.ts`: usar `ORDER_STATUS.*` e
      `OPEN_ORDER_STATUSES` em `create`, `accept`, `reject`, `receive` e na
      contagem do limite; renomear as variáveis locais (`accepted` →
      `inProgress`, `received` → `donated`) e `MAX_ORDERS_IN_PROGRESS` →
      `MAX_OPEN_ORDERS`. As mensagens de erro em inglês passam a dizer
      "in progress" só para o status (ex.: `'Order is not in progress.'` na
      confirmação).
- [x] 2.2 `foods/foods.service.ts`: trocar a constante local `ACTIVE_STATUS`
      por `FOOD_STATUS.ACTIVE`.
- [x] 2.3 DTOs: `example` de `order-detail-response.dto.ts` e
      `list-orders-query.dto.ts` com `'Em andamento'`; o `enum` do filtro
      segue `ORDER_STATUS_NAMES` (cinco valores). Conferir
      `food-response.dto.ts` (`'Ativo'` continua válido).
- [x] 2.4 `orders/orders.controller.ts`: textos do Scalar com os nomes novos
      ("Em andamento", "Doado", "Cancelado"), "pedidos em aberto" no lugar de
      "pedidos em andamento" quando for o conjunto, e a numeração RF nova
      (RF22 solicitação/limite, RF23 aceite, RF24 rejeição, RF25 confirmação,
      RF27 listagem, RF28 detalhe).

## 3. Backend — testes

- [x] 3.1 `orders.service.spec.ts`: substituir as strings literais de status
      pelas constantes e os nomes de teste ("moves … to Aceito/Recebido")
      pelos novos. Cobrir: aceite move para `Em andamento`; confirmação exige
      `Em andamento` e move para `Doado`; o limite conta `OPEN_ORDER_STATUSES`.
- [x] 3.2 Teste do filtro: `list` com `status: 'Cancelado'` monta o `where`
      com esse nome; um teste de validação do `ListOrdersQueryDto` (ou e2e, se
      já houver padrão) recusa `'Aceito'` e `'Recebido'`.
- [x] 3.3 `foods.service.spec.ts`: usar `FOOD_STATUS.ACTIVE` no lugar de
      `'Ativo'`.
- [x] 3.4 `npm run lint` e `npm test` em `backend/` passando. **Não** rodar
      `npm run build` com o `start:dev` ligado.

## 4. Banco local

- [x] 4.1 Pedir consentimento à dupla (AskUserQuestion) e rodar
      `npx prisma migrate reset` + `npx prisma db seed` no banco local
      (design, decisão 6).
- [x] 4.2 Conferir no banco: `order_status` tem exatamente os cinco nomes
      novos e `food_status` os três; rodar o seed de novo não duplica nada.

## 5. Frontend — status centralizados

- [x] 5.1 Criar `frontend/src/features/orders/order-status.ts` com
      `ORDER_STATUS`, `OrderStatusName`, `ORDER_STATUSES` (Pendente → Em
      andamento → Rejeitado → Doado → Cancelado), `OPEN_ORDER_STATUSES`,
      `isOrderStatus` e `ORDER_STATUS_STYLES` (design, decisão 4). Comentário
      curto apontando `backend/src/orders/orders.constants.ts` como espelho.
- [x] 5.2 `orders-api.ts`: remover o tipo e a lista locais e importar de
      `order-status.ts`; ajustar os imports em `orders-page.tsx`,
      `use-order-counts.ts` e onde mais o `tsc` acusar.
- [x] 5.3 `use-orders-in-progress.ts`: usar `OPEN_ORDER_STATUSES` no lugar da
      lista local `['Pendente', 'Aceito']`; atualizar o comentário que cita
      `MAX_ORDERS_IN_PROGRESS` para `MAX_OPEN_ORDERS`.
- [x] 5.4 Conferir as cores do selo nos frames de pedidos do protótipo
      (`MyFw0`, `vRf3b`, `NYKRt`, `I0EByf`) antes de fechar
      `ORDER_STATUS_STYLES` (design, decisão 5). `order-status-badge.tsx`
      passa a ler os estilos de `order-status.ts`.

## 6. Frontend — telas e textos

- [x] 6.1 `orders-page.tsx`: abas e contadores com os cinco status, na ordem
      de `ORDER_STATUSES`; a aba Cancelado mostra o estado vazio.
- [x] 6.2 `orders-empty-state.tsx`: entradas para `Em andamento`, `Doado` e
      `Cancelado` nos dois papéis (substituindo `Aceito` e `Recebido`).
- [x] 6.3 `order-actions.ts`: `expectedStatus` da confirmação passa a
      `ORDER_STATUS.IN_PROGRESS`; `availableActions` usa as constantes; o
      `SITUATION` ganha `Em andamento`, `Doado` e `Cancelado` nos dois papéis;
      o diálogo de confirmação diz "encerrado como Doado".
- [x] 6.4 `order-limit-notice.tsx` e `duplicate-order-notice.tsx`: trocar
      "pedidos em andamento (pendentes ou aceitos)" por "pedidos em aberto
      (pendentes ou em andamento)" e "aceito(s)" pelo status novo (design,
      decisão 8). Sem mencionar cancelamento.
- [x] 6.5 Revisar toasts, títulos e textos de `order-detail-*`,
      `order-actions-card.tsx`, `order-cards.tsx`, `orders-table.tsx` e
      `create-order-dialog.tsx`: nenhum "Aceito"/"Recebido" como status.
      Verbos ("aceitar", "recebimento") continuam.
- [x] 6.6 `npm run lint` e `npx tsc -b` em `frontend/` passando (sem
      `eslint --fix` com o dev server ligado).

## 7. Specs e documentação

- [x] 7.1 Ajustar à mão o `## Purpose` de `openspec/specs/pedidos/aceite`,
      `pedidos/recebimento`, `pedidos/rejeicao` e `pedidos/listagem` para os
      nomes novos (o delta não cobre `Purpose`).
- [x] 7.2 `grep -rnE "Aceito|Recebido" backend/src backend/prisma frontend/src`
      vazio. `grep -rn "IN_PROGRESS_STATUSES\|INITIAL_STATUS\|ACCEPTED_STATUS\|RECEIVED_STATUS"`
      vazio.

## 8. Verificação e fechamento

- [x] 8.1 No navegador, com contas recriadas pelo `/cadastro`: estabelecimento
      cadastra alimento → entidade pede → estabelecimento aceita (selo e aba
      "Em andamento") → entidade confirma (selo e aba "Doado"). Rejeitar outro
      pedido (aba "Rejeitado"). A aba "Cancelado" abre vazia. Console limpo.
- [x] 8.2 Conferir no Scalar o `enum` do filtro `status` com os cinco nomes e
      chamar `GET /orders?status=Aceito` esperando `400`.
- [x] 8.3 Marcar ✅ o item 0.1 em `docs/PLANO-IMPLEMENTACAO.md`.
- [ ] 8.4 Registrar no PR para `develop` o passo manual pós-merge: limpar o
      banco do staging no Coolify, redeployar e recriar as contas de teste.
