## Context

Ver `proposal.md` — "Why". Estado herdado (F0–F6, em `develop`):

- `router.tsx`: `/pedidos` e `/pedidos/:id` são `RoutePlaceholder` do F7, dentro
  de `ProtectedRoute` + `AppShell`. `nav-items.ts` já expõe "Pedidos recebidos"
  (estabelecimento) e "Meus pedidos" (entidade) → `/pedidos`; o `NavLink` casa
  por prefixo, então o item continua ativo em `/pedidos/:id`.
- `features/orders/orders-api.ts` (F6): tipo `Order` (item da listagem),
  `PaginatedOrders`, `createOrder`, `listOrdersByStatus(status)` (`pageSize: 50`,
  usado só pelo aviso de limite do F6), `conflictCode`. Chaves de cache
  existentes: `['orders', 'in-progress', status]`; o `POST /orders` invalida o
  prefixo `['orders']`.
- `features/foods/feed-page.tsx` (F4): padrão de listagem paginada do projeto —
  `useSearchParams` como fonte de `page`/filtros, `useQuery` com a chave
  incluindo os filtros, skeleton, estado de erro, `EmptyState`, e o bloco
  `Pagination` com a função local `pageWindow`. `food-detail-page.tsx` é o
  padrão de página de detalhe (skeleton, `404` × erro genérico, `Number.isInteger`
  no id, grid `lg:grid-cols-[1fr_360px]`).
- `lib/format.ts`: `formatDate` fixa `timeZone: 'UTC'` — correto para
  `expirationDate` (data de calendário salva como meia-noite UTC), **errado**
  para `orderDate` (instante: 23h em Birigui já é "amanhã" em UTC).
- shadcn presente: `tabs` (só o segmento em pílula), `table`, `pagination`,
  `badge`, `card`, `skeleton`, `alert`, `button`. Nada novo a instalar.
- `lib/query-client.ts`: sem retry em 4xx, `staleTime` 30 s, `401` tratado
  centralmente.

**Contrato do backend** (sem mudança nesta change):

- `GET /api/orders?status=&page=&pageSize=` → `{ data: Order[], total, page,
  pageSize }`. Recorte pela sessão (estabelecimento: pedidos dos alimentos
  dele; entidade: pedidos que criou). `pageSize` default 20, teto 50; ordenado
  do mais recente ao mais antigo. Página além do fim → `data: []` com o `total`
  real. `status` fora dos quatro nomes → `400`.
- Item da listagem (`OrderResponseDto`): `id`, `quantity` (string),
  `orderDate` (ISO), `status { id, name }`, `food { id, name, quantityUnit }`,
  `establishment { id, companyName }`, `beneficiaryEntity { id, companyName }`.
  **Sem imagem, categoria ou cidade** — a listagem não tem como ter miniatura
  do alimento (o protótipo do estabelecimento tem; ver Decisão 4).
- `GET /api/orders/:id` → `OrderDetailResponseDto`: `id`, `quantity`,
  `orderDate`, `status`, `food { id, image | null, name, quantity (estoque
  **atual**), quantityUnit, description, expirationDate, category, status }`,
  `establishment` e `beneficiaryEntity` (`id`, `companyName`, `tradeName | null`,
  `description`, `city`, `state`). Pedido inexistente, excluído ou de outra
  instituição → `404`; id não numérico → `400`.
- O `food` do detalhe **não filtra por disponibilidade**: é registro histórico
  (o `GET /foods/:id`, ao contrário, dá `404` para alimento vencido/inativo).

**Protótipo Pencil** (lido via MCP `pencil`; arquivo
`pencil-design-apresentacao.pen`):

- `MyFw0` "Listar Pedidos" (entidade, 1440×900): topbar; título "Pedidos" +
  subtítulo; campo de busca; **abas com contador** (Ativo 3 / Em andamento 2 /
  Rejeitado 1 / Doado 5 / Cancelado 1, a ativa com chip `--primary`); tabela em
  card (cabeçalho `--accent`: Alimento, Data, Quantidade, Status, Estabelecimento,
  Ações com ícone de olho); selo de status em pílula; rodapé "Mostrando 3 de 3
  pedidos ativos" + paginação `‹ 1 ›`.
