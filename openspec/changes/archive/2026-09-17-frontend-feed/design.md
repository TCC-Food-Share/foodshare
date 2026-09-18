## Context

Ver `proposal.md` — "Why". Estado herdado (F0–F3, em `develop`):

- `AppShell` (`components/layout/app-shell.tsx`): `Topbar` + `<main
  className="mx-auto max-w-6xl px-4 py-6">`. Rotas autenticadas já ficam
  dentro dele via `ProtectedRoute`.
- `nav-items.ts`: já **não** tem "Estabelecimentos" — a regra transversal
  ("zero perfil público") já foi aplicada no F0, apesar do protótipo Pencil
  ainda ter esse item de nav no frame do Feed.
- `lib/api.ts`: `api.get<T>(path, { query })` monta querystring, ignora
  valores `undefined`/`''` — serve o filtro de busca sem helper extra.
- `lib/query-client.ts`: React Query já configurado (retry só automático em
  5xx, `staleTime: 30_000` default, handler de 401 central).
- `components/ui/`: `select`, `badge`, `pagination`, `skeleton`, `card`,
  `button` prontos (shadcn). **Nenhuma dependência nova** nesta change.
- Backend (`GET /foods`, `GET /foods/:id`) — ver `proposal.md` para os gaps
  (`GET /categories` novo; `city`/`state` no `EstablishmentSummaryDto`).
  `FoodResponseDto.quantity` é string (evita ponto flutuante);
  `expirationDate`/`publishedAt` são datas ISO.
- Protótipo Pencil: frame `TetvX` ("Desktop - Feed de Alimentos") e `11xFX`
  ("Desktop - Perfil do Alimento"), componente reusável `cXSCe` ("Food
  Card"). Larguras fixas de desktop (1440px, cards de 432px, grade 3
  colunas) — a implementação real é responsiva (RNF01), a grade e as
  larguras do protótipo são referência de proporção, não pixels fixos.

### Pesquisa Refero

Buscas feitas nas telas e estilos do Refero (MCP `refero`) para validar e
refinar o protótipo antes de implementar — não para copiar a identidade
visual de outro produto, e sim para confirmar os padrões de **estrutura**
(onde ficam busca, filtros, grade, paginação, painel de detalhe) contra
produtos reais do mesmo tipo de tela:

- **Feed com busca + filtros + grade de cards** (`doordash.com`,
  `gofundme.com/s/nonprofits`): busca em destaque no topo, filtros
  (categoria/localização) em uma linha logo abaixo, grade de cards com
  imagem no topo — mesma estrutura do protótipo (`TetvX`). Confirma manter:
  busca de texto separada dos filtros discretos (categoria/estado/cidade),
  e não fundir tudo em um único campo livre.
- **Detalhe com coluna de conteúdo + coluna lateral de ação**
  (`care.com/app/search` com painel de perfil à direita): reforça manter o
  layout de duas colunas do protótipo (`11xFX`) — descrição/dados à
  esquerda, estabelecimento + CTA à direita — em vez de empilhar tudo em uma
  coluna só, mesmo em telas menores (colapsa para coluna única, mas a ordem
  "conteúdo → estabelecimento → ação" se mantém).
- **Estado vazio de busca sem resultado** (padrão recorrente em
  `zara.com`, `dropbox.com/events`, ferramentas de busca em geral): ícone +
  mensagem central + ação de limpar filtro, sem erro nem grade quebrada.
  Adotado para o cenário "Filtro sem resultados" da spec `alimentos/listagem`
  (nenhum alimento casa com os filtros).
- **Estilos** (`refero_search_styles`, para calibrar o quanto seguir a
  estética de apps de delivery vs. manter a identidade própria do Food
  Share): estilos como "Raise"/OpenCollective (fintech-editorial, cards com
  borda sutil + sombra leve + azul de destaque único) e "Airbnb.org"
  (nonprofit editorial, alto contraste, espaço generoso) validam a direção
  **já existente** nos tokens shadcn do Food Share (Neutral + `--primary`
  azul, cards com `border` + sombra `xs`) — não a de apps de delivery tipo
  DoorDash (vermelho, cartões grandes com foto dominante, tom mais
  comercial/apetite). Decisão: reaproveitar a **estrutura** do padrão
  DoorDash/GoFundMe (busca + filtros + grade + paginação), mas manter a
  paleta e o peso visual já estabelecidos pelo Food Share (F0/F1) — o pedido
  original ("usar Refero para aperfeiçoar o protótipo") é sobre estrutura e
  qualidade de UI, não sobre trocar a identidade da marca.

