## 1. Banco / seed

- [x] 1.1 `prisma/seed.ts`: `ORDER_STATUSES = ['Pendente', 'Aceito', 'Rejeitado', 'Recebido']`. Rodar o seed no `backend/` para inserir "Recebido".
- [x] 1.2 Confirmar que não há migration (RF18 usa `Order.statusId` já existente).

## 2. OrdersService — `receive`

- [x] 2.1 `orders.service.ts`: constante `RECEIVED_STATUS = 'Recebido'` (ao lado das outras). `IN_PROGRESS_STATUSES` NÃO muda.
- [x] 2.2 Método `receive(userId: number, orderId: number): Promise<OrderResponseDto>`:
  - `beneficiaryEntity = prisma.beneficiaryEntity.findUnique({ where: { userId } })` → `null` ⇒ `NotFoundException('Beneficiary entity not found.')`.
  - `order = prisma.order.findFirst({ where: { id: orderId, beneficiaryEntityId: beneficiaryEntity.id, deleted: false } })` → `null` ⇒ `NotFoundException('Order not found.')`.
  - Resolver "Aceito" e "Recebido" (`orderStatus.findUniqueOrThrow`). `order.statusId !== aceito.id` ⇒ `ConflictException('Order is not accepted.')`.
  - `prisma.order.updateMany({ where: { id: order.id, statusId: aceito.id }, data: { statusId: recebido.id } })` → `count === 0` ⇒ `ConflictException('Order is not accepted.')`.
  - `updated = prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { status: true, food: true, establishment: true, beneficiaryEntity: true } })`.
  - `return this.toResponse(updated)`.
  - Sem `$transaction`, sem tocar em `Food`.

## 3. OrdersController — rota

- [x] 3.1 `orders.controller.ts`: `@Patch(':id/receive')`, `@Session()` para o `userId`, `@Param('id', ParseIntPipe)` para o `orderId`; delega para `ordersService.receive(Number(session.user.id), id)`.
- [x] 3.2 Doc Scalar: `@ApiOperation` (pt-BR, cita RF18, "encerra o pedido"), `@ApiOkResponse({ type: OrderResponseDto })`, `@ApiNotFoundResponse` (sem entidade beneficiária vinculada, ou pedido inexistente/de outra entidade), `@ApiConflictResponse` (pedido não "Aceito"), `@ApiUnauthorizedResponse`.

## 4. Testes (`orders.service.spec.ts`)

- [x] 4.1 `orderStatusByName` mock ganha "Recebido" (id 4); adicionar `receivedOrderRow`.
- [x] 4.2 Confirmação válida: pedido "Aceito" da entidade da sessão, `order.updateMany` → `{ count: 1 }` → resultado com `status.name === 'Recebido'`; `order.updateMany` chamado com `where: { id, statusId: <Aceito> }` e `data: { statusId: <Recebido> }`; `food.updateMany` e `$transaction` não chamados.
- [x] 4.3 `beneficiaryEntity.findUnique` → `null` (conta é estabelecimento) ⇒ `NotFoundException`, sem `updateMany`.
- [x] 4.4 `order.findFirst` → `null` (inexistente / excluído / de outra entidade) ⇒ `NotFoundException`, sem `updateMany`.
- [x] 4.5 Pedido com `statusId` != "Aceito" (ex: "Pendente") ⇒ `ConflictException('Order is not accepted.')`, sem `updateMany`.
- [x] 4.6 `order.updateMany` → `{ count: 0 }` (confirmação concorrente venceu a corrida) ⇒ `ConflictException('Order is not accepted.')`, sem re-leitura.
- [x] 4.7 Testes existentes de `create`, `accept` e `reject` seguem passando.

## 5. Verificação e fechamento

- [x] 5.1 Verificação contra o Postgres local (script `tsx` temporário, `OrdersService` real + `PrismaService` real): seed "Recebido"; alimento `q=10`; pedido `q=4` criado + aceito (`Food.quantity` = 6); `receive` → pedido "Recebido", `Food.quantity` segue 6; `receive` de novo → `409`; `receive` de um pedido "Pendente" → `409`; entidade com 9 pedidos "Pendente"/"Aceito" + 5 "Recebido" → `create` do 10º "em andamento" passa (recebido não conta, contagem = 9). Dados de teste limpos ao final.
- [x] 5.2 `npm run lint:check` (0 warnings), `npm test` (6 suites, 91 testes) e `npm run build` no `backend/` sem erro.
- [x] 5.3 `/openapi.json` (servidor local): `PATCH /orders/{id}/receive` sob a tag "Pedidos", respostas `200/401/404/409`, `200` → `OrderResponseDto`.
- [x] 5.4 `openspec validate recebimento-pedido --strict` sem erro.
