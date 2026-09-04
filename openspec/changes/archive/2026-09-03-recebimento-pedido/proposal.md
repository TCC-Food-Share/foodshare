## Why

RF16 deu ao estabelecimento como aceitar um pedido (reservando o estoque); RF17, como rejeitar. Falta o fecho do fluxo pelo lado da entidade beneficiária: confirmar que recebeu o alimento. RF18 encerra o pedido — a reserva feita no aceite vira consumo confirmado, o pedido sai da cota de "pedidos em andamento" (RF15) e a doação está concluída. Sem isso um pedido "Aceito" fica em aberto para sempre.

## What Changes

- Novo endpoint `PATCH /orders/:id/receive`, autenticado, **exclusivo de entidade beneficiária** — o pedido é resolvido pela sessão (`userId` → entidade), nunca por id do cliente. Conta que não é entidade beneficiária → `404`.
- Só confirma recebimento de pedido que **pertence à entidade da sessão**, **não excluído** e com status **"Aceito"**. Pedido inexistente/de outra entidade/excluído → `404`; pedido que não está "Aceito" (ex: "Pendente", "Rejeitado", já "Recebido") → `409`.
- A confirmação **não toca no estoque** — a quantidade já foi decrementada de `Food.quantity` no aceite (RF16). Confirmar recebimento só torna esse consumo definitivo. Só muda o status para **"Recebido"**.
- A passagem "Aceito" → "Recebido" é um update condicional (`WHERE statusId = Aceito`) — duas confirmações concorrentes do mesmo pedido: só uma vence, a outra recebe `409`.
- **"Recebido" é status terminal** — pedido recebido **sai da contagem de "pedidos em andamento" do RF15**. O filtro do RF15 já é uma whitelist (`status in ('Pendente','Aceito')`, introduzida no RF17), então **nenhuma mudança de código no RF15** — "Recebido" já entra excluído. Só o texto do requisito "Limite de pedidos em andamento" de `pedidos/solicitacao` é atualizado para citar "Recebido" como terminal, com um cenário novo.
- **Seed**: `OrderStatus` ganha "Recebido". **Sem migration** — usa `Order.statusId` já existente.

## Capabilities

### New Capabilities
- `pedidos/recebimento`: permite que a entidade beneficiária autenticada confirme o recebimento do alimento de um pedido "Aceito" que é dela, movendo-o para o status terminal "Recebido" e encerrando o pedido, sem alterar o estoque do alimento.

### Modified Capabilities
- `pedidos/solicitacao`: o requisito "Limite de pedidos em andamento por entidade beneficiária" (RF15) passa a citar "Recebido" (além de "Rejeitado") como status terminal fora da contagem. Ajuste de texto e um cenário novo; nenhum outro requisito muda, e o código do RF15 não muda (a whitelist `('Pendente','Aceito')` já cobre).

## Impact

- **Backend**: `OrdersService` ganha `receive(userId, orderId)` (resolve entidade beneficiária, valida posse/status "Aceito", update condicional de status). Sem `$transaction` (escrita única) e sem tocar em `Food`. `OrdersController`: rota `PATCH /orders/:id/receive`, doc Scalar pt-BR citando RF18. `OrdersService.create` (RF15) **não muda**.
- **Banco**: nenhuma migration. `prisma/seed.ts` → `ORDER_STATUSES` ganha "Recebido".
- **API/Doc**: nova operação sob a tag `Pedidos`; respostas `200/401/404/409`.
- **Efeito observável**: uma entidade que estava na cota de 10 (RF15) volta a poder pedir quando um pedido "Aceito" é confirmado como recebido. RF19 (fora do escopo) exibirá o status "Recebido".
- **Testes**: `orders.service.spec.ts` — novos casos de `receive`; `orderStatus` mock ganha "Recebido".
- **Frontend**: fora desta change.
- **Fora do escopo**: RF19/RF20 (listagem e detalhe de pedido), reabrir/desfazer um pedido "Recebido", avaliação da doação, notificação ao estabelecimento, confirmação de recebimento pelo estabelecimento (RF18 é só o lado da entidade beneficiária).
