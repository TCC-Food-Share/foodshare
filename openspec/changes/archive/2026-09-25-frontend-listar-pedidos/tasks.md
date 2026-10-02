## 1. Base compartilhada

- [x] 1.1 `frontend/src/lib/format.ts`: acrescentar `formatLocalDate(iso)`
      (`toLocaleDateString('pt-BR')`, fuso do navegador) e
      `formatLocalDateTime(iso)` (`dd/mm/aaaa às HH:mm`, fuso do navegador).
      `formatDate` (UTC) fica como está. Verificar: `tsc -b` passa;
      `formatLocalDateTime('2026-04-07T17:32:00.000Z')` no console do browser
      devolve `07/04/2026 às 14:32` em America/Sao_Paulo.
- [x] 1.2 `frontend/src/components/pagination-bar.tsx`: extrair de
      `features/foods/feed-page.tsx` a função `pageWindow` e o bloco
      `Pagination…` para `PaginationBar({ page, totalPages, onPageChange })`
      (renderiza `null` se `totalPages <= 1`); `feed-page.tsx` passa a usá-lo e
      perde `pageWindow` e os imports de `pagination` que sobrarem. Verificar:
      `tsc -b` passa; extração literal — o feed pagina igual (conferido no 6.2).
- [x] 1.3 `frontend/src/components/ui/tabs.tsx`: `TabsList` ganha
      `variant?: 'default' | 'line'` (cva; `default` = classes atuais,
      intocadas), grava `data-variant` e vira `group/tabs-list`; o `TabsTrigger`
      reage por `group-data-[variant=line]/tabs-list:` (sem contexto nem prop
      repetida). `line`: lista `w-full justify-start gap-1 overflow-x-auto
      rounded-none border-b bg-transparent p-0`; gatilho `flex-none rounded-none
      border-0 border-b-2 border-transparent px-3 py-2.5` com
      `data-[state=active]:border-primary data-[state=active]:text-foreground
      data-[state=active]:bg-transparent data-[state=active]:shadow-none` (e os
      resets `dark:` equivalentes, já que o gatilho atual define
      `dark:data-[state=active]:bg-input/30`).
- [x] 1.4 `frontend/src/features/orders/orders-api.ts`: `ORDER_STATUSES:
      OrderStatusName[]` (Pendente, Aceito, Rejeitado, Recebido — ordem das
      abas) e `isOrderStatus(value): value is OrderStatusName`; tipos
      `OrderInstitution` (`id`, `companyName`, `tradeName: string | null`,
      `description`, `city`, `state`) e `OrderDetail` (`id`, `quantity`,
      `orderDate`, `status`, `food { id, image: string | null, name, quantity,
      quantityUnit, description, expirationDate, category { id, name }, status
      { id, name } }`, `establishment`, `beneficiaryEntity`);
      `listOrders({ status, page, pageSize })` → `GET /orders` (`PaginatedOrders`)
      e `getOrder(id)` → `GET /orders/:id`. `listOrdersByStatus` e o resto do
      F6 não mudam. Verificar: `tsc -b`.

## 2. Selo de status e contadores

- [x] 2.1 `frontend/src/features/orders/order-status-badge.tsx`:
      `OrderStatusBadge({ status, className })` sobre o `Badge` `outline`,
      `rounded-full`, com ponto (`size-2 rounded-full`) + nome. Cores da
      tabela da Decisão 7: Pendente `warning`, Aceito `primary`, Rejeitado
      `destructive`, Recebido `green` com variante `dark:`. Verificar: os quatro
      estados legíveis em claro e escuro (checagem visual no 6.3).
- [x] 2.2 `frontend/src/features/orders/use-order-counts.ts`: `useOrderCounts()`
      com `useQueries` — por status de `ORDER_STATUSES`, `listOrders({ status,
      page: 1, pageSize: 1 })`, chave `['orders', 'count', status]` — devolvendo
      `Record<OrderStatusName, number | undefined>` (`undefined` enquanto
      carrega ou se falhar; usa `data.total`).

## 3. Listagem `/pedidos`

- [x] 3.1 `frontend/src/features/orders/orders-empty-state.tsx`:
      `OrdersEmptyState({ status, role })` — ícone (`InboxIcon`), título e uma
      linha por status/papel (textos da Decisão 5); só `Pendente` + `beneficiary`
      traz o botão "Ver alimentos" (`Button asChild` + `Link to="/feed"`).
- [x] 3.2 `frontend/src/features/orders/orders-table.tsx`: `OrdersTable({
      orders, role })` com o `Table` shadcn dentro de contêiner
      `hidden md:block` (borda, `rounded-lg`, `overflow-hidden`, cabeçalho
      `bg-muted/50`); colunas da Decisão 3 (Alimento com "Pedido #N" abaixo,
      Quantidade à direita via `formatQuantity` + unidade, Data via
      `formatLocalDate`, Status via `OrderStatusBadge`, coluna da outra ponta
      conforme `role`, Ações); `TableRow` clicável (`onClick` → `navigate`,
      `cursor-pointer`) e botão-link "Ver detalhes" (`Button variant="ghost"
      size="icon" asChild` + `Link` + `EyeIcon`, `aria-label` com o número);
      `<caption className="sr-only">`.
- [x] 3.3 `frontend/src/features/orders/order-cards.tsx`: `OrderCards({
      orders, role })` em `ul.md:hidden` — cada item é um `Link` a
      `/pedidos/:id` com nome do alimento, "Pedido #N · dd/mm/aaaa", `qty unit`,
      instituição da outra ponta e `OrderStatusBadge` à direita.
