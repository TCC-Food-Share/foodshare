## 1. Banco / seed

- [x] 1.1 `prisma/seed.ts`: `ORDER_STATUSES = ['Pendente', 'Aceito', 'Rejeitado']`. Rodar o seed no `backend/` para inserir "Rejeitado".
- [x] 1.2 Confirmar que não há migration (RF17 usa `Order.statusId` já existente).

## 2. OrdersService — `reject`

- [x] 2.1 `orders.service.ts`: constante `REJECTED_STATUS = 'Rejeitado'` (ao lado de `INITIAL_STATUS` / `ACCEPTED_STATUS`).
- [x] 2.2 Método `reject(userId: number, orderId: number): Promise<OrderResponseDto>`:
  - `establishment = prisma.establishment.findUnique({ where: { userId } })` → `null` ⇒ `NotFoundException('Establishment not found.')`.
  - `order = prisma.order.findFirst({ where: { id: orderId, establishmentId: establishment.id, deleted: false } })` → `null` ⇒ `NotFoundException('Order not found.')`.
  - Resolver "Pendente" e "Rejeitado" (`orderStatus.findUniqueOrThrow`). `order.statusId !== pendente.id` ⇒ `ConflictException('Order is not pending.')`.
  - `prisma.order.updateMany({ where: { id: order.id, statusId: pendente.id }, data: { statusId: rejeitado.id } })` → `count === 0` ⇒ `ConflictException('Order is not pending.')`.
  - `updated = prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { status: true, food: true, establishment: true, beneficiaryEntity: true } })`.
  - `return this.toResponse(updated)`.
  - Sem `$transaction` (escrita única).

## 3. OrdersService — RF15: filtro de status na contagem

- [x] 3.1 `orders.service.ts`: constante `IN_PROGRESS_STATUSES = [INITIAL_STATUS, ACCEPTED_STATUS]`.
- [x] 3.2 Em `create`, a contagem de pedidos em andamento passa a incluir `status: { name: { in: IN_PROGRESS_STATUSES } }` no `where` (além de `beneficiaryEntityId` e `deleted: false`).
- [x] 3.3 Atualizar o comentário da contagem: "Rejeitado" é terminal e fica de fora; whitelist de status em andamento para RF18 ("Recebido") já entrar excluído.

## 4. OrdersController — rota

- [x] 4.1 `orders.controller.ts`: `@Patch(':id/reject')`, `@Session()` para o `userId`, `@Param('id', ParseIntPipe)` para o `orderId`; delega para `ordersService.reject(Number(session.user.id), id)`.
- [x] 4.2 Doc Scalar: `@ApiOperation` (pt-BR, cita RF17), `@ApiOkResponse({ type: OrderResponseDto })`, `@ApiNotFoundResponse` (sem estabelecimento vinculado, ou pedido inexistente/de outro estabelecimento), `@ApiConflictResponse` (pedido não "Pendente"), `@ApiUnauthorizedResponse`.

## 5. Testes (`orders.service.spec.ts`)

- [x] 5.1 `orderStatus.findUniqueOrThrow` mock passa a resolver "Pendente", "Aceito" e "Rejeitado" por nome.
- [x] 5.2 Rejeição válida: pedido "Pendente" do estabelecimento da sessão, `order.updateMany` → `{ count: 1 }` → resultado com `status.name === 'Rejeitado'`; `order.updateMany` chamado com `where: { id, statusId: <Pendente> }` e `data: { statusId: <Rejeitado> }`.
- [x] 5.3 `establishment.findUnique` → `null` ⇒ `NotFoundException`, sem `updateMany`.
- [x] 5.4 `order.findFirst` → `null` (inexistente / excluído / de outro estabelecimento) ⇒ `NotFoundException`, sem `updateMany`.
- [x] 5.5 Pedido com `statusId` != "Pendente" ⇒ `ConflictException('Order is not pending.')`, sem `updateMany`.
- [x] 5.6 `order.updateMany` → `{ count: 0 }` (corrida perdida p/ aceite ou outra rejeição) ⇒ `ConflictException('Order is not pending.')`.
- [x] 5.7 `reject` não chama `food.updateMany` nem `$transaction`.
- [x] 5.8 RF15: `create` conta pedidos em andamento com `where.status.name.in = ['Pendente','Aceito']` (ajustar a asserção existente do teste "counts orders in progress scoped to the session entity and excluding soft-deleted").
- [x] 5.9 Testes existentes de `create` e `accept` seguem passando.

## 6. Verificação e fechamento

- [x] 6.1 Verificação contra o Postgres local (script `tsx` temporário, `OrdersService` real + `PrismaService` real): seed "Rejeitado"; alimento `q=10` + pedido `q=4` "Pendente"; `reject` → pedido "Rejeitado", `Food.quantity` segue 10; `reject` de novo → `409`; `accept` do mesmo pedido rejeitado → `409`; 9 pedidos em andamento ("Pendente"/"Aceito") + 4 "Rejeitado" para a mesma entidade → `create` do 10º "em andamento" passa (rejeitado não conta, contagem = 9). Dados de teste limpos ao final.
- [x] 6.2 `npm run lint:check` (0 warnings), `npm test` (6 suites, 86 testes) e `npm run build` no `backend/` sem erro.
- [x] 6.3 `/openapi.json` (servidor local): `PATCH /orders/{id}/reject` sob a tag "Pedidos", respostas `200/401/404/409`, `200` → `OrderResponseDto`.
- [x] 6.4 `openspec validate rejeicao-pedido --strict` sem erro.
