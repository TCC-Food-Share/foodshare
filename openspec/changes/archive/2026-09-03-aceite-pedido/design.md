## Context

Ver `proposal.md` ("Why"). `OrdersService` (changes `solicitacao-pedido` + `limite-pedidos-em-andamento`) hoje só tem `create`. Resolve a entidade beneficiária por `prisma.beneficiaryEntity.findUnique({ where: { userId } })`; o mesmo padrão vale para estabelecimento (`FoodsService.create` faz `prisma.establishment.findUnique({ where: { userId } })` → `null` ⇒ `NotFoundException`).

`FoodsService.findAvailableById(id)` já devolve o registro cru do alimento disponível (status "Ativo", `expirationDate >= hoje`, `deleted = false`) ou `null`, e é exportado pelo `FoodsModule` (já importado pelo `OrdersModule`). `OrderStatus` é lookup seedado hoje só com "Pendente". `Order` tem `statusId`, `foodId`, `establishmentId`, `quantity Decimal`, `deleted`. `Food.quantity` é `Decimal(10,2)`.

Conflitos de estado no projeto usam `ConflictException` (409); conta do tipo errado / recurso não pertencente ao usuário usam `NotFoundException` (404) — RF14 e `FoodsService` seguem isso. Testes de `OrdersService` são unitários com `PrismaService` e `FoodsService` mockados.

## Goals / Non-Goals

**Goals:**
- `PATCH /orders/:id/accept` para o estabelecimento dono do pedido, "Pendente" → "Aceito", decrementando `Food.quantity` de forma atômica e race-safe.
- Nenhuma migration; reusar `findAvailableById` e o padrão de resolução por sessão.

**Non-Goals:**
- Rejeição (RF17), recebimento (RF18), listagem/detalhe de pedido (RF19/RF20).
- Devolver a reserva ao estoque (não há cancelamento de pedido aceito no MVP).
- Coluna de reserva separada — decisão foi decrementar `Food.quantity` direto.
- Notificar a entidade beneficiária do aceite.

## Decisions

**Reserva = decremento de `Food.quantity`, sem coluna nova.**
`Food.quantity` passa a ser o restante. RF14 já valida `quantity <= Food.quantity`, então reservas entram na conta sem tocar em `pedidos/solicitacao`. Alternativa (`Food.reservedQuantity`) preservaria a quantidade cadastrada original, mas exige migration + reescrever a validação do RF14 (spec e código) + expor "disponível = quantity − reserved" em RF11/RF13. Custo maior sem ganho no MVP (não há relatório que precise da quantidade original). Trade-off aceito: listagem/detalhe passam a mostrar o restante, e um pedido aceito é consumo definitivo (sem fluxo de estorno).

