## Why

RF14 (change `solicitacao-pedido`) deixou a criação de pedido sem nenhum teto: uma entidade beneficiária pode abrir quantos pedidos quiser. RF15 fecha isso — a entidade só deveria acumular um número razoável de pedidos ainda não resolvidos por vez, para não travar estoque de vários estabelecimentos com solicitações que talvez não vá confirmar. O limite é 10 pedidos em andamento; ao chegar nesse número, o próximo pedido é recusado até algum dos atuais ser encerrado.

## What Changes

- `POST /orders` (RF14) ganha uma nova pré-condição: antes de criar o pedido, o sistema conta os pedidos **em andamento** da entidade beneficiária autenticada. Se já houver **10 ou mais**, a requisição é recusada com **`409 Conflict`** e o pedido **não é criado**.
- "Pedido em andamento" = pedido da entidade, **não excluído logicamente** (`deleted = false`), cujo status **não é terminal**. No estado atual do MVP só existe o status `"Pendente"` (nenhum fluxo de encerramento foi implementado ainda — RF17/RF18), então na prática a contagem hoje é "todos os pedidos não excluídos da entidade". Quando RF17 (rejeição) e RF18 (recebimento) entrarem, esses status passam a ser terminais e saem da contagem — sem nova change de RF15.
- A checagem do limite roda **logo após resolver a entidade beneficiária da sessão** e **antes** das validações do alimento — é uma trava sobre o ator, independe do corpo da requisição. Conta que não é entidade beneficiária continua caindo no `404` do RF14 antes disso.
- O teto (10) fica como constante nomeada no `OrdersService` (`MAX_ORDERS_IN_PROGRESS`). "10 ou mais" ⇒ bloqueia quando `count >= 10`; uma entidade com exatamente 10 pedidos em andamento não cria o 11º.
- **Sem mudança de schema**: usa `Order.beneficiaryEntityId`, `Order.deleted` e `Order.statusId` já existentes; só um `prisma.order.count(...)` novo.
- Doc Scalar do `POST /orders` passa a citar o `409` (limite de pedidos em andamento) junto do RF15.

## Capabilities

### New Capabilities
<!-- Nenhuma. RF15 é uma restrição adicional sobre a criação de pedido, que já é a capability pedidos/solicitacao. -->

### Modified Capabilities
- `pedidos/solicitacao`: adiciona o requisito "Limite de pedidos em andamento por entidade beneficiária" — nenhum requisito existente do change `solicitacao-pedido` muda de texto; ver `specs/pedidos/solicitacao/spec.md` deste change com `## ADDED Requirements`.

## Impact

- **Backend**: `OrdersService.create` ganha a contagem + checagem de limite (`ConflictException`) antes da validação de alimento. Nova constante `MAX_ORDERS_IN_PROGRESS = 10`. `OrdersController`: `@ApiConflictResponse` no `POST /orders`, texto em pt-BR citando RF15.
- **Banco**: nenhuma migration. Query nova de contagem sobre a tabela `order`.
- **API/Doc**: `POST /orders` passa a documentar `409`; sem rota nova.
- **Frontend**: fora desta change.
- **Depende de**: change `solicitacao-pedido` (RF14) implementado — este change altera o `OrdersService` criado lá.
- **Fora do escopo**: RF16-RF20 (aceite/reserva, rejeição, confirmação de recebimento, listagem e detalhe de pedido), configurabilidade do teto, e qualquer bloqueio de pedido duplicado para o mesmo alimento (RF15 é o único limite desta fase).
