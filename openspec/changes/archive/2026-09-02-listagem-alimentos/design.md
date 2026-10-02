## Context

Ver `proposal.md` ("Why"). O módulo `foods/` já existe (RF10) com `FoodsController`, `FoodsService`, `CreateFoodDto` e `FoodResponseDto`. O schema `Food` já tem `statusId` (lookup `FoodStatus`, seedado só com "Ativo"), `deleted` (exclusão lógica) e `expirationDate` (`DateTime`, mas semanticamente uma data). Guard de autenticação é global (`@thallesp/nestjs-better-auth`); rota fica protegida por padrão, `@AllowAnonymous()` é opt-out. `ValidationPipe` global roda com `whitelist`, `forbidNonWhitelisted` e `transform: true`, sem `enableImplicitConversion`.

## Goals / Non-Goals

**Goals:**
- `GET /foods` autenticado, paginado, retornando só alimentos disponíveis, reaproveitando `FoodResponseDto`.
- Regra de "disponível" num único lugar reutilizável pelos próximos RFs (RF12 busca, RF14 pedido partem do mesmo conjunto).

**Non-Goals:**
- Filtro/busca por nome, categoria ou localização (RF12) — esta change entrega lista fixa, sem critério além da paginação.
- Cursor pagination / total exato aproximado — offset simples basta no volume do MVP.
- Endpoint separado de "meus alimentos" para o estabelecimento — RF11 fala em listagem única para usuário autenticado.

## Decisions

**`GET /foods` no `FoodsController` existente, com `FoodsService.list(query)`.**
Mesmo módulo do RF10 — é o mesmo recurso (`/foods`), só o verbo de leitura. Sem controller novo.

**Filtro de disponibilidade como `where` reutilizável no service (ex: `availableFoodsWhere()` ou constante `Prisma.FoodWhereInput`).**
`{ deleted: false, status: { name: 'Ativo' }, expirationDate: { gte: <início do dia de hoje> } }`. RF12 e RF14 vão precisar exatamente do mesmo recorte; extrair agora evita divergência depois. Alternativa (repetir o objeto em cada método) descartada — três cópias da regra de negócio.

**"Não vencido" comparado por início do dia atual, não por `now()` instantâneo.**
`expirationDate` é gravado como data pura (ex: `2026-12-31T00:00:00.000Z`). Comparar com `new Date()` cru esconderia, já às 00:01, todo alimento que vence "hoje" — o cenário do spec ("vence no dia atual ainda aparece") exige `gte` contra a meia-noite de hoje. Fuso: usar a meia-noite no mesmo referencial em que as datas são gravadas (UTC, como o resto do sistema) — sem tratamento de timezone do cliente nesta fase.

**`ListFoodsQueryDto` com `page` / `pageSize`, `@Type(() => Number)` + `@IsInt()` + `@Min(1)`, `@Max(50)` no `pageSize`, ambos `@IsOptional()` com default no service.**
`transform: true` sem `enableImplicitConversion` não converte query string para número sozinho — `@Type` é obrigatório. `page`/`pageSize` inválidos (zero, negativo, texto) caem no `ValidationPipe` → 400 automático, cobrindo o cenário "parâmetro inválido" sem código extra. `pageSize > 50`: clamp no service (`Math.min(pageSize, 50)`) em vez de rejeitar — cenário do spec pede "retorna no máximo 50", não erro.

**Paginação: `skip: (page - 1) * pageSize`, `take: pageSize`, e `prisma.food.count()` com o mesmo `where` para o `total`.**
Duas queries (página + count) numa `$transaction` ou `Promise.all`. Offset é O(n) no pior caso mas o volume do MVP não justifica cursor. `orderBy: { publishedAt: 'desc' }`.

**Resposta: `{ data: FoodResponseDto[], total, page, pageSize }`.**
`data` reusa o `toResponse` do RF10 (hoje `private` — tornar acessível ao novo método, mesma classe). Envelope de paginação num DTO próprio (`PaginatedFoodsResponseDto`) para o Scalar documentar `total`/`page`/`pageSize`. `total` conta só alimentos disponíveis (mesmo `where`), coerente com o que a lista mostra.

## Risks / Trade-offs

- [Offset pagination fica lento se a tabela `food` crescer muito] → aceito no MVP (cidade pequena, volume baixo); trocar por cursor é change isolada se virar problema.
- [`total` recalculado a cada request] → aceito; `count` com índice em `status`/`deleted` é barato na escala esperada. Índice dedicado não entra agora (sem evidência de necessidade).
- [Comparação de vencimento em UTC pode adiantar/atrasar o corte em até algumas horas para o fuso BR] → aceito nesta fase; tratamento de timezone não é RF do MVP e afeta só alimentos exatamente na virada do dia de vencimento.
