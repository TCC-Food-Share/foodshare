## Why

RF14/RF15 dão à entidade beneficiária como criar pedidos ("Pendente"), mas o estabelecimento ainda não tem como responder. RF16 abre o lado do estabelecimento: aceitar um pedido pendente que recebeu, reservando a quantidade do alimento para aquele pedido. Sem isso não há como a doação avançar para a confirmação de recebimento (RF18), e a validação de quantidade do RF14 fica sem lastro real (hoje qualquer pedido "cabe" no estoque porque nada é reservado).

## What Changes

- Novo endpoint `PATCH /orders/:id/accept`, autenticado, **exclusivo de estabelecimento** — o pedido é resolvido pela sessão (`userId` → estabelecimento), nunca por id do cliente. Conta que não é estabelecimento → `404`.
- Só aceita pedido que **pertence ao estabelecimento da sessão**, **não excluído** e com status **"Pendente"**. Pedido inexistente/de outro estabelecimento/excluído → `404`; pedido que não está "Pendente" → `409`.
- No aceite, o sistema **reserva a quantidade decrementando `Food.quantity`** pelo `quantity` do pedido, de forma atômica com guarda `Food.quantity >= order.quantity`. Se o estoque restante não cobre o pedido (outro pedido foi aceito antes) → `409`, pedido continua "Pendente".
- O aceite também **revalida a disponibilidade do alimento** (mesmo recorte do RF11/RF13: status "Ativo", não vencido, não excluído). Alimento indisponível → `409`, sem aceitar.
- Transição de status e decremento acontecem numa transação; a passagem "Pendente" → "Aceito" é um update condicional (`WHERE statusId = Pendente`) para dois aceites concorrentes do mesmo pedido não decrementarem o estoque duas vezes.
- `Food.quantity` passa a representar o **restante** ao longo da vida do alimento — listagem (RF11/RF12) e detalhe (RF13) passam a mostrar o restante. A validação de quantidade do RF14 já compara contra `Food.quantity`, então passa a considerar as reservas sem mudança de texto nem de código.
- **Seed**: `OrderStatus` ganha "Aceito" (RF17 "Rejeitado" e RF18 "Recebido" ficam para as próprias changes).
- **Sem migration** — usa `Order.statusId` e `Food.quantity` já existentes.

## Capabilities

### New Capabilities
- `pedidos/aceite`: permite que o estabelecimento autenticado aceite um pedido "Pendente" que recebeu, reservando a quantidade do alimento vinculado (decremento de `Food.quantity`) e movendo o pedido para "Aceito".

### Modified Capabilities
<!-- Nenhuma. RF16 não altera o texto de nenhum requisito de pedidos/solicitacao: "quantidade não maior que a quantidade atual do alimento" continua verdadeiro — a "quantidade atual" passa a ser o restante. É semântica que aperta, não contrato que muda. -->

## Impact

- **Backend**: `OrdersService` ganha `accept(userId, orderId)` (resolve estabelecimento, valida posse/status/alimento, transação decremento + update). `OrdersController`: rota `PATCH /orders/:id/accept`, doc Scalar pt-BR citando RF16. `OrdersModule` já importa `FoodsModule` (reusa `findAvailableById`).
- **Banco**: nenhuma migration. `prisma/seed.ts` → `ORDER_STATUSES` ganha "Aceito". `Food.quantity` passa a ser decrementado em runtime.
- **API/Doc**: nova operação sob a tag `Pedidos`; respostas `200/401/404/409`.
- **Efeito colateral observável**: RF11/RF12/RF13 passam a exibir `Food.quantity` já líquido de reservas (comportamento correto, sem mudança de código nesses módulos). Comentário do RF15 em `orders.service.ts` (contagem de pedidos em andamento) é atualizado — "Aceito" também conta como em andamento, sem mudar a lógica.
- **Frontend**: fora desta change.
- **Fora do escopo**: RF17 (rejeição), RF18 (confirmação de recebimento), RF19/RF20 (listagem e detalhe de pedido), devolução de reserva / fluxo de cancelamento de pedido aceito, motivo de cancelamento padronizado, notificação ao beneficiário.
