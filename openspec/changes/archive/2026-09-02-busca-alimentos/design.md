## Context

Ver `proposal.md` ("Why"). `FoodsService.list()` hoje é um `findMany` + `count` Prisma limpos, com `where` de disponibilidade em `availableFoodsWhere()` e `include` de `category`/`status`/`establishment`. O endereço fica em `Establishment → Address` (`city VarChar(200)`, `state VarChar(2)`). `Category`/`FoodStatus` são lookups fixos seedados. `ValidationPipe` global: `whitelist`, `forbidNonWhitelisted`, `transform: true`, sem `enableImplicitConversion`. Prisma 7.9.1, generator `prisma-client`.

## Goals / Non-Goals

**Goals:**
- Busca por `name`/`categoryId`/`city`/`state` sobre a listagem, sem acento e sem caixa em `name` e `city`, tudo dentro do recorte de disponibilidade da RF11.
- Um único caminho de código para o `GET /foods` (com ou sem filtro).

**Non-Goals:**
- Índice para acelerar o `ILIKE '%...%'` (`pg_trgm`) — volume do MVP não justifica; seq scan cabe no RNF04.
- Coluna normalizada persistida / full-text / ranking de relevância.
- Validar existência de `categoryId` — filtro inexistente só devolve lista vazia.

## Decisions

**Extensão `unaccent` via migration SQL manual, não via `postgresqlExtensions`.**
A preview `postgresqlExtensions` foi descontinuada (Prisma changelog 2025-09-10); o caminho suportado hoje é `prisma migrate dev --create-only` e escrever `CREATE EXTENSION IF NOT EXISTS unaccent;` no arquivo de migration gerado, depois `prisma migrate dev` para aplicar. Sem alteração de tabela nessa migration. Não declarar `extensions = [...]` no `datasource` (só geraria drift sem a preview).

**`FoodsService.list()` reescrito para `$queryRaw` em duas fases.**
`unaccent()` não é expressável no query builder do Prisma. Em vez de bifurcar (Prisma quando sem `name`, raw quando com `name`), unifica-se tudo em raw:
1. `$queryRaw<{ id: number }[]>` com join `food → establishment → address → food_status`, `WHERE` de disponibilidade + filtros, `ORDER BY f."publishedAt" DESC`, `LIMIT`/`OFFSET`. Devolve só os ids da página.
2. `$queryRaw<{ count: bigint }[]>` com o mesmo `WHERE` (sem `ORDER BY`/paginação) para o `total`. `count(*)` volta como `bigint` no driver — converter com `Number(...)`.
3. `prisma.food.findMany({ where: { id: { in: ids } }, include: { category, status, establishment } })` para hidratar, e reordenar em memória pela ordem dos ids da fase 1 (o `in` não preserva ordem).

Mantém o `toResponse` e o shape de resposta (`PaginatedFoodsResponseDto`) intactos.

**Parâmetros interpolados só via `Prisma.sql` / template tag — nunca concatenação de string.**
Cada filtro é um fragmento condicional montado com `Prisma.sql`, juntado com `Prisma.join(fragments, ' AND ')`. Identificadores camelCase do schema precisam de aspas no SQL (`f."establishmentId"`, `f."expirationDate"`, `f."statusId"`, `e."addressId"`, `f."categoryId"`, `f."publishedAt"`) — Prisma só mapeia `@@map` de tabela, colunas ficam como no model. `unaccent(f.name) ILIKE '%' || unaccent(${term}) || '%'` mantém o valor como bind param.

**Nomes de coluna/tabela conferidos contra o schema:** tabelas `food`, `establishment`, `address`, `food_status` (via `@@map`); colunas `deleted`, `name`, `city`, `state` (lowercase, sem aspas obrigatórias) e as camelCase acima (com aspas).

**`name`/`city`: `unaccent(coluna) ILIKE '%' || unaccent(param) || '%'`.** `ILIKE` já cobre a caixa; `unaccent` (extensão) cobre o acento. `unaccent` é `STABLE` — ok em `WHERE` de runtime (o problema de imutabilidade só apareceria em índice/coluna gerada, que não entram aqui).

**`state`: comparação exata, valor normalizado para maiúsculas no DTO.** `@Transform` para `toUpperCase()` + `@Matches(/^[A-Z]{2}$/)` (mesmo regex do `AddressDto`). `categoryId`: `@Type(() => Number)` + `@IsInt()` (mesmo padrão de `page`). `name`/`city`: `@IsString()` + `@MaxLength(200)` + `@Transform` de `trim()`; string vazia após trim vira `undefined` (filtro ignorado).

**Testes:** unit em `foods.service.spec.ts` mocka `prisma.$queryRaw` e `prisma.food.findMany`, verificando (a) sem filtro → sem cláusula de busca no SQL, defaults de paginação, `skip`/`take` corretos; (b) reordenação da hidratação segue a ordem dos ids; (c) `total` convertido de `bigint`. A correção literal do `unaccent`/`ILIKE` depende de Postgres real — coberta na verificação manual (`curl`) com dados semeados, incluindo caso com acento e caso de indisponível que casa o texto.

## Risks / Trade-offs

- [`$queryRaw` perde a checagem de tipo do Prisma no `WHERE`] → mitigado mantendo o SQL pequeno, um fragmento por filtro, nomes de coluna conferidos contra o schema neste doc e testado por `curl` real.
- [SQL injection se algum valor escapar do bind] → mitigado: todo valor entra como parâmetro de `Prisma.sql`/template tag, nunca concatenado; sem exceção.
- [`ILIKE '%termo%'` faz seq scan] → aceito no volume do MVP (RNF04). `pg_trgm` + índice é change isolada se virar gargalo.
- [Hidratação em duas queries + reordenação em memória] → aceito; alternativa (raw trazendo todas as colunas + montar `category`/`status`/`establishment` na mão) seria mais SQL e mais frágil que um `findMany` com `include`.
- [Normalização de UF pra maiúscula muda silenciosamente o input] → aceito, é o comportamento esperado de campo de UF; documentado no `@ApiPropertyOptional`.
