## Why

RF11/RF12 entregam a lista de alimentos, mas cada item traz só o resumo. Pra a entidade beneficiária decidir se vai pedir uma doação (RF14), ela precisa abrir o alimento e ver os dados completos — descrição, quantidade, vencimento, estabelecimento de origem.

## What Changes

- Novo endpoint `GET /foods/:id`, autenticado, aberto a qualquer papel (estabelecimento ou entidade beneficiária) — protegido pelo guard global, mesmo padrão do `GET /foods`.
- Retorna o mesmo `FoodResponseDto` do RF10-12 (imagem, nome, categoria, quantidade e unidade, descrição, data de vencimento, status, estabelecimento `{ id, companyName }`). Sem novo formato de resposta.
- Só retorna alimento **disponível** — mesmo recorte da listagem RF11: status "Ativo", `deleted = false` e não vencido. Alimento fora desse conjunto (vencido, excluído, status diferente) responde `404`, como se não existisse.
- `id` não numérico → `400`. `id` numérico sem alimento disponível correspondente → `404`.
- Sem mudança de schema, migration ou seed.

## Capabilities

### New Capabilities
- `alimentos/detalhe`: permite que um usuário autenticado obtenha os dados completos de um único alimento disponível, identificado por id.

### Modified Capabilities
<!-- Nenhuma. RF13 é endpoint novo; não altera requisito de alimentos/listagem nem de alimentos/cadastro. -->

## Impact

- **Backend**: `FoodsController` ganha `GET /foods/:id`; `FoodsService` ganha `getById(id)`. Recorte de "alimento disponível" passa a existir também como `Prisma.FoodWhereInput` reutilizável (o RF12 já tem a versão em SQL cru por causa do `unaccent`; as duas formas descrevem a mesma regra e um teste unitário guarda cada uma). Sem alteração em `schema.prisma`, migrations ou `seed.ts`.
- **API/Doc**: nova operação sob a tag `Alimentos` no Scalar/OpenAPI, `summary`/`description` em pt-BR (RF13).
- **Frontend**: fora desta change.
- **Fora do escopo**: expor endereço/contato do estabelecimento no detalhe, detalhe de alimento indisponível, e visão "meus alimentos" do estabelecimento (dono ver o próprio alimento fora do ar).
