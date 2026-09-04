## Context

Ver `proposal.md` ("Why"). `OrdersService` tem `create`, `accept`, `reject`, `receive` e o privado `toResponse(order)` que mapeia um `Prisma.OrderGetPayload<{ include: { status; food; establishment; beneficiaryEntity } }>` para `OrderResponseDto`. Todas as transições resolvem o ator por `prisma.establishment.findUnique({ where: { userId } })` ou `prisma.beneficiaryEntity.findUnique({ where: { userId } })`.

A listagem de alimentos (RF11/RF12, `FoodsService.list`) já fixou o padrão de paginação do projeto: constantes `DEFAULT_PAGE = 1`, `DEFAULT_PAGE_SIZE = 20`, `MAX_PAGE_SIZE = 50`; `page = query.page ?? DEFAULT_PAGE`; `pageSize = Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)`; `skip = (page - 1) * pageSize`. DTO de query com `@IsOptional() @Type(() => Number) @IsInt() @Min(1)` em `page`/`pageSize` (não numérico/zero/negativo → 400 pelo `ValidationPipe`). Resposta `PaginatedFoodsResponseDto { data, total, page, pageSize }`.

`Order` não tem coluna de status como enum — `statusId` aponta para `OrderStatus` (lookup), hoje seedado com "Pendente", "Aceito", "Rejeitado", "Recebido".

## Goals / Non-Goals

**Goals:**
- `GET /orders` paginado, recortado pela sessão (estabelecimento OU entidade), filtro opcional por status, ordenação `orderDate` desc.
- Espelhar exatamente o padrão de paginação do `FoodsService` — mesmas constantes, mesma forma de DTO e de resposta.
- Reusar `toResponse`.

**Non-Goals:**
- RF20 (`GET /orders/:id`).
- Qualquer filtro além de `status` (por alimento, período, contraparte).
- `countsByStatus` na resposta — o frontend faz uma request por aba.
- Mudança de schema ou de qualquer requisito existente.

## Decisions

**Resolução do ator: tenta estabelecimento, depois entidade beneficiária, senão 404.**
```ts
const establishment = await this.prisma.establishment.findUnique({ where: { userId } });
const beneficiaryEntity = establishment
  ? null
  : await this.prisma.beneficiaryEntity.findUnique({ where: { userId } });

if (!establishment && !beneficiaryEntity) {
  throw new NotFoundException('No establishment or beneficiary entity linked to this account.');
}

const ownerWhere: Prisma.OrderWhereInput = establishment
  ? { establishmentId: establishment.id }
  : { beneficiaryEntityId: beneficiaryEntity!.id };
```
Um `User` tem no máximo um dos dois (`establishment Establishment?` / `beneficiaryEntity BeneficiaryEntity?`, ambos `@unique`), então a ordem não gera ambiguidade. Mesmo padrão de "conta do tipo errado → 404" das outras rotas.

**Filtro de status via `@IsIn` no DTO, não lookup silencioso.**
`ListOrdersQueryDto.status?: string` com `@IsOptional() @IsIn(['Pendente', 'Aceito', 'Rejeitado', 'Recebido'])`. Valor inválido → `400` pelo `ValidationPipe` (mais útil que devolver lista vazia para um typo). Ausente → sem filtro. A lista de nomes válidos é a mesma dos status seedados; fica como constante compartilhada com o service (`ORDER_STATUS_NAMES`) para não divergir. O `where` de status é `status: { name: query.status }` quando presente.

**`list(userId, query)` — `findMany` + `count`, sem transação.**
```ts
const where: Prisma.OrderWhereInput = {
  deleted: false,
  ...ownerWhere,
  ...(query.status ? { status: { name: query.status } } : {}),
};
const page = query.page ?? DEFAULT_PAGE;
const pageSize = Math.min(query.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

const [rows, total] = await Promise.all([
  this.prisma.order.findMany({
    where,
    include: { status: true, food: true, establishment: true, beneficiaryEntity: true },
    orderBy: { orderDate: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  }),
  this.prisma.order.count({ where }),
]);

return { data: rows.map((r) => this.toResponse(r)), total, page, pageSize };
```
Leitura pura — sem `$transaction`. `findMany` + `count` em `Promise.all` (mesma prática que o `FoodsService`, que roda contagem separada). Ordenação por `orderDate` (não `createdAt`) — é o campo "quando o pedido foi feito", visível no DTO.

**Constantes de paginação: espelhar, não extrair para um shared.**
`DEFAULT_PAGE`, `DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE` repetidas em `orders.service.ts` com os mesmos valores de `foods.service.ts`. Extrair para um módulo comum é refactor fora do escopo do RF19; o custo de manter dois trios idênticos é baixo e o risco de divergência é pequeno (valores estáveis, citados na spec). Registrado como dívida menor.

**Rota `GET /orders`, tag `Pedidos`.**
`@Query() ListOrdersQueryDto`, `@Session()`. `@ApiOkResponse({ type: PaginatedOrdersResponseDto })`, `@ApiBadRequestResponse` (status/paginação inválidos), `@ApiUnauthorizedResponse`, `@ApiNotFoundResponse` (conta sem instituição). Convive com `POST /orders` (RF14) e as rotas `PATCH /orders/:id/*`; `GET /orders/:id` fica para RF20.

**DTOs novos em `orders/dto/`:**
- `ListOrdersQueryDto` — `page?`, `pageSize?` (idênticos aos de `ListFoodsQueryDto`), `status?` (`@IsIn`). `@ApiPropertyOptional` em pt-BR.
- `PaginatedOrdersResponseDto` — `data: OrderResponseDto[]`, `total`, `page`, `pageSize`. Espelha `PaginatedFoodsResponseDto`.

## Risks / Trade-offs

- [`toResponse` privado reusado pelo `list`] → já é usado por todas as mutações; nenhuma mudança de visibilidade necessária (mesma classe).
- [Trio de constantes de paginação duplicado entre `foods` e `orders`] → aceito; extrair um `pagination.ts` comum é refactor à parte. Valores são citados na spec (20 / 50), então divergência acidental seria pega em teste.
- [`status` como string validada por `@IsIn` em vez de resolver o `statusId`] → o `where` `status: { name }` já faz o join; não precisa buscar o `OrderStatus` antes. Se o nome não existisse no banco, o filtro só traria zero linhas — mas o `@IsIn` garante que só nomes seedados chegam.
- [Sem índice explícito em `order(establishmentId)` / `order(beneficiaryEntityId)`] → as FKs já criam índice no Postgres via Prisma; a consulta filtra por FK + `deleted` + opcional status, volume baixo por instituição. Sem otimização adicional no MVP.
