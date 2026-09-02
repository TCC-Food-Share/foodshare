## Why

RF11 entregou a listagem completa dos alimentos disponíveis, mas sem nenhum filtro — a entidade beneficiária tem que rolar tudo pra achar o que serve. RF12 pede busca por nome, categoria e localização, o mínimo pra a lista ser útil quando houver mais de uma dezena de itens.

## What Changes

- `GET /foods` (endpoint da RF11) ganha quatro parâmetros de query opcionais: `name`, `categoryId`, `city`, `state`. Sem nenhum deles, o comportamento é idêntico ao da RF11.
- **name**: casa por trecho, ignorando caixa **e acento** (`unaccent`) — "feijao" encontra "Feijão".
- **categoryId**: filtra pela categoria (id da lista fixa seedada, mesmo identificador do RF10).
- **city**: casa por trecho no município do endereço do estabelecimento, ignorando caixa e acento.
- **state**: UF exata (2 letras maiúsculas) do endereço do estabelecimento.
- Filtros informados combinam por E (AND) e sempre respeitam a disponibilidade da RF11 (status "Ativo", não excluído, não vencido). Paginação e ordenação (`publishedAt` desc) inalteradas; `total` passa a refletir o conjunto filtrado.
- Postgres ganha a extensão `unaccent` (migration com `CREATE EXTENSION IF NOT EXISTS unaccent`). `FoodsService.list()` passa a montar a consulta via `$queryRaw` (join em `establishment`/`address`, `unaccent(...) ILIKE ...`), paginando no SQL e re-hidratando os registros por id via Prisma para manter o `include` de `category`/`status`/`establishment`.

## Capabilities

### New Capabilities
<!-- Nenhuma. RF12 estende o mesmo endpoint e capability da RF11. -->

### Modified Capabilities
- `alimentos/listagem`: adiciona o requisito de busca (filtro por nome, categoria e localização sobre a listagem) e ajusta o requisito de paginação para deixar claro que `total` reflete o resultado filtrado.

## Impact

- **Backend**: `ListFoodsQueryDto` ganha `name`/`categoryId`/`city`/`state`. `FoodsService.list()` reescrito para `$queryRaw` em duas fases (ids + count no SQL, hidratação por id no Prisma). `FoodsController` atualiza a doc da operação `GET /foods`.
- **Banco**: migration nova só com `CREATE EXTENSION IF NOT EXISTS unaccent` (sem alteração de tabela). Aplicada via `prisma migrate dev --create-only` + edição manual do SQL (a preview `postgresqlExtensions` foi descontinuada no Prisma 7).
- **Frontend**: fora desta change.
- **Fora do escopo**: filtros avançados (faixa de vencimento, distância geográfica, múltiplas categorias, ordenação por relevância/full-text), índice `pg_trgm` para acelerar o `ILIKE` (volume do MVP não exige) e busca por outros campos do endereço além de município/UF.