- `vRf3b` "Pedidos Recebidos" (estabelecimento): mesmo esqueleto; colunas
  Alimento (miniatura + nome), Entidade Beneficiária, Data, Qtde, Status, Ações
  (olho + botão "Aceitar" verde); rodapé "5 pedidos encontrados".
- `NYKRt` "Detalhes do Pedido (Estabelecimento)": breadcrumb "Pedidos / Detalhes
  do Pedido #1042"; "Pedido #1042", "Solicitado em 07/04/2026 às 14:32", selo;
  coluna esquerda com card do alimento (imagem à esquerda; nome, categoria,
  quantidade, validade, descrição) e **Histórico do pedido**; coluna direita
  com "Entidade beneficiária solicitante" (+ "Ver perfil") e **Ações do pedido**
  (Aceitar/Rejeitar "com um motivo").
- `I0EByf` "Detalhes do Pedido (Entidade)": "Meus Pedidos / Pedido #1087",
  faixa "Status: Em andamento", cards Alimento (+ "Ver alimento →"),
  **Estabelecimento Doador** (com e-mail, telefone e WhatsApp), Histórico,
  **Resumo do Pedido** (data, quantidade, nº, status) e **Ações do pedido**
  (Confirmar recebimento / Cancelar pedido).

### Pesquisa Refero

Buscas nas telas do Refero (MCP `refero`) para validar e refinar o protótipo:

- **Listagem com abas por status** — Mercury "Payments" (`cafd6154`), Shopify
  "Products" (`abcfab7d`), Squarespace "Orders" (`4e3967c1`), Fourthwall
  "Orders": abas **sublinhadas** com contador discreto ao lado do rótulo; tabela
  sem zebra, cabeçalho em texto atenuado, selo de status em pílula neutra/colorida,
  linha inteira como alvo do clique, paginação no rodapé com "X–Y de N".
  → adotar aba sublinhada (o protótipo já faz isso; a pílula do shadcn destoa
  do protótipo e da preferência do usuário por menos "pill" em navegação).
- **Estado vazio de aba** — Squarespace/Zara/adidas/Shopify "Discounts": as abas
  **permanecem** e só o corpo troca por título curto + uma linha explicativa
  (+ um CTA quando há um próximo passo óbvio, como "Start shopping"). → manter
  as abas visíveis, texto por status e CTA "Ver alimentos" só para a entidade.
- **Detalhe de pedido** — padrão das referências e do protótipo: cabeçalho
  (voltar + título + selo + metadados) e duas colunas, conteúdo à esquerda e
  cartões de resumo/contraparte à direita.
- **Mobile** — Netflix "My List" (`a0594dd1`) e Shopify iOS "Orders": abas
  sublinhadas rolam na horizontal e a lista vira **linhas-cartão** (título, meta,
  selo à direita), em vez de tabela espremida. → cartões abaixo de `md`.

## Goals / Non-Goals

**Goals:**

- Entregar RF19 (abas por status) e RF20 (detalhe) para os dois papéis, com o
  mesmo componente e variações só de rótulo/coluna.
- Deixar o F8 encaixar Aceitar/Rejeitar/Confirmar sem refatorar: coluna lateral
  do detalhe empilhável, coluna "Ações" na tabela, chaves de cache sob
  `['orders']`.
- Responsivo (RNF01), estados de carregamento/erro/vazio completos, sem
  regressão no F4 (feed).

**Non-Goals:**

- Ações de pedido (F8), busca/ordenação/filtros extras, aba "Todos", exportação.
- Mudança de backend (p. ex. devolver imagem/categoria na listagem).
- Sincronizar o `.pen` — o código é a fonte da verdade (mesmo precedente do F2–F6).

## Decisions

