## 1. DTO

- [x] 1.1 `orders/dto/order-detail-response.dto.ts`: `OrderDetailResponseDto` com classes aninhadas:
  - topo: `id`, `quantity` (string), `orderDate` (Date), `status: { id, name }`.
  - `food: { id, image: string | null, name, quantity: string, quantityUnit, description, expirationDate: Date, category: { id, name }, status: { id, name } }`.
  - `establishment` e `beneficiaryEntity`: `{ id, companyName, tradeName: string | null, description, city, state }` (`OrderInstitutionDetailDto`).
  - `@ApiProperty` / `@ApiPropertyOptional` em pt-BR; `image` e `tradeName` com `nullable: true`.

## 2. OrdersService — `getById`

- [x] 2.1 `orders.service.ts`: método `getById(userId, orderId)`:
  - resolve o ator igual ao `list`: `establishment = prisma.establishment.findUnique({ where: { userId } })`; se `null`, `beneficiaryEntity = prisma.beneficiaryEntity.findUnique({ where: { userId } })`.
  - nenhum dos dois ⇒ `NotFoundException('Order not found.')`.
  - `order = prisma.order.findFirst({ where: { id: orderId, deleted: false, ...(establishment ? { establishmentId } : { beneficiaryEntityId }) }, include: { status: true, food: { include: { category: true, status: true } }, establishment: { include: { address: true } }, beneficiaryEntity: { include: { address: true } } } })`.
  - `null` ⇒ `NotFoundException('Order not found.')`.
  - `return this.toDetailResponse(order)`.
- [x] 2.2 `mapInstitution(inst)` + `toDetailResponse(order)` privados: `toDetailResponse` tipa o parâmetro com `Prisma.OrderGetPayload<{ include: <mesmo shape> }>`; monta o DTO (`quantity` e `food.quantity` via `.toString()`; `mapInstitution` extrai `city`/`state` de `.address`). `toResponse` (resumo) fica intacto.

## 3. OrdersController — rota

- [x] 3.1 `orders.controller.ts`: `@Get(':id')` `getById(@Session() session, @Param('id', ParseIntPipe) id: number)` → `ordersService.getById(Number(session.user.id), id)`.
- [x] 3.2 Doc Scalar: `@ApiOperation` (pt-BR, cita RF20, exclusivo das partes, alimento como registro histórico), `@ApiOkResponse({ type: OrderDetailResponseDto })`, `@ApiBadRequestResponse` (id em formato inválido), `@ApiNotFoundResponse` (pedido inexistente/excluído/solicitante não é parte/sem instituição), `@ApiUnauthorizedResponse`.

## 4. Testes (`orders.service.spec.ts`)

- [x] 4.1 Fixture `orderDetailRow` — payload de `findFirst` com `status`, `food` (+ `category`, `status`), `establishment` (+ `address`), `beneficiaryEntity` (+ `address`). No bloco `getById`, `prismaMock.order.findFirst.mockResolvedValue(orderDetailRow)`.
- [x] 4.2 Estabelecimento parte: `findFirst` chamado com `where` = `{ id: 50, deleted: false, establishmentId: 3 }`; resposta tem `food.category`, `food.description`, `food.quantity` string, `establishment.city`/`state`, `beneficiaryEntity.city`; `quantity` string.
- [x] 4.3 Entidade parte: `establishment.findUnique` → `null` → `where` contém `beneficiaryEntityId: 7`.
- [x] 4.4 `findFirst` → `null` ⇒ `NotFoundException`.
- [x] 4.5 Conta sem instituição: ambos `null` ⇒ `NotFoundException('Order not found.')`, sem `findFirst`.
- [x] 4.6 Resposta das instituições tem exatamente as chaves `id, companyName, tradeName, description, city, state` — sem `institutionalEmail`/`institutionalPhone`/`address`/`user`.
- [x] 4.7 Testes existentes de `create`/`accept`/`reject`/`receive`/`list` seguem passando.

## 5. Verificação e fechamento

- [x] 5.1 Verificação contra o Postgres local (script `tsx` temporário, `OrdersService` real + `PrismaService` real): 1 estabelecimento, 2 entidades (A/B), 1 alimento, 1 pedido da entidade A. `getById` como A → detalhe completo (food com categoria/descrição/vencimento, instituições com city/state, chaves só id/companyName/tradeName/description/city/state); como o estabelecimento dono → mesmo detalhe; como entidade B → `NotFoundException`; id inexistente → `NotFoundException`; conta sem instituição → `NotFoundException`; pedido excluído logicamente → `NotFoundException`; alimento vinculado vencido → detalhe ainda retornado. Dados de teste limpos ao final.
- [x] 5.2 `npm run lint:check` (0 warnings), `npm test` (6 suites, 103 testes) e `npm run build` no `backend/` sem erro.
- [x] 5.3 `/openapi.json` (servidor local): `GET /orders/{id}` sob a tag "Pedidos", respostas `200/400/401/404`, `200` → `OrderDetailResponseDto` (`id`, `quantity`, `orderDate`, `status`, `food`, `establishment`, `beneficiaryEntity`); `OrderInstitutionDetailDto` com exatamente `id/companyName/tradeName/description/city/state`. (400 para id não numérico é garantido pelo `ParseIntPipe`; no HTTP a auth do better-auth precede o pipe, então sem sessão a resposta é 401.)
- [x] 5.4 `openspec validate detalhe-pedido --strict` sem erro.
