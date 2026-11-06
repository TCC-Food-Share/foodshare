## Why

Hoje nenhuma das partes consegue cancelar um pedido. A entidade só sai do limite de 10 pedidos em aberto
esperando uma resposta, e um pedido aceito que não vai ser retirado prende o estoque (e o alimento em
`Reservado`) para sempre. O RF26 e a RN09 pedem o cancelamento com motivo e a devolução do estoque.
As changes 4.4 (exclusão da própria conta) e 6.1 (expiração) dependem dessa transição.

## What Changes

- **Rota nova `PATCH /orders/:id/cancel`**, com `cancellationReasonId` no corpo. Qualquer uma das duas
  partes pode cancelar um pedido `Pendente` ou `Em andamento` (RF26). Tudo roda numa transação, com o
  alimento travado:
  - o pedido vira `Cancelado` e grava o motivo e quem cancelou;
  - se o pedido estava `Em andamento`, a quantidade volta ao estoque e, se o alimento estava `Reservado`,
    ele volta a `Ativo` (RN09);
  - os pedidos `Pendente` do **tipo total** do mesmo alimento passam a pedir o novo estoque, com
    `quantityUpdatedAt` (nova DT32, abaixo).
- **Motivo (RN09, RN31):**
  - é obrigatório e precisa existir na lista;
  - motivo de sistema é recusado;
  - as recusas usam os códigos que a exclusão de alimento já usa (`CANCELLATION_REASON_REQUIRED`,
    `INVALID_CANCELLATION_REASON`);
  - pedido que não está em aberto responde `409` com `code: ORDER_NOT_OPEN`;
  - pedido excluído responde `404` (RN14).
- **Nova DT32 (decidida nesta proposta):** quando o cancelamento devolve estoque, os pedidos `Pendente`
  do tipo total acompanham o novo estoque, como na edição (RN20) e no aceite (DT31). Isso mantém a
  RN03, pela qual um pedido total sempre corresponde ao estoque inteiro. Os parciais não mudam, porque
  o estoque só aumenta.
- **Nova DT33 (decidida nesta proposta):** o pedido cancelado registra quem cancelou em
  `Order.cancelledBy`, um enum com os valores `ESTABLISHMENT`, `BENEFICIARY_ENTITY`, `ADMINISTRATOR` e
  `SYSTEM`:
  - esta change usa só os dois primeiros. A exclusão de alimento (RF16) passa a gravar `ESTABLISHMENT`;
  - os outros dois ficam definidos para as changes 4.4, 5.3 e 6.1, que gravam o valor de cada fluxo
    delas;
  - a tela mostra quem cancelou ("Você cancelou", "O estabelecimento cancelou"...).
- **Respostas:**
  - a listagem (`GET /orders`) traz o motivo e quem cancelou;
  - o detalhe (`GET /orders/:id`) também.
- **Schema:**
  - enum `OrderCancelledBy` e o campo `Order.cancelledBy`, opcional;
  - a migration preenche `ESTABLISHMENT` nos pedidos já `Cancelado`, porque até aqui só a exclusão de
    alimento cancelava.
- **Frontend:**
  - ação "Cancelar pedido" no card de ações do detalhe, para as duas partes, enquanto o pedido está em
    aberto;
  - o diálogo diz o efeito (devolução do estoque quando está `Em andamento`) e pede o motivo no select
    com busca, com "Sugerir nova opção";
  - a aba "Cancelado" e o detalhe mostram o motivo e quem cancelou.
- **Documentação:**
  - DT32 e DT33 em `docs/REQUISITOS.md`;
  - `Order.cancelledBy` e o enum em `docs/MODELO-DE-DADOS.md`.

**Cobre:** RF26 e RN09, além de DT32 e DT33 (novas). Mantém RN01, RN04, RN05, RN14, RN31 e DT27.

**Fica de fora (outras changes do plano):**

- busca na listagem, contato no detalhe e o aviso de `quantityUpdatedAt` (3.3: RF27, RF28, RN12);
- cancelamento automático na exclusão da própria conta (4.4: RF04, RF05, RN28, RN29);
- cancelamento pelo administrador ao excluir instituição (5.3: RF42, RF43);
- cancelamento por expiração e por alimento vencido (6.1: RF72, RN11).

**Perguntas em aberto:** nenhuma. O ajuste dos totais na devolução (DT32) e o registro de quem
cancelou (DT33) foram decididos com a dupla.

## Capabilities

### New Capabilities

- `pedidos/cancelamento`:
  - cancelamento pelas duas partes, com motivo obrigatório e sem motivo de sistema;
  - devolução do estoque e `Reservado` → `Ativo`;
  - ajuste dos totais pendentes (DT32) e registro de quem cancelou (DT33);
  - códigos das recusas e concorrência;
  - ação e diálogo na tela de detalhe.

### Modified Capabilities

- `pedidos/status`: o cenário de ação sobre pedido em status final passa a incluir o cancelamento.
- `pedidos/listagem`:
  - cada item traz o motivo e quem cancelou;
  - a aba "Cancelado" mostra os dois.
- `pedidos/detalhe`: o detalhe traz o motivo e quem cancelou, e a tela mostra os dois no pedido cancelado.
- `alimentos/gestao`: a exclusão lógica de alimento grava `ESTABLISHMENT` como quem cancelou os pedidos
  `Em andamento`.

## Impact

- **Backend:**
  - `prisma/schema.prisma` e uma migration nova (enum, campo e preenchimento);
  - `orders/orders.service.ts`, `orders/orders.controller.ts`, `orders/orders.constants.ts`;
  - DTO novo do corpo do cancelamento; `order-response.dto.ts` e `order-detail-response.dto.ts`;
  - a validação do motivo sai de `foods/foods.service.ts` para um helper compartilhado;
  - `foods/foods.service.ts` (`remove` grava `cancelledBy`);
  - testes em `orders/orders.service.spec.ts` e `foods/foods.service.spec.ts`.
- **API:**
  - rota nova `PATCH /orders/:id/cancel`;
  - `GET /orders` e `GET /orders/:id` ganham `cancellationReason` e `cancelledBy`, que são campos
    novos (nada muda nos campos que já existiam).
- **Frontend:**
  - `features/orders/order-actions.ts`, `order-actions-card.tsx`, `orders-api.ts` e `order-status.ts`
    (rótulos de quem cancelou);
  - diálogo novo de cancelamento;
  - `orders-table.tsx`, `order-cards.tsx` e `order-detail-cards.tsx`.
- **Dados:**
  - pedidos `Cancelado` existentes recebem `cancelledBy = ESTABLISHMENT` pela migration;
  - sem reset de banco.
