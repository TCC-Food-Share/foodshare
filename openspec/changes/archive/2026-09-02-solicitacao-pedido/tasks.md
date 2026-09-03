## 1. Banco

- [x] 1.1 Conferir que a tabela `order` está vazia (`SELECT count(*) FROM "order"`).
- [x] 1.2 `schema.prisma`: `Order.quantity` de `Int` para `Decimal @db.Decimal(10, 2)`.
- [x] 1.3 `npx prisma migrate dev --name order_quantity_decimal` no `backend/`; conferir o SQL gerado (`ALTER COLUMN ... TYPE numeric(10,2)`).
- [x] 1.4 `prisma/seed.ts`: adicionar `ORDER_STATUSES = ['Pendente']` e o loop `orderStatus.upsert` (mesmo padrão de `FOOD_STATUSES`).

## 2. FoodsService — expor "alimento disponível por id"

- [x] 2.1 `FoodsService`: novo método público `findAvailableById(id: number)` — o `findFirst({ where: this.availableFoodWhereInput(id), include: { category: true, status: true, establishment: true } })` que hoje está dentro do `getById`; devolve o registro ou `null`.
- [x] 2.2 `getById` passa a ser `findAvailableById(id)` + `if (!food) throw new NotFoundException('Food not found.')` + `this.toResponse(food)`.
- [x] 2.3 `FoodsModule`: `exports: [FoodsService]`.
- [x] 2.4 Testes existentes de `getById` continuam passando; adicionar 1 unit para `findAvailableById` retornando `null` quando não há match.

## 3. Módulo `orders/`

- [x] 3.1 `CreateOrderDto` em `orders/dto/`: `foodId` (`@IsInt` `@IsPositive`), `quantity` (`@IsNumber({ maxDecimalPlaces: 2 })` `@IsPositive`). `@ApiProperty` em pt-BR.
- [x] 3.2 `OrderResponseDto` em `orders/dto/`: `id`, `quantity` (string), `orderDate` (Date), `status { id, name }`, `food { id, name, quantityUnit }`, `establishment { id, companyName }`, `beneficiaryEntity { id, companyName }`.
- [x] 3.3 `OrdersService.create(userId, dto)`:
  - `beneficiaryEntity.findUnique({ where: { userId } })` → `null` ⇒ `NotFoundException('Beneficiary entity not found.')`.
  - `foodsService.findAvailableById(dto.foodId)` → `null` ⇒ `NotFoundException('Food not found.')`.
  - `new Prisma.Decimal(dto.quantity).greaterThan(food.quantity)` ⇒ `BadRequestException('Requested quantity exceeds the available amount.')`.
  - `orderStatus.findUniqueOrThrow({ where: { name: 'Pendente' } })`.
  - `order.create({ data: { quantity: dto.quantity, foodId, statusId, establishmentId: food.establishmentId, beneficiaryEntityId: entity.id }, include: { status: true, food: true, establishment: true, beneficiaryEntity: true } })`.
  - `toResponse(order)` com `quantity` convertido para `string`.
- [x] 3.4 `OrdersController`: `POST /orders`, sem `@AllowAnonymous()`, `@Session()` para o `userId`, `@Body() CreateOrderDto`, delega para `ordersService.create(Number(session.user.id), dto)`. `@ApiTags('Pedidos')`.
- [x] 3.5 Doc Scalar: `@ApiOperation` (pt-BR, cita RF14), `@ApiCreatedResponse({ type: OrderResponseDto })`, `@ApiBadRequestResponse` (dados inválidos / quantidade acima do disponível), `@ApiNotFoundResponse` (entidade não vinculada ou alimento indisponível), `@ApiUnauthorizedResponse`.
- [x] 3.6 `OrdersModule` (controller + service, importa `FoodsModule`); `AppModule` importa `OrdersModule`.

## 4. Testes

- [x] 4.1 Unit (`orders.service.spec.ts`): pedido válido → cria com `statusId` de "Pendente", `establishmentId` vindo do alimento, `beneficiaryEntityId` da sessão; resposta com `quantity` string.
- [x] 4.2 Unit: `beneficiaryEntity` não encontrada (userId de estabelecimento) → `NotFoundException`, sem `order.create`.
- [x] 4.3 Unit: `foodsService.findAvailableById` devolve `null` → `NotFoundException`, sem `order.create`.
- [x] 4.4 Unit: `quantity` > `food.quantity` → `BadRequestException`, sem `order.create`.
- [x] 4.5 Unit: `quantity` == `food.quantity` → cria normal.
- [x] 4.6 Unit: `establishmentId` do pedido sai sempre do alimento (não de input do cliente); no HTTP, campo de vínculo extra no corpo → 400 pelo `forbidNonWhitelisted` (conferido na verificação manual 4.7).
- [x] 4.7 Verificação manual (`curl`) com servidor + Postgres locais: pedido `q=4` de alimento `q=10` → 201, status "Pendente", `establishment`/`beneficiaryEntity` vindos da sessão/alimento; lote inteiro `q=10` → 201; `q=11` → 400 ("exceeds the available amount"); `q=0`, `q<0`, `q=1.234` (3 casas) → 400; `foodId` inexistente → 404; estabelecimento logado → 404; sem sessão → 401; corpo com `beneficiaryEntityId`/`establishmentId` → 400 (`forbidNonWhitelisted`).

## 5. Fechamento

- [x] 5.1 `npm run lint:check` (0 warnings), `npm test` (6 suites, 69 testes) e `npm run build` no `backend/` sem erro.
- [x] 5.2 `/openapi.json`: `POST /orders` sob tag "Pedidos", body → `CreateOrderDto`, respostas 201/400/401/404, 201 → `OrderResponseDto`.
