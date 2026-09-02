## 1. DTOs

- [x] 1.1 `ListFoodsQueryDto` em `foods/dto/`: `page` e `pageSize`, ambos `@IsOptional()`, `@Type(() => Number)`, `@IsInt()`, `@Min(1)`. Sem `@Max` em `pageSize` — o teto de 50 é clamp no service (design: cenário do spec pede "retorna no máximo 50", não erro). `@ApiPropertyOptional` com `description` em pt-BR e `example`. `page`/`pageSize` inválidos (zero, negativo, não numérico) caem no `ValidationPipe` global → 400 automático.
- [x] 1.2 `PaginatedFoodsResponseDto` em `foods/dto/`: `data: FoodResponseDto[]`, `total: number`, `page: number`, `pageSize: number`. `@ApiProperty` com `type: () => FoodResponseDto`, `isArray: true` em `data`.

## 2. Service

- [x] 2.1 Extrair o recorte de "alimento disponível" para algo reutilizável no `FoodsService` (`private availableFoodsWhere(): Prisma.FoodWhereInput`): `{ deleted: false, status: { name: 'Ativo' }, expirationDate: { gte: <meia-noite de hoje em UTC> } }`. Helper `startOfTodayUtc()` (zera horas de `new Date()` em UTC). Constante `INITIAL_STATUS` renomeada para `ACTIVE_STATUS` (mesmo valor, serve criação e listagem).
- [x] 2.2 `toResponse` reusado direto pelo novo método (mesma classe — segue `private`).
- [x] 2.3 `FoodsService.list(query: ListFoodsQueryDto): Promise<PaginatedFoodsResponseDto>`: default `page = 1`, `pageSize = 20`; `pageSize = Math.min(pageSize, 50)` (clamp, não erro). `Promise.all` de `prisma.food.findMany({ where, orderBy: { publishedAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, include: { category: true, status: true, establishment: true } })` e `prisma.food.count({ where })`. Mapear itens com `toResponse`, montar o envelope `{ data, total, page, pageSize }`.

## 3. Controller

- [x] 3.1 `GET /foods` no `FoodsController`: sem `@AllowAnonymous()` (protegido pelo guard global), `@Query() query: ListFoodsQueryDto`, delega para `foodsService.list(query)`.
- [x] 3.2 Doc Scalar: `@ApiOperation` (`summary`/`description` em pt-BR citando RF11), `@ApiOkResponse({ type: PaginatedFoodsResponseDto })`, `@ApiBadRequestResponse`, `@ApiUnauthorizedResponse`. Tag `Alimentos` mantida (classe).

## 4. Testes

- [x] 4.1 Unit (`foods.service.spec.ts`): `list` sem parâmetros retorna a primeira página (`page = 1`, `pageSize = 20`), `orderBy: { publishedAt: 'desc' }`, e `where` com `deleted: false` + `status.name = 'Ativo'` + `expirationDate.gte`.
- [x] 4.2 Unit: `list` monta `skip`/`take` corretos para `page`/`pageSize` informados.
- [x] 4.3 Unit: `pageSize` acima de 50 é limitado a 50 (verifica `take: 50` e `pageSize: 50` na resposta).
- [x] 4.4 Unit: resposta traz `total` vindo de `food.count` com o mesmo `where` da listagem.
- [x] 4.5 Unit: cada item da resposta passa pelo mesmo mapeamento do RF10 (`quantity` como `string`, `category`/`status`/`establishment` expandidos).
- [x] 4.6 Sem harness E2E no projeto (jest só roda `*.spec.ts` de unidade em `src/`). Os casos HTTP (`sem sessão → 401`, `page=0`/`pageSize=abc`/`page=-1` → 400) foram cobertos na verificação manual do 4.7 em vez de criar harness novo (fora do escopo desta change).
- [x] 4.7 Verificação manual (`curl`) com servidor + Postgres locais: sem cookie → 401; login → `GET /foods` → 200, `total 3, page 1, pageSize 20`, item no formato do `FoodResponseDto` com `quantity: "2.5"` (string); `?page=2&pageSize=2` → `page 2, pageSize 2`; `?pageSize=999` → `pageSize 50`; `?page=0` / `?pageSize=abc` / `?page=-1` → 400. Rows de borda inseridas via Prisma: alimento vencido ontem → fora; alimento que vence hoje → aparece; alimento `deleted` → fora; `total` acompanha o filtro (4). Dados de teste removidos ao final.

## 5. Fechamento

- [x] 5.1 `npm run lint:check` (0 warnings), `npm test` (5 suites, 56 testes) e `npm run build` no `backend/` sem erro.
- [x] 5.2 `GET /foods` no `/openapi.json`: `summary` "Listagem de alimentos", tag "Alimentos", params `page`/`pageSize` (number, min 1, default 1/20), respostas 200/400/401, 200 → `PaginatedFoodsResponseDto` (`data: FoodResponseDto[]`, `total`, `page`, `pageSize`).
