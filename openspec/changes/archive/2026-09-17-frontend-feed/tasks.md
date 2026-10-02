## 1. Backend — categorias

- [x] 1.1 `backend/src/categories/`: novo module (`categories.module.ts`,
      `categories.controller.ts`, `categories.service.ts`) e
      `dto/category-response.dto.ts` (`{ id: number, name: string }`).
      `GET /categories` sem paginação, ordenado por `id` ascendente,
      `@ApiTags('Alimentos')`. Registrar o module em `app.module.ts`.
      Verificar: `npm run build` do backend passa.
- [x] 1.2 Teste do service/controller (espelhando o padrão de
      `foods.service.spec.ts`): lista todas as categorias ordenadas por
      `id`; requisição sem sessão autenticada é rejeitada.
  - **Nota**: a rejeição sem sessão é aplicada pelo guard global do
    `better-auth` (mesmo padrão de `GET /foods`, sem `@AllowAnonymous()`) —
    não há spec de controller no projeto para nenhum endpoint autenticado
    (nem `FoodsController`), então o teste ficou só no service, seguindo o
    precedente existente.

## 2. Backend — cidade/UF do estabelecimento no detalhe

- [x] 2.1 `backend/src/foods/dto/food-response.dto.ts`:
      `EstablishmentSummaryDto` ganha `city: string` e `state: string`.
- [x] 2.2 `backend/src/foods/foods.service.ts`: incluir `address` no
      `include` de `establishment` (em `create`, `findAvailableById` e
      `hydrate`); `toResponse` passa `city`/`state` de
      `food.establishment.address`.
- [x] 2.3 Atualizar `foods.service.spec.ts` (mocks de `establishment` com
      `address` incluído) e adicionar caso verificando que a resposta do
      detalhe traz `city`/`state`. Verificar: `npm run test` do backend
      passa.
  - **Resultado**: `npm run build`, `npm run test` (106/106) e `npm run
    lint:check` do backend verdes.

## 3. Frontend — utilitários e API

- [x] 3.1 `frontend/src/lib/format.ts`: `formatQuantity` (remove zeros à
      direita do decimal) e `formatDate` (`pt-BR`, `timeZone: 'UTC'`).
      Verificar: `"5.00"` -> `"5"`, `"2.50"` -> `"2.5"`,
      `"2026-12-31T00:00:00.000Z"` -> `"31/12/2026"`.
- [x] 3.2 `frontend/src/features/foods/foods-api.ts`: tipos `FoodListItem`,
      `PaginatedFoods`, `FoodFilters`; `listFoods(filters)` (`GET /foods`
      com query) e `getFood(id)` (`GET /foods/:id`).
- [x] 3.3 `frontend/src/features/foods/categories-api.ts`: tipo `Category`;
      `listCategories()` (`GET /categories`).

## 4. Frontend — componentes de listagem

- [x] 4.1 `frontend/src/features/foods/food-card.tsx`: card com imagem
      (fallback para `image: null`), nome, badge de categoria,
      estabelecimento de origem (`store` ícone + `companyName` — ausente no
      protótipo, adicionado por RF11), quantidade (ícone `package`) e
      validade (ícone `calendar`), usando `formatQuantity`/`formatDate`.
      Card inteiro é `<Link to={`/alimentos/${food.id}`}>`.
- [x] 4.2 `frontend/src/features/foods/search-filters.tsx`: barra de busca
      (`name`, debounce 400ms), `Select` de categoria (`listCategories`,
      `staleTime` alto), `Select` de estado (`UFS` de `lib/validation.ts`),
      `Input` de cidade (`city`, debounce 400ms, ausente no protótipo,
      adicionado por RF12). Cada mudança escreve nos `useSearchParams` e
      reseta `page` para 1.
- [x] 4.3 `frontend/src/features/foods/empty-state.tsx`: ícone `search-x` +
      "Nenhum alimento encontrado"; botão "Limpar filtros" só quando algum
      filtro (`name`/`categoryId`/`city`/`state`) está ativo.

## 5. Frontend — Feed