### 1. Aba por status = um request por aba, estado na URL

`OrdersPage` lê `status` e `page` de `useSearchParams` (padrão do F4). `status`
ausente ou inválido cai em `Pendente`; trocar de aba zera `page`. A aba ativa
faz `GET /orders?status=&page=&pageSize=10`, chave `['orders', 'list', { status,
page }]`. **Sem `keepPreviousData`**: ao trocar de aba, as linhas da aba anterior
não podem aparecer sob o rótulo novo — vale o skeleton.

*Alternativas:* `useState` (perde a aba no F5/voltar do detalhe e quebra o link
"Ver meus pedidos"→aba certa); buscar tudo com `status` ausente e filtrar no
cliente (paginação e contagem erradas, quebra o teto de 50).

Ordem das abas: Pendente → Aceito → Rejeitado → Recebido (a ordem do ciclo de
vida; o protótipo põe "Ativo" primeiro pelo mesmo motivo). Sem aba "Todos": RF19
diz "separados por status", o plano diz "uma aba por status".

### 2. `Tabs` com variante `line`; contador por aba via `pageSize=1`

`ui/tabs.tsx` ganha `variant?: 'default' | 'line'` (cva no `TabsList`, como o
shadcn atual; o gatilho lê o `data-variant` da lista): `line` = lista sem fundo
com borda inferior, gatilho sem raio e sublinhado `border-primary` no ativo,
`overflow-x-auto` para caber em 400 px.
O F7 usa `line`; `default` fica intocado.

Contador: hook `useOrderCounts()` com `useQueries` (uma consulta `pageSize: 1`
por status, chave `['orders', 'count', status]`) → `Record<status, number |
undefined>`. Chip escondido enquanto carrega ou se a contagem falhar (a lista
já mostra o erro dela). São 4 requisições minúsculas em paralelo — dentro do
RNF04 — e o F8 as atualiza sozinho via `invalidateQueries(['orders'])`.

*Alternativas:* sem contador (perde o que o protótipo tem e o que as referências
mostram); contar pela aba ativa e "?" nas outras (pior que os 4 requests).

### 3. Uma fonte de dados, duas renderizações (tabela ≥ `md`, cartões < `md`)

`OrdersPage` passa `orders` a `OrdersTable` (`hidden md:block`) e `OrderCards`
(`md:hidden`); `display: none` tira o outro do fluxo de leitura de tela. Sem
`matchMedia`/JS.

Colunas da tabela (ordem do protótipo): **Alimento** (nome + "Pedido #N" atenuado
embaixo), **Quantidade** (`qty unit`, alinhada à direita), **Data**, **Status**
(`OrderStatusBadge`), **Estabelecimento** *(entidade)* / **Entidade
beneficiária** *(estabelecimento)*, **Ações**. A coluna de status fica mesmo
sendo redundante com a aba: as referências (Mercury, Shopify) também a mantêm, e
o selo é o mesmo componente do detalhe.

Interação: a linha inteira leva a `/pedidos/:id` (`onClick` + `cursor-pointer`
+ realce `hover`), e a coluna "Ações" tem um botão-link "Ver detalhes" (ícone de
olho, `aria-label="Ver detalhes do pedido #N"`) — o caminho por teclado/leitor
de tela. O F8 põe Aceitar/Rejeitar na mesma coluna (com `stopPropagation`).
No cartão mobile o cartão todo é um `Link`.

Miniatura do alimento (protótipo do estabelecimento): **omitida** — a listagem
não devolve `image`; não vale mudar o backend por isso.

*Alternativa:* só tabela com `overflow-x-auto` (o `Table` do shadcn já faz) —
rola de lado a 400 px, ruim para a tarefa principal de quem está na rua.

### 4. Papéis: mesmo componente, textos e coluna por `role`

