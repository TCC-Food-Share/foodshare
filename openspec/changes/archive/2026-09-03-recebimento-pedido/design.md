## Context

Ver `proposal.md` ("Why"). `OrdersService` tem `create` (RF14/RF15), `accept` (RF16) e `reject` (RF17). O `reject` estabeleceu o padrão de transição de status **sem transação** (escrita única):
- resolve o ator pela sessão (`findUnique({ where: { userId } })`) → `null` ⇒ `NotFoundException`;
- `prisma.order.findFirst({ where: { id, <vínculo>, deleted: false } })` → `null` ⇒ `NotFoundException`;
- checa `order.statusId` contra o status esperado (`ConflictException` se não bate);
- `updateMany({ where: { id, statusId: <esperado> }, data: { statusId: <novo> } })` — `count === 0` fecha corridas concorrentes;
- re-lê com includes e devolve `toResponse`.

Diferenças do `receive` em relação ao `reject`: o ator é a **entidade beneficiária** (não o estabelecimento), o vínculo é `beneficiaryEntityId`, e o status de partida é **"Aceito"** (não "Pendente").

`OrderStatus` está seedado com "Pendente", "Aceito", "Rejeitado". A contagem do RF15 em `create` já filtra `status: { name: { in: IN_PROGRESS_STATUSES } }` com `IN_PROGRESS_STATUSES = ['Pendente', 'Aceito']` — uma whitelist introduzida no RF17.

O aceite (RF16) já decrementa `Food.quantity` pela quantidade do pedido. RF18 não mexe em estoque.

## Goals / Non-Goals

**Goals:**
- `PATCH /orders/:id/receive` para a entidade beneficiária dona do pedido, "Aceito" → "Recebido", encerrando o pedido, sem tocar no estoque.
- Reaproveitar o padrão do `reject` (mesma forma de rota, mesmas checagens, mesma trava condicional, sem transação).

**Non-Goals:**
- Qualquer mudança no `create`/RF15 — a whitelist `('Pendente','Aceito')` já exclui "Recebido".
- Efeito em `Food.quantity` — a reserva já é definitiva desde o aceite.
- Reabrir / desfazer um pedido "Recebido"; avaliação; notificação ao estabelecimento.
- RF19/RF20.

## Decisions

**`receive(userId, orderId)` — mesmo esqueleto do `reject`, ator = entidade beneficiária, status de partida = "Aceito".**
```ts
async receive(userId: number, orderId: number): Promise<OrderResponseDto> {
  const beneficiaryEntity = await this.prisma.beneficiaryEntity.findUnique({ where: { userId } });
  if (!beneficiaryEntity) throw new NotFoundException('Beneficiary entity not found.');

  const order = await this.prisma.order.findFirst({
    where: { id: orderId, beneficiaryEntityId: beneficiaryEntity.id, deleted: false },
  });
  if (!order) throw new NotFoundException('Order not found.');

  const [accepted, received] = await Promise.all([
    this.prisma.orderStatus.findUniqueOrThrow({ where: { name: ACCEPTED_STATUS } }),
    this.prisma.orderStatus.findUniqueOrThrow({ where: { name: RECEIVED_STATUS } }),
  ]);
  if (order.statusId !== accepted.id) throw new ConflictException('Order is not accepted.');

  const moved = await this.prisma.order.updateMany({
    where: { id: order.id, statusId: accepted.id },
    data: { statusId: received.id },
  });
  if (moved.count === 0) throw new ConflictException('Order is not accepted.');

  const updated = await this.prisma.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { status: true, food: true, establishment: true, beneficiaryEntity: true },
  });
  return this.toResponse(updated);
}
```
- **Sem `$transaction`**: escrita única (`updateMany` de status). Nada de estoque para coordenar.
- **`updateMany` condicional (`WHERE statusId = Aceito`)**: fecha a corrida de duas confirmações concorrentes do mesmo pedido — só a primeira vê `count = 1`; a segunda vê `count = 0` ⇒ `ConflictException('Order is not accepted.')`. Mesma mensagem/motivo do check pré-update.
- **Ordem das checagens**: entidade beneficiária (404) → pedido existe e é da entidade (404) → status "Aceito" (409) → update. `404` antes de `409` não vaza pedido de outra entidade.
- **Constante `RECEIVED_STATUS = 'Recebido'`** ao lado das outras. `IN_PROGRESS_STATUSES` **não muda** — "Recebido" fica de fora por não estar na whitelist.

**Rota `PATCH /orders/:id/receive`, sem corpo, `200` + `OrderResponseDto`.**
Paridade com `PATCH /orders/:id/accept` e `/reject` (RF16/RF17). É a única rota de pedido do lado da entidade beneficiária além de `POST /orders`. `@ApiTags('Pedidos')`, textos Scalar pt-BR citando RF18. Respostas: `200` / `401` / `404` (sem entidade, ou pedido não encontrado/de outra) / `409` (pedido não "Aceito").

**RF15: só o texto do requisito muda, não o código.**
`IN_PROGRESS_STATUSES = ['Pendente', 'Aceito']` já é whitelist — "Recebido" nunca contou. O delta de `pedidos/solicitacao` atualiza a frase "'Rejeitado' é terminal" para "'Rejeitado' e 'Recebido' são terminais" e adiciona o cenário "Pedidos recebidos não contam para o limite", simétrico ao de rejeitados do RF17.

**Seed: `ORDER_STATUSES = ['Pendente', 'Aceito', 'Rejeitado', 'Recebido']`.**
Fecha o conjunto de status de pedido do MVP. Nome pt-BR (valor de tela).

## Risks / Trade-offs

- [Mensagem `'Order is not accepted.'` usada no check pré-update e no `count === 0`] → intencional, mesmo motivo do `reject`: os dois casos são indistinguíveis e sem valor para o cliente diferenciar.
- [Sem transação no `receive`] → correto: escrita única, sem efeito colateral em `Food`.
- [Confirmação de recebimento não tem prova / anexo] → fora do escopo do MVP; é uma confirmação declaratória da entidade, suficiente para encerrar o fluxo.
- [Pedido "Recebido" é irreversível] → esperado; não há reabertura de pedido no MVP (mesma linha do "sem cancelamento de pedido aceito" do RF16).
- [Estado final de `Order`: a máquina de status agora tem 4 estados espalhados por 4 changes, sem uma flag `terminal` no schema] → aceito no MVP (lista de nomes em `IN_PROGRESS_STATUSES`); reconsiderar `OrderStatus.terminal` se a máquina crescer pós-MVP.
