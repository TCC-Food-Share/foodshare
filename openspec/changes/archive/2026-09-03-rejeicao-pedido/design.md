## Context

Ver `proposal.md` ("Why"). `OrdersService` tem hoje `create` (RF14/RF15) e `accept` (RF16). `accept` já estabeleceu o padrão para transição de status de pedido pelo estabelecimento:
- resolve o estabelecimento por `prisma.establishment.findUnique({ where: { userId } })` → `null` ⇒ `NotFoundException`;
- `prisma.order.findFirst({ where: { id, establishmentId, deleted: false } })` → `null` ⇒ `NotFoundException` (cobre pedido inexistente / de outro estabelecimento / excluído);
- checa `order.statusId` contra "Pendente" (`ConflictException` se não for);
- transição autoritativa via `updateMany({ where: { id, statusId: pendente.id }, data: {...} })` — `count === 0` fecha corridas concorrentes;
- `PATCH /orders/:id/accept`, sem corpo, `200` + `OrderResponseDto`.

`OrderStatus` está seedado com "Pendente" e "Aceito". A contagem do RF15 em `create` hoje é `order.count({ where: { beneficiaryEntityId, deleted: false } })` — sem filtro de status (correto enquanto todo status existente é "em andamento").

## Goals / Non-Goals

**Goals:**
- `PATCH /orders/:id/reject` para o estabelecimento dono do pedido, "Pendente" → "Rejeitado", sem tocar no estoque.
- Excluir "Rejeitado" (e status terminais futuros) da contagem de pedidos em andamento do RF15.
- Reaproveitar o padrão do `accept` — mesma forma de rota, mesmas checagens, mesma trava condicional.

**Non-Goals:**
- Transação / lógica de estoque no `reject` — não há reserva a mexer.
- Rejeitar pedido "Aceito" ou estornar reserva (fora do escopo — sem cancelamento de pedido aceito no MVP).
- Motivo de rejeição (`Order.cancellationReasonId` fica `null`).
- RF18/RF19/RF20; notificação à entidade.

## Decisions

**`reject(userId, orderId)` — mesmo esqueleto do `accept`, sem transação.**
```ts
async reject(userId: number, orderId: number): Promise<OrderResponseDto> {
  const establishment = await this.prisma.establishment.findUnique({ where: { userId } });
  if (!establishment) throw new NotFoundException('Establishment not found.');

  const order = await this.prisma.order.findFirst({
    where: { id: orderId, establishmentId: establishment.id, deleted: false },
  });
  if (!order) throw new NotFoundException('Order not found.');

  const [pending, rejected] = await Promise.all([
    this.prisma.orderStatus.findUniqueOrThrow({ where: { name: INITIAL_STATUS } }),
    this.prisma.orderStatus.findUniqueOrThrow({ where: { name: REJECTED_STATUS } }),
  ]);
  if (order.statusId !== pending.id) throw new ConflictException('Order is not pending.');

  const moved = await this.prisma.order.updateMany({
    where: { id: order.id, statusId: pending.id },
    data: { statusId: rejected.id },
  });
  if (moved.count === 0) throw new ConflictException('Order is not pending.');

  const updated = await this.prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { status: true, food: true, establishment: true, beneficiaryEntity: true },
  });
  return this.toResponse(updated);
}
```
- **Sem `$transaction`**: a única escrita é o `updateMany` de status, atômico por si só. O `accept` precisa de transação porque coordena dois `updateMany` (status + estoque); aqui não há o segundo.
- **`updateMany` condicional (`WHERE statusId = Pendente`)**: fecha a corrida rejeição-vs-aceite (e rejeição-vs-rejeição) do mesmo pedido — só a primeira vê `count = 1`; a segunda vê `count = 0` ⇒ `ConflictException('Order is not pending.')`. Mesma mensagem/motivo do check pré-update, porque para o cliente o efeito é o mesmo ("esse pedido não está mais pendente").
- **Ordem das checagens**: estabelecimento (404) → pedido existe e é do estabelecimento (404) → status Pendente (409) → update. `404` antes de `409` não vaza pedido de outro estabelecimento.
- **Constante `REJECTED_STATUS = 'Rejeitado'`** ao lado de `INITIAL_STATUS` / `ACCEPTED_STATUS`.

**Rota `PATCH /orders/:id/reject`, sem corpo, `200` + `OrderResponseDto`.**
Paridade total com `PATCH /orders/:id/accept` (RF16). `@ApiTags('Pedidos')`, textos Scalar pt-BR citando RF17. Respostas: `200` / `401` / `404` (sem estabelecimento, ou pedido não encontrado/de outro) / `409` (pedido não "Pendente").

**RF15: contagem de pedidos em andamento ganha filtro de status.**
`orders.service.ts`: constante `IN_PROGRESS_STATUSES = [INITIAL_STATUS, ACCEPTED_STATUS]`. Em `create`, a contagem passa a:
```ts
const ordersInProgress = await this.prisma.order.count({
  where: {
    beneficiaryEntityId: beneficiaryEntity.id,
    deleted: false,
    status: { name: { in: IN_PROGRESS_STATUSES } },
  },
});
```
Whitelist (`in`), não blacklist (`notIn ['Rejeitado']`): quando RF18 trouxer "Recebido" (também terminal), ele já fica de fora sem nova mudança aqui. O comentário da linha é atualizado. Isso é o único ponto de `create` que muda; o resto do RF14/RF15 fica intacto.

**Seed: `ORDER_STATUSES = ['Pendente', 'Aceito', 'Rejeitado']`.**
Nome pt-BR (valor de tela, plataforma PT-BR — mesma regra de `Category`/`FoodStatus`).

## Risks / Trade-offs

- [Mensagem `'Order is not pending.'` usada tanto no check pré-update quanto no `count === 0` pós-update] → intencional: os dois casos são indistinguíveis e sem valor para o cliente diferenciar ("não dá para rejeitar, o pedido não está pendente"). Evita vazar timing de corrida.
- [Sem transação no `reject`] → correto: escrita única. Se um RF futuro adicionar efeito colateral à rejeição (ex: log, notificação transacional), aí revisita.
- [Filtro de status na contagem do RF15 depende do seed ter "Rejeitado"] → o seed é parte desta change (task 1); `findUniqueOrThrow` no `reject` também falha alto se faltar. Sem "Rejeitado" no banco, nenhum pedido fica "Rejeitado", então o filtro `in ['Pendente','Aceito']` continua correto de qualquer forma.
- [`IN_PROGRESS_STATUSES` como lista literal em vez de flag `OrderStatus.terminal` no schema] → flag no schema seria mais "correto" mas exige migration e não paga no MVP (3 status, lista de 2 nomes). Documentado para reconsiderar se a máquina de estados crescer.