| | `beneficiary` | `establishment` |
|---|---|---|
| Título | Meus pedidos | Pedidos recebidos |
| Subtítulo | Acompanhe suas solicitações de doação de alimentos | Acompanhe as solicitações de doação feitas aos seus alimentos |
| Coluna/linha da outra ponta | Estabelecimento → `establishment.companyName` | Entidade beneficiária → `beneficiaryEntity.companyName` |
| Card da outra ponta (detalhe) | "Estabelecimento doador" | "Entidade beneficiária solicitante" |

O recorte de dados é do backend (pela sessão); o cliente só escolhe rótulo e
campo. `useAuth().role` é a fonte (já usada no F4/F6).

### 5. Estados: carregando, erro, vazio por aba

- **Carregando:** 5 `Skeleton` de linha (mesma altura da linha real) sob as
  abas, que já aparecem.
- **Erro:** texto + "Tentar novamente" (`refetch`), sem derrubar as abas.
- **Vazio** (`orders-empty-state.tsx`): abas permanecem; ícone + título + uma
  linha, por status e papel — ex.: `Pendente` estabelecimento "Nenhum pedido
  pendente / Novas solicitações de doação aparecem aqui."; `Pendente` entidade
  "Você não tem pedidos pendentes / Encontre um alimento no feed e solicite uma
  doação." + botão **Ver alimentos** (→ `/feed`); `Aceito`/`Rejeitado`/
  `Recebido` só texto ("Nenhum pedido aceito/rejeitado/recebido"). Sem
  "Limpar filtros" (não há filtro além da aba).
- **Página fora do intervalo** (o backend devolve `data: []` com `total > 0`
  quando `page` passa do fim — acontece quando o F8 esvazia a última página):
  `Navigate replace` para a última página, em vez de mostrar "vazio" com
  contador diferente de zero.

### 6. Paginação: extrair o bloco do F4

`pageWindow` + o JSX `Pagination…` de `feed-page.tsx` viram
`components/pagination-bar.tsx` (`{ page, totalPages, onPageChange }`); feed e
pedidos usam o mesmo. Muda o F4 só na origem do markup — comportamento idêntico
(verificar no feed). `ORDERS_PAGE_SIZE = 10` (tabela: 10 linhas cabem sem rolar
muito; o feed usa o padrão 20 por ser grade de cartões). Rodapé da tabela:
"Mostrando X–Y de N pedidos" à esquerda, `PaginationBar` à direita (só se
`totalPages > 1`); nos cartões, os mesmos dois empilhados.

### 7. Selo de status: ponto + texto, cor por status

`OrderStatusBadge({ status })` sobre o `Badge` (variante `outline`, pílula como o
selo do detalhe do alimento — a rejeição de "pill" foi só de botão/nav):

| Status | Ponto/Texto | Fundo |
|---|---|---|
| Pendente | âmbar (`--warning`) | `bg-warning/10` |
| Aceito | `--primary` | `bg-primary/10` |
| Rejeitado | `--destructive` | `bg-destructive/10` |
| Recebido | `green-700` (claro) / `green-400` (escuro) | `green-100` / `green-950` |

Reusa tokens existentes (`--warning` veio no F6); o verde usa a paleta Tailwind
com variante `dark:` — não se cria um `--success` só para isso. Cor nunca sozinha:
o ponto acompanha o nome do status.

### 8. Detalhe: 2 colunas, contraparte só, sem histórico

Grid `lg:grid-cols-[1fr_360px]` (igual ao detalhe do alimento):

- **Cabeçalho:** link "← Pedidos" para `/pedidos?status=<status do pedido>` (volta
  à aba certa mesmo em carga direta — `navigate(-1)` não garante isso); `h1`
  "Pedido #N" + `OrderStatusBadge`; "Solicitado em dd/mm/aaaa às HH:mm"
  (`formatLocalDateTime`).
- **Coluna principal — card do alimento:** imagem (`object-cover`, ícone
  `ImageOffIcon` no fallback/`onError`, como o F4) ao lado (≥ `sm`) ou acima (<
  `sm`) de: nome, `Badge` da categoria, descrição, e duas informações — "Disponível
  agora" (`food.quantity` + unidade; **rótulo diferente de "Quantidade
  solicitada"** porque `food.quantity` é o estoque atual, já líquido dos aceites)
  e "Validade" (`formatDate`, UTC, como no F4).
