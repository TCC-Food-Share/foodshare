## Why

RF16 deu ao estabelecimento como aceitar um pedido "Pendente". RF17 fecha a outra saída: recusar um pedido "Pendente" que recebeu, sem se comprometer com a doação. Sem isso um pedido que o estabelecimento não vai atender fica "Pendente" para sempre — ocupando a cota de 10 pedidos em andamento da entidade (RF15) e sujando a listagem de ambos os lados (RF19).

## What Changes

- Novo endpoint `PATCH /orders/:id/reject`, autenticado, **exclusivo de estabelecimento** — o pedido é resolvido pela sessão (`userId` → estabelecimento), nunca por id do cliente. Conta que não é estabelecimento → `404`.
- Só rejeita pedido que **pertence ao estabelecimento da sessão**, **não excluído** e com status **"Pendente"**. Pedido inexistente/de outro estabelecimento/excluído → `404`; pedido que não está "Pendente" (ex: já "Aceito" ou "Rejeitado") → `409`.
- A rejeição **não toca no estoque** — pedido "Pendente" nunca reservou nada (RF16 só reserva no aceite). Só muda o status para **"Rejeitado"**.
- A passagem "Pendente" → "Rejeitado" é um update condicional (`WHERE statusId = Pendente`) — uma rejeição concorrente com um aceite do mesmo pedido: só uma vence, a outra recebe `409`.
- **"Rejeitado" é status terminal** — pedido rejeitado **sai da contagem de "pedidos em andamento" do RF15**. Isso ajusta o requisito "Limite de pedidos em andamento" de `pedidos/solicitacao`: contam para o limite apenas os pedidos "Pendente" ou "Aceito"; "Rejeitado" (e, futuramente, "Recebido" do RF18) não.
- **Seed**: `OrderStatus` ganha "Rejeitado". **Sem migration** — usa `Order.statusId` já existente.

## Capabilities

### New Capabilities
- `pedidos/rejeicao`: permite que o estabelecimento autenticado rejeite um pedido "Pendente" que recebeu, movendo-o para o status terminal "Rejeitado", sem alterar o estoque do alimento.

### Modified Capabilities
- `pedidos/solicitacao`: o requisito "Limite de pedidos em andamento por entidade beneficiária" (RF15) passa a excluir da contagem os pedidos com status terminal — hoje "Rejeitado". Contam só "Pendente" e "Aceito". Texto e um cenário novo; nenhum outro requisito muda.

## Impact

- **Backend**: `OrdersService` ganha `reject(userId, orderId)` (resolve estabelecimento, valida posse/status, update condicional de status). `OrdersService.create` (RF15): a contagem de pedidos em andamento ganha um filtro `status.name in ('Pendente','Aceito')` (constante `IN_PROGRESS_STATUSES`) — pedido "Rejeitado" deixa de contar. `OrdersController`: rota `PATCH /orders/:id/reject`, doc Scalar pt-BR citando RF17.
- **Banco**: nenhuma migration. `prisma/seed.ts` → `ORDER_STATUSES` ganha "Rejeitado".
- **API/Doc**: nova operação sob a tag `Pedidos`; respostas `200/401/404/409`.
- **Efeito observável**: uma entidade que estava na cota de 10 (RF15) volta a poder pedir quando um dos pedidos é rejeitado. RF19 (fora do escopo) exibirá o status "Rejeitado".
- **Testes**: `orders.service.spec.ts` — novos casos de `reject`; ajuste nos casos de `create`/RF15 para o filtro de status na contagem.
- **Frontend**: fora desta change.
- **Fora do escopo**: RF18 (confirmação de recebimento), RF19/RF20 (listagem e detalhe de pedido), motivo de rejeição padronizado (`Order.cancellationReasonId` fica `null` — "cancelamento com motivo padronizado" é Fora do Escopo em `docs/REQUISITOS.md`), rejeição de pedido **já aceito** / estorno de reserva, notificação à entidade beneficiária.
