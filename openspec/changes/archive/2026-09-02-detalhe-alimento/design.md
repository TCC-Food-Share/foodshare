## Context

Ver `proposal.md` ("Why"). O módulo `foods/` já tem `FoodsController` (`POST /foods`, `GET /foods`) e `FoodsService` (`create`, `list`, `toResponse`). O RF12 deixou o recorte de "alimento disponível" só na forma de fragmento SQL cru (`buildAvailableAndFilteredWhere`), porque `unaccent` não passa pelo query builder do Prisma. Guard de autenticação é global; `ValidationPipe` global com `transform: true`. `FoodResponseDto` já cobre todos os campos pedidos pelo RF13.

## Goals / Non-Goals

**Goals:**
- `GET /foods/:id` autenticado, retornando `FoodResponseDto` de um alimento disponível, ou `404`.
- Recorte de "disponível" idêntico ao da listagem, sem duplicar a regra de forma solta.

**Non-Goals:**
- Endereço/contato do estabelecimento no detalhe (decidido com a usuária — mantém `{ id, companyName }`).
- Detalhe de alimento indisponível com status real.
- Unificar os dois formatos do filtro (SQL cru do RF12 vs `WhereInput` do RF13) numa única fonte — `unaccent` impede.

## Decisions

**`GET /foods/:id` no `FoodsController`, com `@Param('id', ParseIntPipe)`.**
`ParseIntPipe` converte e valida o id: não numérico → `400` automático, antes de tocar o banco (cobre o cenário "id em formato inválido"). Rota depois do `POST` e do `GET` sem parâmetro — ordem não conflita (`/foods` literal vs `/foods/:id`).

**`FoodsService.getById(id)` com `prisma.food.findFirst({ where: availableFoodWhereInput(id), include: { category, status, establishment } })`.**
`findFirst` (não `findUnique`) porque o `where` tem mais que a PK. Resultado nulo → `NotFoundException` (mensagem genérica, não revela se o alimento existe em outro estado — cenário do spec). Sucesso → `toResponse` (reaproveitado como está).

**Recorte de disponível extraído como `availableFoodWhereInput(id?: number): Prisma.FoodWhereInput`.**
`{ deleted: false, status: { name: ACTIVE_STATUS }, expirationDate: { gte: startOfTodayUtc() }, ...(id !== undefined ? { id } : {}) }`. Uma função só, no `FoodsService`, descrevendo a regra do MVP em forma Prisma. O `buildAvailableAndFilteredWhere` do RF12 (SQL cru) descreve a mesma base — as duas precisam andar juntas; um teste unitário de cada lado (o do RF12 já existe; o do RF13 checa `deleted/status/expirationDate` no `where`) trava a divergência silenciosa. Alternativa (reescrever `list` do RF12 pra Prisma e ter uma fonte só) foi descartada quando o RF12 escolheu `unaccent` + `$queryRaw`.

**Sem `orderBy` nem `take` no `findFirst`.** Id é único; `findFirst` com filtro extra devolve 0 ou 1.

## Risks / Trade-offs

- [Regra de "disponível" em dois lugares (SQL cru do RF12, `WhereInput` do RF13)] → mitigado: ambos no mesmo `FoodsService`, um teste unitário guarda cada forma; se um RF futuro mudar a definição de "disponível", os dois testes quebram e apontam os dois pontos.
- [`findFirst` sem índice além da PK] → irrelevante: filtro parte da PK (`id`), o resto (`deleted`/`status`/`expirationDate`) só refina uma linha já localizada.
