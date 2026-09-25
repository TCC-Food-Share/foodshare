## Why

F6 deixou a entidade beneficiária criar pedidos (RF14/RF15), mas `/pedidos` e
`/pedidos/:id` ainda são `RoutePlaceholder`: ninguém consegue **ver** o que
pediu (entidade) ou o que recebeu (estabelecimento). RF19 e RF20 já estão
completos e testados no backend (specs `pedidos/listagem` e `pedidos/detalhe`,
`GET /api/orders` e `GET /api/orders/:id`), mas nenhuma tela os expõe. O F7 é
também o pré-requisito do F8 — aceitar, rejeitar e confirmar recebimento
vivem no detalhe (e na listagem) do pedido — e o destino do atalho "Ver meus
pedidos" que o F6 já aponta para `/pedidos`.

## What Changes

- **Listagem `/pedidos`** (`OrdersPage`), copiada dos frames Pencil `MyFw0`
  (entidade) e `vRf3b` (estabelecimento) e recortada para o MVP:
  - Título/subtítulo por papel — entidade: "Meus pedidos"; estabelecimento:
    "Pedidos recebidos" (mesmos rótulos do menu).
  - **Uma aba por status** — Pendente, Aceito, Rejeitado, Recebido (RF19) —,
    cada aba = um `GET /orders?status=`. Sem aba "Todos", sem "Cancelado".
    Aba ativa e página na URL (`?status=&page=`); padrão `Pendente`.
    Contador por aba (4 requisições de `pageSize=1`, só o `total`).
  - Tabela no desktop (Pedido/Alimento, Quantidade, Data, Status, instituição
    da outra ponta, ação "Ver detalhes"); **cartões empilhados** abaixo de
    `md` (RNF01). Linha clicável leva ao detalhe.
  - Rodapé "Mostrando X–Y de N" + paginação (reaproveita o `Pagination` do
    F4, extraído para um componente compartilhado).
  - Estados: carregando (skeleton), erro com "Tentar novamente", vazio por
    aba com texto por papel (a entidade ganha o atalho "Ver alimentos").
- **Detalhe `/pedidos/:id`** (`OrderDetailPage`), copiado dos frames `NYKRt`
  (estabelecimento) e `I0EByf` (entidade) e recortado para RF20:
  - Cabeçalho "Pedido #N" + selo de status + "Solicitado em dd/mm/aaaa às
    HH:mm"; link "← Pedidos" que volta **para a aba do status do pedido**.
  - Card do alimento por inteiro (imagem, nome, categoria, quantidade
    disponível agora + unidade, descrição, validade) — registro histórico,
    aparece mesmo com o alimento indisponível.
  - Card "Resumo do pedido" (quantidade solicitada em destaque, data, status).
  - Card da instituição da outra ponta (entidade vê o estabelecimento;
    estabelecimento vê a entidade): razão social, nome fantasia, cidade/UF,
    descrição — **nada além do que RF20 expõe**.
  - Estados: carregando, `404`/id inválido ("Pedido não encontrado" + voltar),
    erro com "Tentar novamente".
- **Selo de status** (`OrderStatusBadge`) compartilhado por lista e detalhe:
  ponto colorido + texto (Pendente âmbar, Aceito azul, Rejeitado vermelho,
  Recebido verde) — a cor nunca é o único sinal.
- **`Tabs` shadcn ganha a variante `line`** (aba sublinhada, como no protótipo
  e nas referências Refero) em vez do segmento em pílula.
- **Datas de pedido em fuso local**: `orderDate` é um instante, não uma data
  de calendário; `lib/format.ts` ganha `formatLocalDate`/`formatLocalDateTime`
  (o `formatDate` atual força UTC, correto só para `expirationDate`).
- **Removido do protótipo** (fora do MVP, conforme `docs/PLANO-FRONTEND.md`):
  busca livre, aba "Cancelado" e status "Ativo/Em andamento/Doado", "Histórico
  do pedido"/timeline, contato (e-mail/telefone/WhatsApp), "Ver perfil de…",
  "Cancelar pedido", motivo de rejeição, nav "Estabelecimentos/Instituições".
  Também **fora do F7**: os botões Aceitar/Rejeitar/Confirmar recebimento (F8) —
  sem botão desabilitado nem placeholder; o F8 encaixa o card de ações na
  coluna lateral do detalhe.
- **Sem mudança de backend.** `RoutePlaceholder` deixa de ser usado e é
  removido.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

Nenhuma. Change puramente de frontend: o comportamento de RF19/RF20 já está
especificado em `pedidos/listagem` e `pedidos/detalhe` e não muda — por isso o
`.openspec.yaml` declara `skip_specs: true` (mesma prática das changes
`frontend-*` que não tocam o backend).

## Impact

- **Código novo** em `frontend/src/features/orders/`: `orders-page.tsx`,
  `orders-table.tsx`, `order-cards.tsx`, `order-detail-page.tsx`,
  `order-detail-cards.tsx`, `order-status-badge.tsx`, `order-counterpart.ts`,
  `orders-empty-state.tsx`, `use-order-counts.ts` (+ tipos/funções em
  `orders-api.ts`); e `components/pagination-bar.tsx`.
- **Código alterado**: `app/router.tsx` (rotas reais), `components/ui/tabs.tsx`
  (variante `line`), `lib/format.ts`, `features/foods/feed-page.tsx` (passa a
  usar a paginação extraída em `components/`).
- **Removido**: `app/route-placeholder.tsx`.
- **Docs**: `docs/PLANO-FRONTEND.md` (F7 → feito, com as divergências do
  protótipo).
- **Backend / API / dependências**: nenhuma mudança; nenhuma dependência nova
  (shadcn `tabs`, `table`, `pagination`, `badge`, `skeleton` já instalados).