- **Coluna lateral:** (1) **Resumo do pedido** — "Quantidade solicitada" em
  destaque (`qty unit`), data, status; (2) **card da outra ponta** — ícone,
  razão social, nome fantasia (se houver), "cidade, UF", descrição. O F8 adiciona
  o card "Ações do pedido" acima/abaixo dessa pilha.
- **Só a contraparte** (como no protótipo): a própria instituição do usuário é
  redundante. A API devolve as duas — trocar para "mostrar as duas" é uma linha.
- **Sem "Ver alimento":** o `GET /foods/:id` dá `404` para alimento vencido/
  inativo, e o detalhe do pedido já traz o alimento por inteiro — o link seria um
  beco sem saída justamente no caso que RF20 protege.
- **Estados:** `Number.isInteger(id)` falso ou `404` → "Pedido não encontrado."
  + "Voltar para pedidos"; outro erro → "Tentar novamente"; carregando → skeleton
  no formato do grid. Chave `['orders', 'detail', id]`.

### 9. Datas: instante em fuso local

`formatLocalDate(iso)` = `toLocaleDateString('pt-BR')` e `formatLocalDateTime(iso)`
= `dd/mm/aaaa às HH:mm` (fuso do navegador). Só `orderDate` usa; `expirationDate`
continua em `formatDate` (UTC). Não se mexe no `formatDate` existente.

### 10. Cache e F8

Todas as chaves novas ficam sob `['orders']`: `list`, `count`, `detail`. O F8
(e o `POST` do F6) invalida o prefixo e tudo — lista, contadores e detalhe —
atualiza; nenhum código do F7 muda para isso. As chaves `in-progress` do F6 não
são reaproveitadas (`pageSize` diferente).

### 11. Limpeza

`route-placeholder.tsx` fica sem uso e é removido. `orders-api.ts` ganha
`OrderDetail`, `ORDER_STATUSES` (na ordem das abas), `isOrderStatus`,
`listOrders({ status, page, pageSize })` e `getOrder(id)`; `listOrdersByStatus`
do F6 continua como está.

## Risks / Trade-offs

- **`tr` clicável não é semântico** → o botão-link "Ver detalhes" por linha é o
  caminho acessível; o clique na linha é conveniência de mouse. No mobile o
  cartão é um `Link` real.
- **Coluna Status redundante com a aba** → aceito: mantém o protótipo e as
  referências; custo é uma coluna estreita.
- **Contadores = 4 requests a mais** → `pageSize: 1`, em paralelo, cacheados
  30 s; mostram o dado do último fetch (podem ficar 30 s defasados até o F8
  invalidar — só o F8 muda pedidos).
- **`food.quantity` do detalhe é o estoque atual, não o do momento do pedido** →
  rotulado "Disponível agora" para não ser lido como a quantidade do pedido;
  a quantidade do pedido vem de `order.quantity`.
- **Fuso local para `orderDate`** → um pedido feito às 23h30 aparece com a data
  do dia local, não UTC; é o comportamento esperado por quem usa. Testar perto da
  meia-noite no E2E.
- **Variante `line` no `tabs.tsx` compartilhado** → aditiva; hoje nenhum
  componente do projeto importa `ui/tabs`, então nada muda de aparência. O
  gatilho reage ao `data-variant` da lista por seletor de grupo nomeado
  (`group/tabs-list`), sem contexto React.
- **Refatorar a paginação do feed** → risco de regressão no F4; mitigado por ser
  extração literal e por checagem no browser (paginar, voltar, `page` na URL).
- **Protótipo diverge** (status, sem busca/timeline/contato/ações, sem miniatura,
  tabs sublinhadas, "Disponível agora") → aceito e registrado em
  `docs/PLANO-FRONTEND.md`; `.pen` não é sincronizado.
