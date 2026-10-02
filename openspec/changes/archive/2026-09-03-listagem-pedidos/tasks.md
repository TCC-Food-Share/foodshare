## 1. DTOs

- [x] 1.1 `orders/dto/list-orders-query.dto.ts`: `ListOrdersQueryDto` com `page?` e `pageSize?` (`@IsOptional() @Type(() => Number) @IsInt() @Min(1)`, mesma forma de `ListFoodsQueryDto`) e `status?` (`@IsOptional() @IsIn(ORDER_STATUS_NAMES)`). `@ApiPropertyOptional` em pt-BR.
- [x] 1.2 `orders/dto/paginated-orders-response.dto.ts`: `PaginatedOrdersResponseDto` com `data: OrderResponseDto[]`, `total`, `page`, `pageSize` (espelha `PaginatedFoodsResponseDto`).
- [x] 1.3 Constantes de status/paginação em `orders/orders.constants.ts` (`INITIAL_STATUS`/`ACCEPTED_STATUS`/`REJECTED_STATUS`/`RECEIVED_STATUS`, `ORDER_STATUS_NAMES`, `IN_PROGRESS_STATUSES`, `DEFAULT_PAGE`/`DEFAULT_PAGE_SIZE`/`MAX_PAGE_SIZE`), importadas pelo service e pelo DTO — sem ciclo. `ORDER_STATUS_NAMES` casa com o seed.

## 2. OrdersService — `list`

- [x] 2.1 `orders.service.ts`: constantes de paginação vêm de `orders.constants.ts` (mesmos valores de `FoodsService`).
- [x] 2.2 Método `list(userId, query)`:
  - `establishment = prisma.establishment.findUnique({ where: { userId } })`; se `null`, `beneficiaryEntity = prisma.beneficiaryEntity.findUnique({ where: { userId } })`.
  - Nenhum dos dois ⇒ `NotFoundException('No establishment or beneficiary entity linked to this account.')`.
  - `where = { deleted: false, ...(establishment ? { establishmentId } : { beneficiaryEntityId }), ...(query.status ? { status: { name: query.status } } : {}) }`.
  - `page = query.page ?? DEFAULT_PAGE`; `pageSize = Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)`.
  - `Promise.all([ order.findMany({ where, include, orderBy: { orderDate: 'desc' }, skip: (page-1)*pageSize, take: pageSize }), order.count({ where }) ])`.
  - Retorna `{ data: rows.map((r) => this.toResponse(r)), total, page, pageSize }`.

## 3. OrdersController — rota

- [x] 3.1 `orders.controller.ts`: `@Get()` `list(@Session() session, @Query() query: ListOrdersQueryDto)` → `ordersService.list(Number(session.user.id), query)`.
- [x] 3.2 Doc Scalar: `@ApiOperation` (pt-BR, RF19, recorte pela sessão + filtro `status` + paginação + ordenação), `@ApiOkResponse({ type: PaginatedOrdersResponseDto })`, `@ApiBadRequestResponse` (status/paginação inválidos), `@ApiNotFoundResponse` (conta sem instituição), `@ApiUnauthorizedResponse`.

## 4. Testes (`orders.service.spec.ts`)

- [x] 4.1 `prismaMock.order` ganha `findMany` (default `[orderRow]`); `count` default 1 no `beforeEach` do bloco `list`.
- [x] 4.2 Estabelecimento lista: `where` tem `establishmentId` do ator, `deleted: false`, sem `status`; `orderBy: { orderDate: 'desc' }`; resposta `{ data, total, page: 1, pageSize: 20 }`; `beneficiaryEntity.findUnique` não é chamado.
- [x] 4.3 Entidade beneficiária lista: `establishment.findUnique` → `null` → `where` tem `beneficiaryEntityId`.
- [x] 4.4 Conta sem vínculo: ambos `null` ⇒ `NotFoundException`, sem `findMany`.
- [x] 4.5 Filtro de status: `query.status = 'Aceito'` → `where.status = { name: 'Aceito' }`.
- [x] 4.6 Paginação: `query = { page: 2, pageSize: 5 }` → `skip: 5`, `take: 5`, resposta ecoa `page: 2, pageSize: 5`.
- [x] 4.7 `pageSize` acima do teto: `query.pageSize = 100` → `take: 50`, resposta `pageSize: 50`.
- [x] 4.8 `total` vem do `order.count` com o mesmo `where` do `findMany`.
- [x] 4.9 Testes existentes de `create`/`accept`/`reject`/`receive` seguem passando.

## 5. Verificação e fechamento

- [x] 5.1 Verificação contra o Postgres local (script `tsx` temporário, `OrdersService` real + `PrismaService` real): 1 estabelecimento, 2 entidades (A/B), 1 alimento; entidade A com 5 pedidos (3 Pendente / 1 Aceito / 1 Recebido, datas variadas), entidade B com 2 Pendente. `list` como A → só os 5 de A; `list` como estabelecimento → todos os 7 (dono do alimento); `?status=Pendente` (A) → 3; `pageSize=2` (A) → 2 itens + `total` 5; ordenação `orderDate` desc conferida; conta sem instituição → `NotFoundException`. Dados de teste limpos ao final.
- [x] 5.2 `npm run lint:check` (0 warnings), `npm test` (6 suites, 98 testes) e `npm run build` no `backend/` sem erro.
- [x] 5.3 `/openapi.json` (servidor local): `GET /orders` sob a tag "Pedidos", query params `page`/`pageSize`/`status` (este com `enum` dos 4 status válidos), respostas `200/400/401/404`, `200` → `PaginatedOrdersResponseDto`. (400 para `status` inválido é garantido pelo `@IsIn` no DTO; no HTTP a auth do better-auth precede o `ValidationPipe`, então sem sessão a resposta é 401.)
- [x] 5.4 `openspec validate listagem-pedidos --strict` sem erro.
