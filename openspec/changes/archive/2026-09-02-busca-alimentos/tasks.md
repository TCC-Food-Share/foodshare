## 1. Banco

- [x] 1.1 `npx prisma migrate dev --create-only --name add_unaccent_extension` no `backend/`; editar o SQL gerado para conter só `CREATE EXTENSION IF NOT EXISTS unaccent;`.
- [x] 1.2 Aplicar com `npx prisma migrate dev`; conferir `SELECT unaccent('Feijão');` no banco local.

## 2. DTO

- [x] 2.1 `ListFoodsQueryDto` ganha 4 campos opcionais:
  - `name?: string` — `@IsOptional()` `@IsString()` `@MaxLength(200)` `@Transform(({value}) => value?.trim() || undefined)`.
  - `categoryId?: number` — `@IsOptional()` `@Type(() => Number)` `@IsInt()` `@Min(1)`.
  - `city?: string` — mesmo tratamento de `name`.
  - `state?: string` — `@IsOptional()` `@Transform(({value}) => value?.toUpperCase())` `@Matches(/^[A-Z]{2}$/)`.
  - `@ApiPropertyOptional` em pt-BR em cada um, deixando claro: `name`/`city` casam trecho ignorando caixa e acento; `state` é UF exata e é normalizada pra maiúscula.

## 3. Service

- [x] 3.1 Montar o `WHERE` como lista de fragmentos `Prisma.sql`: base de disponibilidade (`f.deleted = false`, `s.name = 'Ativo'`, `f."expirationDate" >= ${startOfTodayUtc()}`) + um fragmento por filtro informado (`unaccent(f.name) ILIKE '%' || unaccent(${name}) || '%'`, `f."categoryId" = ${categoryId}`, `unaccent(a.city) ILIKE '%' || unaccent(${city}) || '%'`, `a.state = ${state}`), unidos com `Prisma.join(frags, ' AND ')`. Nenhum valor concatenado — sempre bind param.
- [x] 3.2 Fase 1 — `this.prisma.$queryRaw<{ id: number }[]>` com `SELECT f.id FROM food f JOIN establishment e ON e.id = f."establishmentId" JOIN address a ON a.id = e."addressId" JOIN food_status s ON s.id = f."statusId" WHERE <frags> ORDER BY f."publishedAt" DESC LIMIT ${pageSize} OFFSET ${(page-1)*pageSize}`.
- [x] 3.3 Fase 2 — `this.prisma.$queryRaw<{ count: bigint }[]>` com o mesmo `FROM`/`WHERE`, `SELECT count(*)`; `total = Number(rows[0].count)`.
- [x] 3.4 Fase 3 — `prisma.food.findMany({ where: { id: { in: ids } }, include: { category: true, status: true, establishment: true } })`; reordenar por um `Map<id, food>` seguindo a ordem dos ids da fase 1; `data = ordered.map(toResponse)`.
- [x] 3.5 Defaults de paginação (`page=1`, `pageSize` clamp em 50) e `startOfTodayUtc()` reaproveitados como estão. Sem `ids` → pular a fase 3, `data = []`.

## 4. Controller

- [x] 4.1 `GET /foods`: atualizar `@ApiOperation` (`summary`/`description` citando RF12 — busca por nome, categoria e localização). Manter `@ApiOkResponse`/`@ApiBadRequestResponse`/`@ApiUnauthorizedResponse`. Nenhuma mudança de assinatura (os params novos entram pelo `ListFoodsQueryDto` já injetado por `@Query()`).

## 5. Testes

- [x] 5.1 Unit: sem filtro → `$queryRaw` chamado, defaults `page 1` / `pageSize 20`, e o SQL não contém cláusula de `name`/`city`/`category`/`state` (checar os params passados).
- [x] 5.2 Unit: `pageSize` acima de 50 → `LIMIT 50` e `pageSize: 50` na resposta.
- [x] 5.3 Unit: hidratação reordena `findMany` pela ordem dos ids da fase 1.
- [x] 5.4 Unit: `total` convertido de `bigint` para `number`.
- [x] 5.5 Unit: sem ids na fase 1 → `findMany` não é chamado, `data: []`, `total: 0`.
- [x] 5.6 Verificação manual (`curl`) com servidor + Postgres locais, 2 estabelecimentos (Birigui/Araçatuba) e alimentos com nome acentuado + 1 vencido + 1 `deleted`: `?name=feijao` e `?name=FEIJAO` → só "Feijão carioca"/"Feijão preto" (acento e caixa ignorados, vencido/apagado fora); `?categoryId=6` → só "Pão francês"; `?city=birigui` → 3; `?city=aracatuba&state=SP` → 2 (unaccent na cidade); `?name=feijao&city=birigui` → 1 (AND); `?name=xxxxnope` → `data: []`, `total: 0`; `?name=feijao&pageSize=1` → 1 item, `total: 2`; `?state=sp` normaliza p/ SP; `?state=xxx` e `?categoryId=abc` → 400; sem cookie → 401.

## 6. Fechamento

- [x] 6.1 `npm run lint:check` (0 warnings), `npm test` (5 suites, 59 testes) e `npm run build` no `backend/` sem erro.
- [x] 6.2 `/openapi.json`: `GET /foods` summary "Listagem e busca de alimentos", params `page`/`pageSize`/`name`/`categoryId`/`city`/`state`, resposta 200 → `PaginatedFoodsResponseDto`.
