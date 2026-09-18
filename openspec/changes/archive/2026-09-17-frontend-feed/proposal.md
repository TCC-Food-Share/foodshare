## Why

F0–F3 entregaram fundação, login, cadastro e edição de perfil; as rotas `/feed`
e `/alimentos/:id` ainda são `RoutePlaceholder`. RF11–RF13 já estão completos
e testados no backend (specs `alimentos/listagem`, `alimentos/detalhe`), mas
**não existe tela nenhuma que os exponha** — quem já tem conta não consegue
ver um único alimento disponível, e todo o funil de doação (que depende de
"ver o alimento" antes de "pedir o alimento") está bloqueado. O F4 constrói
o feed com busca e o detalhe do alimento, fechando esse gap.

## What Changes

- **Rota `/feed`** (autenticada, dentro do `AppShell`): substitui o
  `RoutePlaceholder` do F0 por uma `FeedPage` real — busca paginada em
  `GET /api/foods`, com os filtros da URL (`useSearchParams`) como fonte da
  verdade (RF12): `name`, `categoryId`, `city`, `state`, `page`. Grade de
  cartões de alimento (RF11), paginação e estado vazio.
- **Rota `/alimentos/:id`** (autenticada): substitui o `RoutePlaceholder` por
  uma `FoodDetailPage` — `GET /api/foods/:id`, com imagem, nome, categoria,
  quantidade/unidade, descrição, vencimento, status e estabelecimento de
  origem (RF13). Para conta de entidade beneficiária, exibe o botão
  "Solicitar doação"; a ação em si (RF14) é do F6 e não é implementada aqui —
  o botão fica **desabilitado**, sem modal.
- **Filtro por cidade** (RF12): o protótipo Pencil só tem dropdown de Estado;
  esta change adiciona um campo de texto de Cidade, ausente no protótipo.
- **Card do alimento com estabelecimento de origem**: o componente "Food Card"
  do protótipo não exibe o estabelecimento — RF11 exige. Adicionado ao card.
- **Gap de backend — listagem de categorias**: não existe endpoint que liste
  as categorias fixas (só o seed do banco). Sem ele, o filtro de categoria
  (RF12) não tem como popular o `<select>` com `id`s reais. Nova capability
  `alimentos/categorias`: `GET /categories` (autenticado), retorna a lista
  fixa `{ id, name }[]` na ordem do seed. Serve também o F5 (cadastro de
  alimento), que precisa do mesmo `<select>`.
- **Gap de backend — cidade/UF do estabelecimento no detalhe**: o protótipo
  mostra "São Paulo, SP" no cartão do estabelecimento, mas
  `EstablishmentSummaryDto` hoje só tem `id` e `companyName` — a spec
  `alimentos/detalhe` também só promete esses dois campos. O serviço já
  faz join com `address` para o filtro de cidade/UF da busca (RF12), então
  incluir `city`/`state` na resposta é uma extensão pequena e sem
  ambiguidade. Modificada a capability `alimentos/detalhe` para prometer os
  dois campos novos.
- **REMOVER do protótipo** (`~/IFSP/Downloads/updated/pencil-design-apresentacao.pen`,
  frames `TetvX` "Desktop - Feed de Alimentos" e `11xFX` "Desktop - Perfil do
  Alimento"):
  - Card "Solicitações para este alimento" (10 Pendentes / 20 Concluídas / …)
    no detalhe — não é RF13, não tem endpoint.
  - Botão "Ver perfil do estabelecimento" (+ divisor) no detalhe — sem perfil
    público no MVP (regra transversal).
  - Nav "Estabelecimentos" no topbar do protótipo — já não existe no
    `nav-items.ts` real (F0 já aplicou a regra transversal).

## Capabilities

### New Capabilities

- `alimentos/categorias`: listagem da lista fixa de categorias (`GET
  /categories`), consumida pelo filtro de busca do F4 e, futuramente, pelo
  cadastro de alimento do F5.

### Modified Capabilities

- `alimentos/detalhe`: a resposta do detalhe passa a incluir `city` e `state`
  do estabelecimento de origem, além de `id`/`companyName` já existentes.

## Impact

- **Backend**:
  - Novo `src/categories/` (module + controller + service), rota `GET
    /categories`, autenticado (mesmo padrão de `GET /foods`), sem paginação
    (lista fixa e pequena — 8 itens). Resposta `{ id: number, name: string
    }[]`, ordenada por `id`.
  - `src/foods/dto/food-response.dto.ts`: `EstablishmentSummaryDto` ganha
    `city` e `state`.
  - `src/foods/foods.service.ts`: `include: { establishment: { include: {
    address: true } } }` em `toResponse`/`hydrate`/`create`; `toResponse`
    passa `city`/`state` de `food.establishment.address`.
- **Frontend** (principal):
  - `src/app/router.tsx`: `/feed` e `/alimentos/:id` deixam de renderizar
    `RoutePlaceholder feature="F4"` e passam a montar `FeedPage` e
    `FoodDetailPage`.
  - Novo `src/features/foods/`: `feed-page.tsx`, `food-detail-page.tsx`,
    `food-card.tsx`, `foods-api.ts` (`listFoods`, `getFood`, tipos),
    `categories-api.ts` (`listCategories`), `search-filters.tsx` (barra de
    busca + selects + input de cidade), `empty-state.tsx`.
  - Novo `src/lib/format.ts`: `formatQuantity` (remove zeros à direita do
    decimal), `formatDate` (`pt-BR`, `DD/MM/AAAA`) — reaproveitável no F7
    (listagem/detalhe de pedidos).
  - Componentes shadcn já existentes reaproveitados: `select`, `badge`,
    `pagination`, `skeleton`, `card`, `button`. Nenhuma dependência nova.
- **Fora do escopo desta change** (fica para as fases indicadas):
  - Botão "Cadastrar alimento" no Feed (conta estabelecimento) — F5.
  - Ação real de "Solicitar doação" (`POST /api/orders`) e o modal — F6.
  - Seletor de `pageSize` — nenhum RF pede, `PLANO-FRONTEND.md` não menciona.
  - Sincronizar o protótipo Pencil com as remoções acima — mesmo precedente
    do F2/F3 (código é a fonte da verdade; divergência registrada em
    `docs/PLANO-FRONTEND.md`).
