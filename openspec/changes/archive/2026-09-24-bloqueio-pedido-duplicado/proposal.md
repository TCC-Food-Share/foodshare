## Why

Hoje `POST /orders` aceita quantas solicitações a mesma entidade quiser para o
mesmo alimento — na verificação do F6 (`frontend-solicitar-doacao`) foram
criados 9 pedidos `Pendente` da mesma entidade para o mesmo alimento, todos
`201`. Efeito prático: o estabelecimento recebe N pedidos idênticos para
analisar, e a entidade gasta as suas 10 vagas de RF15 com repetição. A change
`limite-pedidos-em-andamento` deixou esse bloqueio **explicitamente fora do
escopo** ("qualquer bloqueio de pedido duplicado para o mesmo alimento"); agora
ele foi pedido, então entra como regra nova sobre `pedidos/solicitacao`.

Decisão do autor: o bloqueio vale **só enquanto o pedido está em andamento**
(`Pendente` ou `Aceito`, o mesmo critério de "em andamento" do RF15). Depois de
`Rejeitado` ou `Recebido` a entidade pode pedir o mesmo alimento de novo — uma
rejeição não vira bloqueio permanente e quem recebeu um pedido parcial pode
pedir o restante.

## What Changes

- **Backend — regra**: `POST /orders` passa a recusar com `409 Conflict`, sem
  criar o pedido, quando a entidade beneficiária da sessão já tem um pedido em
  andamento (não excluído logicamente, status `Pendente` ou `Aceito`) para o
  mesmo `foodId`. Pedidos de outras entidades para o mesmo alimento não contam,
  e pedidos da mesma entidade para outros alimentos também não.
- **Backend — posição da checagem**: entidade da sessão (`404`) → limite de
  10 (`409`, RF15) → alimento disponível (`404`) → **duplicidade (`409`)** →
  quantidade (`400`). Roda depois do alimento porque precisa do `foodId` já
  confirmado como disponível (um alimento inexistente continua `404`), e antes
  da quantidade porque é conflito de estado, não validação de entrada.
- **Backend — identificar a recusa**: hoje o cliente lê "`409` = limite"
  porque era o único `409` do `POST /orders`. Com dois motivos, o corpo do `409`
  passa a trazer um `code` legível por máquina — `ORDERS_IN_PROGRESS_LIMIT_REACHED`
  (o limite existente, comportamento inalterado) e `DUPLICATE_ORDER_IN_PROGRESS`
  (novo) — além da `message` em inglês de sempre. O cliente decide pelo `code`,
  nunca pelo texto.
- **Frontend — reativo** (`features/orders/create-order-dialog.tsx`): `409` com
  `DUPLICATE_ORDER_IN_PROGRESS` troca o corpo do modal por um estado "Você já
  tem um pedido em andamento para este alimento" com o atalho "Ver meus
  pedidos" (mesma mecânica do estado de limite do F6); `409` com o código do
  limite continua no estado de limite; `409` sem código conhecido cai no banner
  genérico.
- **Frontend — proativo** (`request-donation-card.tsx`): o card do detalhe
  passa a saber se a entidade já tem pedido em andamento **daquele alimento**
  e, se tiver, mostra o aviso e desabilita o botão — a entidade não abre o
  modal para ser recusada. Reaproveita as duas consultas que o F6 já faz para
  contar o limite (`Pendente` e `Aceito`), agora trazendo as linhas em vez de
  só o `total`; como RF15 limita as em andamento a ~10, uma página cobre todas.
  Nenhum request novo. Continua consultivo: se a consulta falhar, o botão fica
  habilitado e o backend decide.
- **Docs**: `@ApiConflictResponse` do `POST /orders` cita os dois motivos e os
  `code`; `docs/PLANO-FRONTEND.md` registra a regra na seção F6.

## Capabilities

### New Capabilities

<!-- Nenhuma. A regra é uma restrição adicional sobre a criação de pedido, que
já é a capability `pedidos/solicitacao`. -->

### Modified Capabilities

- `pedidos/solicitacao`: adiciona dois requisitos — "Um pedido em andamento por
  entidade e alimento" (a regra) e "Recusas por conflito identificam o motivo"
  (o `code` do `409`, cobrindo o limite e a duplicidade). Nenhum requisito
  existente muda de texto; ver `specs/pedidos/solicitacao/spec.md` desta change
  com `## ADDED Requirements`.

## Impact

- **Backend** (`backend/src/orders/`):
  - `orders.service.ts`: nova checagem de duplicidade em `create`; o
    `ConflictException` do limite passa a levar `code`.
  - `orders.constants.ts`: os dois `code` como constantes nomeadas.
  - `orders.controller.ts`: `@ApiConflictResponse` do `POST /orders` descreve
    os dois motivos.
  - `orders.service.spec.ts`: novos testes (duplicidade, isolamento, status
    terminais, ordem das checagens, `code` dos dois `409`).
- **Banco**: nenhuma migration, nenhuma constraint nova. A checagem é uma
  consulta a mais sobre a tabela `order` (mesmo padrão do limite).
- **Frontend** (`frontend/src/features/orders/`): `orders-api.ts`,
  `use-orders-in-progress.ts`, `create-order-dialog.tsx`,
  `request-donation-card.tsx`, novo `duplicate-order-notice.tsx` (estilo
  "warning", a mesma variante do `OrderLimitNotice`).
- **Depende de**: `frontend-solicitar-doacao` (F6) — esta change edita arquivos
  que o F6 cria (ainda não arquivado). Aplicar com o F6 já no working tree.
- **Fora do escopo**:
  - Constraint única no banco / índice parcial — a regra é de aplicação, no
    mesmo nível do limite de RF15 (a corrida de duas requisições simultâneas
    fica registrada como risco no `design.md`).
  - Mostrar ou linkar o pedido já existente (`/pedidos/:id`) — F7; o aviso leva
    a `/pedidos`, ainda `RoutePlaceholder`.
  - Atualizar `docs/REQUISITOS.md`: RF14/RF15 não citam a regra. Decisão do
    autor do TCC se ela entra no texto do RF14 ou fica só na spec.
  - Aceite/rejeição/recebimento (F8) e qualquer outra mudança de status.