## Goals / Non-Goals

**Goals:**

- Feed com busca (RF12) e grade de alimentos (RF11) fiel ao recorte do
  protótipo, com os filtros como estado de URL (compartilhável, sobrevive a
  voltar/avançar do navegador).
- Detalhe do alimento (RF13) com os dados completos e sem o que é fora de
  escopo (estatísticas de solicitação, perfil público).
- Fechar os dois gaps de backend mínimos necessários para os filtros e o
  cartão de estabelecimento funcionarem com dado real (categorias, cidade/UF).
- Componentes (`FoodCard`, filtros, paginação, estado vazio) reaproveitáveis
  como estão pelo F7 (listagem/detalhe de pedido usa padrão parecido de
  grade/paginação/estado vazio).

**Non-Goals (nível de design):**

- Botão "Cadastrar alimento" (F5) e ação real de "Solicitar doação" (F6) —
  ver proposal.md "Impact".
- Ordenação customizável (a spec `alimentos/listagem` já fixa "mais recente
  primeiro"; nenhum RF pede outra ordenação).
- Busca por texto livre cobrindo categoria/localização num único campo — os
  parâmetros do backend são discretos (`name`, `categoryId`, `city`,
  `state`); um único campo livre exigiria heurística de parsing sem respaldo
  no backend.
- Mapa ou geolocalização — nenhum RF pede, `city`/`state` são texto.
- Toggle de tema, dark mode do feed/detalhe — o protótipo não tem frame Dark
  para essas duas telas; mesma decisão do F0–F3 (adiado, sem RF).

## Decisions

### 1. Filtros como estado de URL (`useSearchParams`), aplicados de forma reativa

`FeedPage` lê/escreve `name`, `categoryId`, `city`, `state`, `page` via
`useSearchParams` do `react-router-dom`. A query do React Query
(`['foods', filters]`) deriva diretamente dos search params — mudar a URL
refaz a busca.

- **Texto livre** (`name` na barra de busca, `city` no filtro): `onChange`
  local com **debounce de 400ms** antes de escrever no `useSearchParams`
  (evita um request por tecla). Ao debater texto, `page` volta para 1.
- **Selects** (`categoryId`, `state`): aplicam no `onChange`, sem debounce
  (seleção discreta) — e também resetam `page` para 1.
- **Sem botão "Buscar" explícito** — o protótipo (`i3BsaY` "Buscar Button")
  tem um, mas com filtro reativo + debounce ele é redundante: todo campo já
  atualiza a busca sozinho, e RNF04 (resposta em até 2s) não é ameaçado por
  uma requisição a mais no debounce.
  - Alternativa considerada: manter o botão, só disparar a busca no clique.
    Descartada — um estado de "filtros pendentes vs. aplicados" a mais para
    sincronizar, sem ganho: nenhum filtro do RF12 é caro o bastante para
    justificar atraso deliberado.

### 2. `foods-api.ts` e `categories-api.ts` — tipos e funções puras

```ts
// foods-api.ts
export interface FoodListItem {
  id: number;
  image: string | null;
  name: string;
  quantity: string;
  quantityUnit: string;
  description: string;
  expirationDate: string;
  publishedAt: string;
  category: { id: number; name: string };
  status: { id: number; name: string };
  establishment: { id: number; companyName: string; city?: string; state?: string };
}
export interface PaginatedFoods { data: FoodListItem[]; total: number; page: number; pageSize: number }
export interface FoodFilters { name?: string; categoryId?: number; city?: string; state?: string; page?: number }

export const listFoods = (filters: FoodFilters) =>
  api.get<PaginatedFoods>('/foods', { query: filters });
export const getFood = (id: number) => api.get<FoodListItem>(`/foods/${id}`);
```

```ts
// categories-api.ts
export interface Category { id: number; name: string }
export const listCategories = () => api.get<Category[]>('/categories');
```

`city`/`state` opcionais em `establishment` porque o tipo é compartilhado
entre a listagem (onde o card não usa esses campos, mesmo que a API os
mande) e o detalhe (onde são exibidos) — refletir exatamente o que o backend
promete em cada spec seria dois tipos quase idênticos; um tipo só, com os
dois campos opcionais, é mais simples e o TypeScript não deixa o card
acessar campo que não existe no seu uso.

### 3. Estrutura de arquivos — `features/foods/`

```
features/foods/
  feed-page.tsx
  food-detail-page.tsx
  food-card.tsx
  search-filters.tsx      (barra de busca + selects de categoria/estado + input de cidade)
  empty-state.tsx
  foods-api.ts
  categories-api.ts
lib/
  format.ts                (formatQuantity, formatDate — novo, cross-feature)
```

`format.ts` vai em `lib/` (não em `features/foods/`) porque F7 (pedidos)
também vai precisar formatar data e quantidade — mesmo raciocínio que já
levou `viacep.ts`/`ibge.ts`/`masks.ts` para `lib/` no F3 (antes presos em
`features/auth/sign-up/`).

```ts
// lib/format.ts
export function formatQuantity(quantity: string): string {
  return Number(quantity).toString(); // "5.00" -> "5"; "2.50" -> "2.5"
}
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}
```

`timeZone: 'UTC'` em `formatDate`: `expirationDate`/`publishedAt` chegam à
meia-noite UTC (`2026-12-31T00:00:00.000Z`); sem fixar o fuso, um browser a
oeste de UTC mostraria o dia anterior.

### 4. `FeedPage` — layout e grade

```
<AppShell> (herdado)
  Page Header (título + subtítulo, do protótipo)
  <SearchFilters /> (barra de busca "name" + selects Categoria/Estado + input Cidade)
  {isLoading -> grade de <Skeleton> no formato do card}
  {sem resultado -> <EmptyState />}
  {resultado -> <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data.map(food => <FoodCard key={food.id} food={food} />)}
                </div>}
  <Pagination /> (componente já existente; Anterior/Próxima + números, a
                  partir de `page`/`pageSize`/`total`)
```

Grade responsiva (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) em vez da
largura fixa de 432px/3 colunas do protótipo (RNF01 — o protótipo é só
desktop 1440px). `FoodCard` não fixa largura própria; a grade controla.

`SearchFilters`: barra de busca (ícone + input, RF12 `name`) seguida de uma
linha com `Select` de Categoria (`listCategories`, `staleTime: 10 * 60_000`
— referência quase estática), `Select` de Estado (reaproveita a constante
`UFS` de `lib/validation.ts`, já usada no cadastro/perfil) e `Input` de
Cidade (RF12 `city`, ausente no protótipo — adicionado). Sem `Select` de
Estado dependente de Cidade nem o inverso — os dois são filtros
independentes no backend (`WHERE` combinado por E, não uma cascata).

### 5. `FoodCard` — adiciona estabelecimento de origem

O componente `cXSCe` do protótipo (imagem, nome, badge de categoria, `Qtd:
X`, `Validade: X`) não tem o estabelecimento — RF11 exige. Acrescenta uma
linha (`store` ícone lucide + `establishment.companyName`) entre a badge de
categoria e o bloco de quantidade/validade, no mesmo estilo `text-sm
text-muted-foreground` das outras meta-linhas. Card inteiro é um
`<Link to={"/alimentos/" + food.id}>` (RF13 — abre o detalhe).

Imagem: `food.image` pode ser `null` (RF10 não obriga imagem no schema,
mesmo que a UI do F5 vá pedir) — fallback visual (ícone `image-off` do
lucide sobre `bg-muted`) em vez de `<img>` quebrada.

### 6. `FoodDetailPage` — remoções e regra por papel

Estrutura do protótipo (`11xFX`) mantida: banner de imagem (320px, mesmo
fallback de `null` do card), coluna de conteúdo (nome + badge de status +
badge de categoria + card de descrição + grade de 3 infos: quantidade,
validade, publicado em) e coluna lateral (card do estabelecimento + card de
ação).

**Removido** do protótipo:
- "Requests Stats Card" ("Solicitações para este alimento") inteiro — não é
  RF13, não existe endpoint de contagem de pedidos por alimento.
- Botão "Ver perfil do estabelecimento" + divisor no card do estabelecimento
  — sem perfil público no MVP.

**Card do estabelecimento**: ícone `store` + `companyName` + `city`/`state`
(agora disponíveis via o gap de backend resolvido nesta change — decisão
"Modified Capability" do proposal). Sem telefone/e-mail/endereço de rua —
RF13 nunca pediu isso, e a regra transversal 9 do `PLANO-FRONTEND.md`
("detalhe do pedido só com id/companyName/tradeName/description/city/state")
é o mesmo padrão de exposição mínima de dado institucional.

**Card de ação** ("Interessado neste alimento?" + botão "Solicitar
doação"): renderizado **somente quando `role === 'beneficiary'`** — um
estabelecimento vendo o próprio alimento (ou o de outro estabelecimento) não
solicita doação para si. Alternativa descartada: mostrar sempre e desabilitar
para estabelecimento — pior, porque sugere uma ação que nunca fará sentido
para esse papel, em vez de simplesmente omiti-la.

Para `role === 'beneficiary'`, o botão "Solicitar doação" é renderizado
**desabilitado** (RF14 é do F6, ainda não implementado) — sem modal, sem
navegação. É o placeholder mínimo permitido: o botão existe (fiel ao
protótipo, RF13 menciona que dele "sai" a ação) mas não faz nada até o F6
ligar o `onClick`.

### 7. Estados de carregamento e erro

- **Loading**: `<Skeleton>` no formato de `FoodCard` (grade de placeholders)
  no feed; skeleton de banner+colunas no detalhe. React Query já dá
  `isLoading`/`isError` prontos.
- **Alimento não encontrado** (`404` do `GET /foods/:id` — id inválido,
  vencido, excluído ou de outro status): página de "não encontrado" com
  link de volta para `/feed`. Não distingue os sub-casos (a spec já não
  distingue, para não revelar estado real do alimento).
- **Erro de rede/5xx**: mensagem neutra + botão de tentar de novo
  (`refetch` do React Query), mesmo padrão de alerta neutro do F2/F3.
- **Filtro sem resultado** (RF12, `total: 0`): `<EmptyState />` — ícone
  `search-x` + "Nenhum alimento encontrado" +, se algum filtro estiver
  ativo, botão "Limpar filtros" (reseta os `searchParams`). Sem filtro
  ativo e ainda assim vazio (plataforma sem nenhum alimento disponível):
  mesma tela, sem o botão de limpar (não há o que limpar).

## Risks / Trade-offs

- **Gap de backend "escondido" dentro de uma change de frontend** → dois
  endpoints/campos pequenos e sem ambiguidade (`GET /categories`,
  `city`/`state` no `EstablishmentSummaryDto`), no mesmo precedente do F3
  (`GET .../me`). Sem os dois, o filtro de categoria e o card de
  estabelecimento do detalhe não têm dado real para mostrar — não dá para
  adiar sem também adiar RF12/RF13 na prática.
- **Debounce de 400ms sem botão "Buscar"** → se parecer lento/estranho na
  verificação manual, o ajuste é só no valor do debounce; a arquitetura
  (search params → React Query) não muda.
- **`EstablishmentSummaryDto` ganha campos opcionais na listagem também**
  (mesmo DTO da spec `alimentos/listagem`, que não promete `city`/`state`) →
  inofensivo (campo a mais que o card do feed ignora), mas registrado aqui
  para não ser lido como regressão de contrato: a spec `alimentos/listagem`
  não muda, só passa a "sobrar" dois campos que ela nunca proibiu.
- **`image: null`** em card e banner → fallback visual definido (ícone sobre
  `bg-muted`); sem isso a `<img src="null">` quebraria silenciosamente.
- **Paginação com filtro mudando página ativa** → toda mudança de filtro
  reseta `page` para 1 (decisão 1); sem isso, trocar de categoria com a
  página 3 aberta poderia cair numa página além do novo total (a spec já
  cobre isso retornando lista vazia sem erro, mas resetar evita a
  experiência ruim).

## Migration Plan

1. Backend primeiro (`GET /categories`, `city`/`state` no
   `EstablishmentSummaryDto`) — branch própria ou início do mesmo branch do
   RF principal (RF11/RF12/RF13 — ver `docs/BRANCHES.md`), já que o
   frontend depende deles para os dois filtros funcionarem com dado real.
   `npx prisma` não muda (nenhuma migração de schema — `address` já existe
   e já está relacionado a `establishment`).
2. Frontend: implementar `features/foods/` + `lib/format.ts` + rotas.
   `npm run lint:check` (0 warnings) + `npm run build` (`tsc -b && vite
   build`).
3. Verificação de ponta a ponta no browser (`playwright-cli`, backend
   `:3000` + Postgres + `npm run dev`) — ver `tasks.md`.
4. PR para `develop`. Sem migração de dado (schema inalterado). Rollback =
   reverter o PR: `/feed` e `/alimentos/:id` voltam ao `RoutePlaceholder`;
   `GET /categories` e os campos novos do DTO somem sem quebrar nenhum
   consumidor existente (nenhum cliente atual lê `city`/`state` do
   estabelecimento).

## Open Questions

Nenhuma que mude specs, abordagem ou o recorte de tasks. Fica para o apply,
sem impacto estrutural:

- Texto exato do subtítulo/placeholder da busca e da mensagem de estado
  vazio (ajuste fino de copy, protótipo já dá uma base em pt-BR).
- Se o filtro de Estado usa as 27 siglas secas ou "SP — São Paulo" (mesma
  question já deixada em aberto no F2 para o cadastro).