- [x] 5.1 `frontend/src/features/foods/feed-page.tsx`: lê/escreve
      `useSearchParams`; `useQuery(['foods', filters], () =>
      listFoods(filters))`; cabeçalho (título + subtítulo do protótipo),
      `<SearchFilters />`, grade responsiva
      (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`) de `<FoodCard>`,
      `<Skeleton>` no formato do card durante `isLoading`, `<EmptyState />`
      quando `total === 0`, `<Pagination>` (componente existente) a partir
      de `page`/`pageSize`/`total`.
- [x] 5.2 `frontend/src/app/router.tsx`: `/feed` passa a renderizar
      `<FeedPage />` no lugar de `<RoutePlaceholder feature="F4" ...>`.
      Verificar: `tsc -b` passa.

## 6. Frontend — Detalhe do alimento

- [x] 6.1 `frontend/src/features/foods/food-detail-page.tsx`: `useQuery`
      por `id` (`useParams`); banner de imagem (320px, fallback de
      `image: null`); coluna de conteúdo — nome + badge de status (verde,
      `Ativo`) + badge de categoria + card de descrição + grade de 3 infos
      (quantidade, validade, publicado em); coluna lateral — card do
      estabelecimento (ícone `store` + `companyName` + `city`/`state`, sem
      "Ver perfil do estabelecimento") e, só quando `role === 'beneficiary'`
      (via `useAuth`), card de ação com botão "Solicitar doação"
      **desabilitado** (RF14 é do F6). **Sem** "Solicitações para este
      alimento".
- [x] 6.2 Estado de "não encontrado" (`404`) — mensagem + link para
      `/feed`. Estado de erro de rede/5xx — alerta neutro + botão de tentar
      de novo (`refetch`).
- [x] 6.3 `frontend/src/app/router.tsx`: `/alimentos/:id` passa a
      renderizar `<FoodDetailPage />` no lugar do `RoutePlaceholder`.
      Verificar: `tsc -b` passa.

## 7. Verificação e fechamento

- [x] 7.1 `backend/`: `npm run lint:check` + `npm run test` + `npm run
      build` sem erro. `frontend/`: `npm run lint:check` (0 warnings) +
      `npm run build` (`tsc -b && vite build`) sem erro.
- [x] 7.2 Verificação de ponta a ponta no browser (`playwright-cli`,
      backend `:3000` + Postgres com seed + `npm run dev`):
  - `/feed`: grade carrega os alimentos disponíveis do seed/dados de teste,
    cada card com estabelecimento de origem visível.
  - Busca por `name`: digitar um trecho do nome filtra a grade (debounce,
    sem um request por tecla — conferir na aba Network).
  - Filtro por categoria e por estado: cada `Select` filtra sozinho, sem
    precisar de botão "Buscar".
  - Filtro por cidade (campo novo, ausente no protótipo): filtra por
    trecho, ignorando acento/caixa.
  - Filtros combinados: grade reflete a interseção; card de nenhum
    resultado mostra o estado vazio com "Limpar filtros"; limpar restaura a
    grade completa.
  - Paginação: mudar de página busca a próxima página; trocar um filtro com
    página > 1 aberta volta para a página 1.
  - Clicar num card abre `/alimentos/:id` com os dados completos batendo
    com os do card (nome, categoria, quantidade, validade) mais descrição,
    status "Ativo" e estabelecimento com cidade/UF.
  - Conta de **entidade beneficiária**: vê o card "Solicitar doação"
    desabilitado no detalhe.
  - Conta de **estabelecimento**: **não** vê o card de ação no detalhe (nem
    do próprio alimento, nem do de outro estabelecimento).
  - Id inválido/inexistente em `/alimentos/:id`: estado de "não encontrado"
    com link de volta ao feed.
  - 0 erros de console em ambas as telas. Dados de teste removidos ao final.
  - **Resultado**: todos os cenários acima verificados no browser com 2
    estabelecimentos de teste (Birigui/SP e Uberlândia/MG) e 1 entidade
    beneficiária, 21 alimentos criados via API real (incluindo 14 só para
    forçar paginação com o `pageSize` default de 20). Confirmado: grade com
    estabelecimento de origem e cidade/UF corretos ponta a ponta (o gap de
    backend resolvido nas seções 1–2 aparece certo na resposta real);
    busca por nome com um único request após o debounce (conferido em
    `playwright-cli requests`); filtro de categoria e de estado aplicam
    sozinhos, inclusive deep-link por URL hidratando o `Select` (`?categoryId=7`
    mostra "Bebidas" selecionado); filtro de cidade por trecho; filtros
    combinados sem resultado mostram o estado vazio, "Limpar filtros" reseta;
    paginação (22 itens -> 2 páginas) avança/volta corretamente; card leva ao
    detalhe com os mesmos dados; beneficiária vê "Solicitar doação"
    desabilitado, estabelecimento não vê o card de ação nem no próprio
    alimento nem no de outro estabelecimento; id malformado e id inexistente
    (`999999`) caem no estado "Alimento não encontrado."; cross-establishment
    (RF11) confirmado — estabelecimento A vê alimentos do estabelecimento B.
    Achado e corrigido durante a verificação: `<img>` sem `onError` não tinha
    fallback para URL de imagem inválida/inacessível (só cobria `image:
    null`) — adicionado estado `imageFailed` com `onError` no card e no
    banner do detalhe, caindo no mesmo ícone de placeholder. 0 erros de
    console além dos 401/404 esperados de requisições sem sessão/id
    inexistente (mesmo padrão já presente nas outras telas). Dados de teste
    removidos do banco ao final (foods, establishments, beneficiary entity e
    users criados para a verificação).
- [x] 7.3 `openspec validate frontend-feed --strict` sem erro.
