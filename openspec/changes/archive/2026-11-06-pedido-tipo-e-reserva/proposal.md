## Why

O pedido ainda segue as regras do MVP: aceita qualquer quantidade até o estoque, sem olhar o tipo de
solicitação do alimento, e o aceite só desconta o estoque. A versão final exige que a quantidade
respeite o tipo do alimento (RN03), que o aceite reserve o alimento ao zerar e rejeite os pendentes
que não cabem mais (RN07), e que a última confirmação de recebimento encerre o alimento (RN08). As
changes seguintes (3.2 cancelar, 6.1 expiração, 6.2 lembretes) dependem dessas transições e do
`acceptedAt`.

## What Changes

- **Criação de pedido (`POST /orders`)** valida a quantidade pelo `requestType` do alimento (RN03):
  - "Somente total": igual à quantidade disponível;
  - "Somente parcial": maior que 0 e menor que a disponível, salvo a última sobra (DT30, abaixo);
  - "Total ou parcial": maior que 0 e até a disponível;
  - fração (até 2 casas) só se a unidade de medida aceitar.

  As recusas passam a ter `code`.
- **Nova DT30 (decidida nesta proposta):** quando a quantidade disponível de um alimento "Somente
  parcial" não permite mais um pedido parcial (1 em unidade sem fração, 0,01 em unidade fracionada),
  a entidade pode pedir toda a sobra. O pedido continua do tipo parcial. Sem isso, a sobra ficaria
  presa no feed sem ninguém conseguir pedir.
- **Revisão da derivação do tipo (DT28):** "Somente total" gera pedido total; "Somente parcial", parcial
  (inclusive a sobra da DT30); "Total ou parcial", total se a quantidade for igual ao estoque, e
  parcial se for menor.
- **Aceite (`PATCH /orders/:id/accept`)** conforme RN07, numa transação com o alimento travado:
  - grava `acceptedAt`;
  - desconta o estoque;
  - se o estoque zerar, o alimento vira `Reservado`;
  - efeito nos outros pedidos `Pendente` do alimento (nova DT31, decidida nesta proposta): se sobra
    estoque, os totais passam a pedir o novo estoque, com `quantityUpdatedAt`, como na RN20, e os
    parciais que não cabem viram `Rejeitado`; se o estoque zera, todos viram `Rejeitado`. A RN07
    original rejeitava também os totais.

  As recusas `409` do aceite passam a ter `code`.
- **Prévia do aceite (`GET /orders/:id/accept-impact`)**: quantos pedidos pendentes serão rejeitados,
  quantos totais serão ajustados e se o alimento ficará `Reservado`, para o diálogo de confirmação.
- **Confirmação de recebimento (`PATCH /orders/:id/receive`)** conforme RN08: o pedido vira `Doado`. Se o
  estoque é 0 e não sobra outro pedido `Em andamento` do alimento, o alimento vira `Inativo` e os
  `Pendente` restantes viram `Rejeitado`. Tudo na mesma transação, com o alimento travado. A recusa
  `409` passa a ter `code`.
- **Schema:** `Order.acceptedAt` e o índice `(beneficiaryEntityId, statusId)` de
  `docs/MODELO-DE-DADOS.md`. A migration preenche `acceptedAt` dos pedidos `Em andamento` existentes.
- **Frontend:**
  - o modal "Solicitar doação" mostra só as opções que o tipo do alimento permite, valida a fração
    pela unidade e trata a sobra da DT30;
  - o diálogo de aceite mostra o efeito ("3 pedidos pendentes serão rejeitados", "1 pedido total
    passará a pedir 7 un", "o alimento ficará Reservado").
- **Documentação:** DT30, DT31 e o texto da RN03 e da RN07 em `docs/REQUISITOS.md`, e `acceptedAt` como aplicado em
  `docs/MODELO-DE-DADOS.md`.

**Cobre:** RF22, RF23, RF25, RN03, RN07, RN08, além de DT28 (revisão), DT30 e DT31 (novas). Mantém RN01, RN02,
RN04, RN05, RN06, RN14, RN18 e RN19.

**Fica de fora (outras changes do plano):**

- cancelar pedido e devolver estoque, `Reservado` → `Ativo` (3.2: RF26, RN09);
- busca na listagem, contato no detalhe e o aviso de `quantityUpdatedAt` (3.3: RF27, RF28, RN12);
- expiração de pendentes e o índice `(statusId, orderDate)` (6.1: RF72, RN11);
- lembretes baseados em `acceptedAt` (6.2: RF73, RF74);
- ações do administrador sobre pedidos (5.5: RN13).

**Perguntas em aberto:** nenhuma. A sobra de "Somente parcial" (DT30) e o ajuste dos totais no aceite
(DT31) foram decididos com a dupla.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `pedidos/solicitacao`:
  - quantidade validada pelo tipo de solicitação, com fração pela unidade e a sobra da DT30;
  - derivação do tipo revista;
  - códigos das recusas de quantidade;
  - modal "Solicitar doação" restrito às opções do tipo.
- `pedidos/aceite`:
  - `acceptedAt`;
  - `Reservado` ao zerar o estoque;
  - efeito nos pendentes: totais ajustados ao novo estoque e parciais que não cabem rejeitados, ou
    todos rejeitados quando o estoque zera;
  - prévia do efeito e diálogo que a mostra;
  - códigos das recusas;
  - cenário de aceites simultâneos ajustado à rejeição automática.
- `pedidos/recebimento`: encerramento do alimento (`Inativo`) e rejeição dos pendentes após a última
  confirmação com estoque zerado, transação com o alimento travado, código da recusa.

## Impact

- **Backend:**
  - `prisma/schema.prisma` e uma migration nova (`acceptedAt`, índice e preenchimento);
  - `orders/orders.service.ts`, `orders/orders.controller.ts` e `orders/orders.constants.ts`;
  - DTO novo da prévia do aceite;
  - helpers de quantidade em `foods/food-quantity.ts` e de efeitos em `foods/food-order-effects.ts`;
  - testes em `orders/orders.service.spec.ts`.
- **API:**
  - `POST /orders` passa a recusar quantidades que o tipo do alimento não permite (`400` com `code`);
  - rota nova `GET /orders/:id/accept-impact`;
  - os `409` do aceite e da confirmação ganham `code`, e o formato de resposta continua o mesmo.
- **Frontend:**
  - `features/orders/create-order-dialog.tsx`, `create-order-schema.ts`, `order-actions.ts`,
    `order-action-dialog.tsx` e `orders-api.ts`.
- **Dados:** pedidos `Pendente` antigos que violem a RN03 não são alterados. A regra vale para pedidos
  novos.
