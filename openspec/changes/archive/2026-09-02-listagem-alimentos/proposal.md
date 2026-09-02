## Why

O RF10 já deixa o estabelecimento cadastrar alimento, mas nada consome esse estoque ainda — não há tela nem endpoint para ver o que existe. RF11 é o primeiro caminho de leitura do alimento: qualquer usuário autenticado (estabelecimento ou entidade beneficiária) precisa enxergar a lista do que está disponível para, depois, buscar (RF12) e pedir (RF14).

## What Changes

- Endpoint `GET /foods`, autenticado, aberto a qualquer papel (estabelecimento ou entidade beneficiária) — protegido pelo guard global, sem `@AllowAnonymous()`, mesmo padrão de proteção do `POST /foods`.
- Retorna a lista global de alimentos **disponíveis**: status `"Ativo"`, `deleted = false` e ainda **não vencidos** (`expirationDate` a partir de hoje — alimento que vence hoje ainda aparece). Alimento de qualquer estabelecimento entra na lista, sem recorte por dono.
- Paginação simples por query string: `page` (default `1`) e `pageSize` (default `20`, teto `50`), ordenado por `publishedAt` desc (mais recente primeiro). Resposta traz os itens da página mais os metadados `total`, `page`, `pageSize`.
- Cada item usa o mesmo `FoodResponseDto` do RF10 (`category` / `status` / `establishment` expandidos), sem novo formato de alimento.
- Sem mudança de schema, migration ou seed. Sem busca/filtro (RF12) e sem detalhe de um alimento (RF13) — só a listagem.

## Capabilities

### New Capabilities
- `alimentos/listagem`: permite que um usuário autenticado visualize a listagem paginada dos alimentos disponíveis na plataforma (status "Ativo", não excluídos, não vencidos), independentemente do papel ou de qual estabelecimento cadastrou o alimento.

### Modified Capabilities
<!-- Nenhuma. RF11 não altera requisito de alimentos/cadastro nem de auth. -->

## Impact

- **Backend**: módulo `foods/` ganha `GET /foods` no `FoodsController`, `FoodsService.list()`, um `ListFoodsQueryDto` (paginação) e um DTO de resposta paginada (`PaginatedFoodsResponseDto` ou equivalente) reaproveitando `FoodResponseDto`. Sem alteração em `schema.prisma`, migrations ou `seed.ts`.
- **API/Doc**: nova operação sob a tag `Alimentos` no Scalar/OpenAPI, com `summary`/`description` em pt-BR (RF11).
- **Frontend**: fora desta change.
- **Fora do escopo desta change**: RF12 (busca por nome/categoria/localização), RF13 (detalhe completo de um alimento), visão "meus alimentos" do estabelecimento, filtro por vencimento configurável e qualquer mecanismo de transição de status.