- [x] 3.4 `frontend/src/features/orders/orders-page.tsx`: `OrdersPage` —
      título/subtítulo por `role`; `status` (`isOrderStatus`, senão `Pendente`)
      e `page` de `useSearchParams`; `Tabs variant="line"` controlado (mudar de
      aba → `setSearchParams({ status })`, sem `page`) com um gatilho por status
      + chip de `useOrderCounts` (ativo `bg-primary text-primary-foreground`,
      demais `bg-muted text-muted-foreground`); `useQuery` `['orders', 'list',
      { status, page }]` com `ORDERS_PAGE_SIZE = 10` e **sem**
      `keepPreviousData`; estados (5 `Skeleton` de linha / erro com "Tentar
      novamente" / `OrdersEmptyState`); com dados, `OrdersTable` + `OrderCards`
      e rodapé "Mostrando X–Y de N pedidos" + `PaginationBar`; `data.length ===
      0 && total > 0 && page > 1` → `Navigate replace` para a última página.
      Verificar: `tsc -b`; no browser, a aba e a página sobrevivem a F5.

## 4. Detalhe `/pedidos/:id`

- [x] 4.1 `frontend/src/features/orders/order-detail-page.tsx`:
      `OrderDetailPage` — id via `useParams` + `Number.isInteger` (senão "Pedido
      não encontrado."); `useQuery` `['orders', 'detail', id]`; skeleton no
      formato do grid, `404` → "Pedido não encontrado." + "Voltar para pedidos",
      outro erro → "Tentar novamente"; cabeçalho (link "← Pedidos" para
      `/pedidos?status=<status>`, `h1` "Pedido #N" + `OrderStatusBadge`,
      "Solicitado em" via `formatLocalDateTime`); grid `lg:grid-cols-[1fr_360px]`:
      card do alimento (imagem com fallback `ImageOffIcon`/`onError`, nome,
      categoria, descrição, "Disponível agora" e "Validade" via `formatDate`) e
      coluna lateral com "Resumo do pedido" (quantidade solicitada em destaque,
      data, status) e card da outra ponta ("Estabelecimento doador" /
      "Entidade beneficiária solicitante" conforme `role`: razão social, nome
      fantasia se houver, "cidade, UF", descrição). **Sem** botões de ação,
      histórico, contato, "Ver alimento" ou "Ver perfil". Se o arquivo passar de
      ~250 linhas, extrair os cards para `order-detail-cards.tsx`.

## 5. Rotas e limpeza

- [x] 5.1 `frontend/src/app/router.tsx`: `/pedidos` → `<OrdersPage />`,
      `/pedidos/:id` → `<OrderDetailPage />`; remover o import de
      `RoutePlaceholder` e apagar `frontend/src/app/route-placeholder.tsx`
      (confirmar com `grep` que nada mais o usa). Verificar: `tsc -b`.

## 6. Verificação

- [x] 6.1 `cd frontend && npx tsc -b`, `npm run lint:check` e
      `npm run format:check` limpos. **Não** rodar `npm run lint` (tem
      `--fix`) com o dev server ligado — deixa o módulo vazio/tela branca (se
      rodar, `touch` nos arquivos alterados e conferir com `curl`). Sem `npm run
      build` em `backend/` com `start:dev` ligado.
- [x] 6.2 E2E no browser (`playwright-cli`, dev server + backend locais; dados
      de teste criados pela API — as transições `accept`/`reject`/`receive` do F8
      ainda não têm tela, então usar `PATCH` com o cookie do estabelecimento para
      montar os quatro status): entidade e estabelecimento vendo título, coluna
      da outra ponta e contadores certos; troca de aba (URL `?status=`, `page`
      zerada), `?status=Invalido` → Pendente, F5 mantém aba/página; paginação com
      mais de 10 pedidos num status (Rejeitado, recriando o pedido após rejeitar)
      e `page` além do fim → última página; vazio por aba e papel (CTA "Ver
      alimentos" só na entidade/Pendente); clique na linha e no olho → detalhe;
      detalhe com "Disponível agora" ≠ "Quantidade solicitada" após um `accept`,
      link "← Pedidos" voltando à aba do status, cartão da outra ponta só com
      razão social/fantasia/cidade-UF/descrição; `/pedidos/999999` e
      `/pedidos/abc` → "Pedido não encontrado."; pedido de outra instituição →
      404; erro de rede → "Tentar novamente"; topbar com o item "Pedidos" ativo em
      `/pedidos/:id`; atalho "Ver meus pedidos" do F6 abre `/pedidos`; 400 px
      (cartões, abas rolando, sem rolagem horizontal da página) e 1280 px
      (tabela); console limpo. **Regressão do F4:** feed pagina, filtra e mantém
      `page` na URL como antes.
- [x] 6.3 Comparar as telas reais com os frames `MyFw0`, `vRf3b`, `NYKRt` e
      `I0EByf` (screenshot do `mcp__pencil__get_screenshot` × screenshot do app)
      e corrigir deriva visual acionável (espaçamento, cores dos selos em claro e
      escuro, hierarquia de tipografia); as divergências **intencionais** são as
      listadas em `docs/PLANO-FRONTEND.md` (7.1).

## 7. Documentação

- [x] 7.1 `docs/PLANO-FRONTEND.md`: linha do F7 na tabela → `✅ feito (change
      frontend-listar-pedidos)`; bloco **Feito** sob a seção F7 (rotas, abas +
      contadores, tabela/cartões, detalhe, selo, `Tabs` `line`, paginação
      extraída, datas em fuso local, sem mudança de backend, resultado do E2E) e
      **Protótipo Pencil — divergência aceita, não sincronizado** (status do MVP,
      sem busca/timeline/contato/cancelar/perfil/ações, sem miniatura do
      alimento, abas sublinhadas, "Disponível agora", só a contraparte, sem
      "Ver alimento"); tirar da nota do F6 o trecho "ainda `RoutePlaceholder` até
      o F7".
