## Why

A versão final troca os nomes de status do MVP (DT01, DT02): o pedido passa a
ter `Pendente`, `Em andamento`, `Rejeitado`, `Doado` e `Cancelado`, e o alimento
passa a ter `Ativo`, `Reservado` e `Inativo`. Hoje o código usa `Aceito` e
`Recebido`, com as strings soltas no backend, no seed e em várias telas. Quase
toda change seguinte (reserva, cancelamento, expiração, painel) depende desses
nomes, então esta é a primeira da fila (item 0.1 de
`docs/PLANO-IMPLEMENTACAO.md`).

Além da troca de nome, a terminologia das specs do MVP está errada para a versão
final: elas chamam o conjunto `Pendente` + `Aceito` de "em andamento", e "Em
andamento" agora é o nome de um status só. O conjunto passa a se chamar
**pedidos em aberto**.

## What Changes

- **Backend — seed:** status de pedido `Pendente`, `Em andamento`, `Rejeitado`,
  `Doado`, `Cancelado`; status de alimento `Ativo`, `Reservado`, `Inativo`.
- **Backend — constantes:** `ORDER_STATUS` e `FOOD_STATUS` centralizados; todas
  as strings soltas de status (service, DTOs, seed, testes) passam a usar essas
  constantes. O conjunto de pedidos em aberto vira `OPEN_ORDER_STATUSES`.
- **Backend — comportamento renomeado, sem regra nova:** o aceite move o pedido
  para `Em andamento` (antes `Aceito`); a confirmação de recebimento move para
  `Doado` (antes `Recebido`) e passa a exigir `Em andamento`.
- **Backend — filtro:** `GET /orders?status=` aceita os cinco nomes novos,
  inclusive `Cancelado`, e recusa `Aceito` e `Recebido` como inválidos.
  **BREAKING** para quem chamava a API com os nomes antigos (só o nosso
  frontend, atualizado nesta change).
- **Backend — documentação da API (Scalar):** textos do `orders.controller.ts`
  e exemplos dos DTOs com os nomes novos e a numeração RF nova.
- **Frontend — status centralizados:** um único arquivo de status de pedido
  (lista ordenada, pedidos em aberto, estilo do selo).
- **Frontend — listagem:** abas na ordem Pendente → Em andamento → Rejeitado →
  Doado → Cancelado, com contador. A aba Cancelado fica vazia até a change
  `cancelar-pedido` (3.2).
- **Frontend — selo de status** com uma cor para cada um dos cinco status.
- **Frontend — textos:** "Aceito/Recebido" e "em andamento" (no sentido de
  pedidos em aberto) trocados em todas as telas: detalhe, ações, diálogos,
  toasts, estados vazios, aviso de limite e aviso de pedido duplicado.
- **Banco:** nenhuma migration. Reset do banco local e do staging, como decidido
  em P02 (`docs/MODELO-DE-DADOS.md`, "Migração a partir do MVP").

## Cobertura

- **DT01** — status do pedido (nomes).
- **DT02** — status do alimento (nomes; `Revisar` não existe).
- **RF24** — rejeição (texto revisado: só os nomes de status).
- **RF27** — abas por status (Pendente, Em andamento, Rejeitado, Doado,
  Cancelado). A busca do RF27 fica para a 3.3.
- **RN01** — os cinco status são os únicos válidos.
- **RN04, RN05, RN06** — limite de 10 e duplicidade agora descritos sobre
  "pedidos em aberto". Os códigos de erro não mudam.

## Capabilities

### New Capabilities

- `pedidos/status`: os cinco status de pedido, quais são finais e o conceito de
  "pedidos em aberto". Base que as changes 3.1, 3.2 e 6.1 vão modificar.
- `alimentos/status`: os três status de alimento. Base para 2.2 e 3.1.

### Modified Capabilities

- `pedidos/aceite`: o aceite move o pedido para `Em andamento`.
- `pedidos/recebimento`: a confirmação exige `Em andamento` e move para `Doado`;
  `Doado` é o status final.
- `pedidos/rejeicao`: os cenários citam `Em andamento`, `Doado` e `Cancelado`.
- `pedidos/listagem`: o filtro `status` aceita os cinco nomes novos.
- `pedidos/solicitacao`: limite de 10 e duplicidade passam a falar de "pedidos
  em aberto" (`Pendente` + `Em andamento`); `Doado` e `Cancelado` não contam.

## Fora do escopo

Cada item abaixo é outra change do plano:

- Alimento virar `Reservado` ao zerar o estoque, `Inativo` após a última
  confirmação e a rejeição automática de pendentes (RN07, RN08) — **3.1
  `pedido-tipo-e-reserva`**. Nesta change, o aceite e a confirmação mantêm a
  regra de estoque do MVP; só os nomes mudam.
- Transição para `Cancelado` e motivo de cancelamento (RF26, RN09) — **3.2
  `cancelar-pedido`**. Aqui `Cancelado` só existe no seed, no filtro e na aba.
- Busca na listagem de pedidos (RF27, parte de busca) — **3.3**.
- Desativar, reativar e excluir alimento (RF16–RF18) — **2.2**.
- Expiração automática (RF72) — **6.1**.
- Renomear as rotas (`PATCH /orders/:id/accept`, `/reject`, `/receive`): os
  verbos continuam, só o status de destino muda.

## Perguntas em aberto

Nenhuma. A forma de migrar os dados (reset, sem conversão) já foi decidida em
P02.

## Impact

- **Backend:** `orders/orders.constants.ts`, `orders/orders.service.ts`,
  `orders/orders.controller.ts`, `orders/dto/*.ts`, `orders/orders.service.spec.ts`,
  `foods/foods.service.ts` (+ novo `foods/foods.constants.ts`),
  `foods/dto/food-response.dto.ts`, `foods/foods.service.spec.ts`,
  `prisma/seed.ts`.
- **Frontend:** `features/orders/` (novo `order-status.ts`; `orders-api.ts`,
  `order-status-badge.tsx`, `orders-page.tsx`, `use-order-counts.ts`,
  `use-orders-in-progress.ts`, `order-actions.ts`, `orders-empty-state.tsx`,
  `order-limit-notice.tsx`, `duplicate-order-notice.tsx`).
- **Banco:** sem migration; reset local (com consentimento) e no staging
  (manual, no Coolify, depois do merge em `develop`). O seed não cria usuários:
  as contas de teste precisam ser recriadas.
- **Specs:** os `Purpose` de `pedidos/aceite`, `pedidos/recebimento`,
  `pedidos/rejeicao` e `pedidos/listagem` citam os nomes antigos e são
  ajustados à mão (o delta só cobre requisitos).