**`accept(userId, orderId)` — checagens fora da transação, transição autoritativa dentro.**
```ts
async accept(userId: number, orderId: number): Promise<OrderResponseDto> {
  const establishment = await this.prisma.establishment.findUnique({ where: { userId } });
  if (!establishment) throw new NotFoundException('Establishment not found.');

  const order = await this.prisma.order.findFirst({
    where: { id: orderId, establishmentId: establishment.id, deleted: false },
  });
  if (!order) throw new NotFoundException('Order not found.');

  const [pendente, aceito] = await Promise.all([
    this.prisma.orderStatus.findUniqueOrThrow({ where: { name: 'Pendente' } }),
    this.prisma.orderStatus.findUniqueOrThrow({ where: { name: 'Aceito' } }),
  ]);
  if (order.statusId !== pendente.id) throw new ConflictException('Order is not pending.');

  const food = await this.foodsService.findAvailableById(order.foodId);
  if (!food) throw new ConflictException('Linked food is no longer available.');

  const updated = await this.prisma.$transaction(async (tx) => {
    const moved = await tx.order.updateMany({
      where: { id: order.id, statusId: pendente.id },
      data: { statusId: aceito.id },
    });
    if (moved.count === 0) throw new ConflictException('Order is not pending.');

    const reserved = await tx.food.updateMany({
      where: { id: order.foodId, quantity: { gte: order.quantity } },
      data: { quantity: { decrement: order.quantity } },
    });
    if (reserved.count === 0) {
      throw new ConflictException('Insufficient food quantity to accept this order.');
    }

    return tx.order.findUniqueOrThrow({
      where: { id: order.id },
      include: { status: true, food: true, establishment: true, beneficiaryEntity: true },
    });
  });

  return this.toResponse(updated);
}
```
- **Transição condicional (`updateMany where statusId = Pendente`)**: dois aceites concorrentes do mesmo pedido — só um vê `count = 1` e decrementa; o outro vê `count = 0` ⇒ `ConflictException`. Sem isso, os dois passariam a checagem `order.statusId !== pendente.id` (lida antes) e decrementariam o estoque em dobro. Prisma não expõe `SELECT ... FOR UPDATE` pelo query builder; o update condicional é a trava.
- **Decremento condicional (`updateMany where quantity >= order.quantity`)**: um único `UPDATE ... WHERE` atômico. `count = 0` ⇒ estoque insuficiente (outro pedido do mesmo alimento foi aceito primeiro) ⇒ `ConflictException`; o `throw` dentro do callback do `$transaction` reverte o `moved` acima.
- **`findAvailableById` fora da transação**: a janela entre a checagem e o commit é de milissegundos; status/vencimento do alimento não mudam nesse intervalo na prática. Manter o `findFirst` com includes dentro da `tx` só adiciona ruído. A trava que importa (quantidade) está dentro.
- **Ordem das checagens**: estabelecimento (404) → pedido existe e é do estabelecimento (404) → status Pendente (409) → alimento disponível (409) → transação. `404` antes de `409`: não vaza a existência de pedido de outro estabelecimento.

**Rota `PATCH /orders/:id/accept`, sem corpo, resposta `200` com `OrderResponseDto`.**
Ação de transição de estado sobre um sub-recurso do pedido; `PATCH` alinha com `PATCH /establishments/me` (edição parcial) já no projeto. Sem corpo — o id vem do path, o ator vem da sessão, o status de destino é fixo. Reusa `OrderResponseDto` (status agora "Aceito"). `@ApiTags('Pedidos')`, textos Scalar pt-BR citando RF16.

**`toResponse` reusado; `OrdersService` resolve estabelecimento direto no `prisma`.**
Mesma dependência que o `create` já tem (`PrismaService`, `FoodsService`). Sem novo módulo/injeção.

**Seed: `ORDER_STATUSES = ['Pendente', 'Aceito']`.** Só o que RF16 exige; "Rejeitado"/"Recebido" com RF17/RF18. Nome pt-BR (valor de tela, plataforma PT-BR — mesma regra de `Category`/`FoodStatus`/`OrderStatus`).

**Comentário do RF15 em `orders.service.ts` atualizado.** A linha `// No status filter: "Pendente" is the only order status today; ...` fica imprecisa — "Aceito" passa a existir e também conta como pedido em andamento. Novo texto: o filtro continua sendo só `deleted: false` porque tanto "Pendente" quanto "Aceito" são "em andamento"; RF17/RF18 trazem status terminais que aí sim precisarão sair da contagem. Lógica do RF15 não muda.

## Risks / Trade-offs

- [`Food.quantity` deixa de ser a quantidade cadastrada e vira o restante] → aceito e documentado; listagem/detalhe passam a mostrar o restante, que é o número útil. Não há requisito que precise da quantidade original.
- [Pedido aceito não devolve estoque] → não há cancelamento de pedido aceito no MVP (fora do escopo). Se RF17/pós-MVP trouxer, revisita.
- [`findAvailableById` fora da transação: TOCTOU teórico entre checar disponível e commitar] → janela de ms, alimento não expira/é despublicado nesse intervalo na prática; risco desprezível no MVP.
- [Sem `FOR UPDATE`: a corrida real (dois aceites) é fechada pelos dois `updateMany` condicionais, não por lock de linha] → suficiente: cada `updateMany` é atômico no Postgres; o pior caso (perder a corrida) retorna `409` limpo, sem inconsistência.
- [`PATCH` sem corpo vs `POST /orders/:id/accept`] → escolhido `PATCH` por consistência com `PATCH /establishments/me`; ambos são aceitáveis. Documentado para RF17/RF18 seguirem o mesmo verbo.
