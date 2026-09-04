## 1. Banco / seed

- [x] 1.1 `prisma/seed.ts`: `ORDER_STATUSES = ['Pendente', 'Aceito']`. Rodar `npx prisma db seed` (ou o comando de seed do projeto) no `backend/` para inserir "Aceito".
- [x] 1.2 Confirmar que não há migration (RF16 usa `Order.statusId` e `Food.quantity` já existentes).

## 2. OrdersService — `accept`

- [x] 2.1 `orders.service.ts`: constante `ACCEPTED_STATUS = 'Aceito'` (ao lado de `INITIAL_STATUS`).
- [x] 2.2 Método `accept(userId: number, orderId: number): Promise<OrderResponseDto>`:
  - `establishment = prisma.establishment.findUnique({ where: { userId } })` → `null` ⇒ `NotFoundException('Establishment not found.')`.
  - `order = prisma.order.findFirst({ where: { id: orderId, establishmentId: establishment.id, deleted: false } })` → `null` ⇒ `NotFoundException('Order not found.')`.
  - Resolver status "Pendente" e "Aceito" (`orderStatus.findUniqueOrThrow`). `order.statusId !== pendente.id` ⇒ `ConflictException('Order is not pending.')`.
  - `food = foodsService.findAvailableById(order.foodId)` → `null` ⇒ `ConflictException('Linked food is no longer available.')`.
  - `prisma.$transaction`:
    - `tx.order.updateMany({ where: { id: order.id, statusId: pendente.id }, data: { statusId: aceito.id } })` → `count === 0` ⇒ `ConflictException('Order is not pending.')`.
    - `tx.food.updateMany({ where: { id: order.foodId, quantity: { gte: order.quantity } }, data: { quantity: { decrement: order.quantity } } })` → `count === 0` ⇒ `ConflictException('Insufficient food quantity to accept this order.')`.
    - `return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: { status: true, food: true, establishment: true, beneficiaryEntity: true } })`.
  - `return this.toResponse(updated)`.
- [x] 2.3 Atualizar o comentário da contagem do RF15 em `create`: o filtro segue só `deleted: false` porque "Pendente" e "Aceito" são ambos "em andamento"; RF17/RF18 trarão status terminais a excluir.

## 3. OrdersController — rota

- [x] 3.1 `orders.controller.ts`: `@Patch(':id/accept')`, `@Session()` para o `userId`, `@Param('id', ParseIntPipe)` para o `orderId`; delega para `ordersService.accept(Number(session.user.id), id)`.
- [x] 3.2 Doc Scalar: `@ApiOperation` (pt-BR, cita RF16), `@ApiOkResponse({ type: OrderResponseDto })`, `@ApiNotFoundResponse` (sem estabelecimento vinculado, ou pedido inexistente/de outro estabelecimento), `@ApiConflictResponse` (pedido não pendente / alimento indisponível / estoque insuficiente), `@ApiUnauthorizedResponse`.

## 4. Testes (`orders.service.spec.ts`)

- [x] 4.1 Adicionar `establishment.findUnique`, `order.findFirst`, `order.updateMany`, `food.updateMany`, `order.findUniqueOrThrow` e `$transaction` ao `prismaMock`; `orderStatus.findUniqueOrThrow` passa a resolver "Pendente" e "Aceito" por nome. `$transaction` mock executa o callback com o próprio `prismaMock`.
- [x] 4.2 Aceite válido: pedido "Pendente" do estabelecimento da sessão, `order.updateMany` → `{ count: 1 }`, `food.updateMany` → `{ count: 1 }` → resultado com `status.name === 'Aceito'`; `food.updateMany` chamado com `where.quantity.gte` = quantidade do pedido e `data.quantity.decrement` = quantidade do pedido.
- [x] 4.3 `establishment.findUnique` → `null` (conta é entidade beneficiária) ⇒ `NotFoundException`, sem transação.
- [x] 4.4 `order.findFirst` → `null` (pedido inexistente, excluído ou de outro estabelecimento) ⇒ `NotFoundException`, sem transação.
- [x] 4.5 Pedido com `statusId` != "Pendente" ⇒ `ConflictException('Order is not pending.')`, sem transação.
- [x] 4.6 `foodsService.findAvailableById` → `null` ⇒ `ConflictException('Linked food is no longer available.')`, sem transação.
- [x] 4.7 Dentro da transação, `food.updateMany` → `{ count: 0 }` ⇒ `ConflictException('Insufficient food quantity to accept this order.')`; pedido não é retornado como "Aceito".
- [x] 4.8 Dentro da transação, `order.updateMany` → `{ count: 0 }` (aceite concorrente venceu a corrida) ⇒ `ConflictException('Order is not pending.')`; `food.updateMany` não chamado.
- [x] 4.9 Testes existentes de `create` seguem passando.

## 5. Verificação e fechamento

- [x] 5.1 Verificação contra o Postgres local (script `tsx` temporário, `OrdersService` real + `PrismaService` real): seed "Aceito"; alimento `q=10` + pedido `q=4` "Pendente"; `accept` → pedido "Aceito", `Food.quantity` = 6; `accept` de novo no mesmo pedido → `409` ("not pending"); segundo pedido `q=8` "Pendente" → `accept` → `409` ("insufficient"), `Food.quantity` segue 6, pedido segue "Pendente"; pedido de alimento vencido → `accept` → `409` ("no longer available"). Dados de teste limpos ao final.
- [x] 5.2 `npm run lint:check` (0 warnings), `npm test` (6 suites, 81 testes) e `npm run build` no `backend/` sem erro.
- [x] 5.3 `/openapi.json` (servidor local): `PATCH /orders/{id}/accept` sob a tag "Pedidos", respostas `200/401/404/409`, `200` → `OrderResponseDto`.
- [x] 5.4 `openspec validate aceite-pedido --strict` sem erro.
