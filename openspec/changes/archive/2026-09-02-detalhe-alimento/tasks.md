## 1. Service

- [x] 1.1 `FoodsService`: extrair `private availableFoodWhereInput(id?: number): Prisma.FoodWhereInput` — `{ deleted: false, status: { name: ACTIVE_STATUS }, expirationDate: { gte: startOfTodayUtc() } }`, mais `id` quando informado.
- [x] 1.2 `FoodsService.getById(id: number): Promise<FoodResponseDto>` — `prisma.food.findFirst({ where: this.availableFoodWhereInput(id), include: { category: true, status: true, establishment: true } })`; nulo → `throw new NotFoundException('Food not found.')`; senão `this.toResponse(food)`.

## 2. Controller

- [x] 2.1 `GET /foods/:id` no `FoodsController` — `@Param('id', ParseIntPipe) id: number`, sem `@AllowAnonymous()`, delega para `foodsService.getById(id)`. Declarar a rota depois do `POST` e do `GET` sem parâmetro.
- [x] 2.2 Doc Scalar: `@ApiOperation` (`summary`/`description` em pt-BR citando RF13 — dados completos de um alimento disponível), `@ApiOkResponse({ type: FoodResponseDto })`, `@ApiNotFoundResponse` (alimento inexistente ou indisponível), `@ApiBadRequestResponse` (id inválido), `@ApiUnauthorizedResponse`. Tag `Alimentos` mantida.

## 3. Testes

- [x] 3.1 Unit (`foods.service.spec.ts`): `getById` com id de alimento disponível → chama `findFirst` com `where` contendo `id`, `deleted: false`, `status: { name: 'Ativo' }`, `expirationDate: { gte: <Date> }`; retorna `toResponse` (quantidade como `string`, `category`/`status`/`establishment` expandidos).
- [x] 3.2 Unit: `findFirst` devolve `null` → `getById` lança `NotFoundException`.
- [x] 3.3 E2E/controller — sem harness no projeto; casos HTTP (`401` sem sessão, `400` id não numérico, `404` id inexistente/indisponível) cobertos na verificação manual do 3.4.
- [x] 3.4 Verificação manual (`curl`) com servidor + Postgres locais: alimento disponível → 200 com `FoodResponseDto` completo (`quantity` string, `category`/`status`/`establishment` expandidos); alimento de outro estabelecimento → 200; vencido → 404; `deleted` → 404; id inexistente → 404; `GET /foods/abc` → 400; sem cookie → 401.

## 4. Fechamento

- [x] 4.1 `npm run lint:check` (0 warnings), `npm test` (5 suites, 61 testes) e `npm run build` no `backend/` sem erro.
- [x] 4.2 `/openapi.json`: `GET /foods/{id}` sob tag "Alimentos", param `id` (path, integer, required), respostas 200/400/401/404, 200 → `FoodResponseDto`.
