## Context

Ver `proposal.md` — "Why". Estado herdado (F0–F7, em `develop`):

- `features/orders/order-detail-page.tsx` (F7): coluna lateral do detalhe =
  `OrderSummaryCard` + `CounterpartCard` (em `order-detail-cards.tsx`), dados de
  `useQuery(['orders', 'detail', id])` → `getOrder`. A página já lê `role` de
  `useAuth()`. O F7 deixou a coluna lateral **empilhável de propósito** para o
  F8 encaixar o card de ações.
- `features/orders/orders-api.ts`: `Order` (item de listagem), `OrderDetail`,
  `OrderStatusName`, `listOrders`, `getOrder`, `conflictCode`. **Sem** funções
  de transição. `lib/api.ts` já tem `api.patch(path, body?)`.
- Padrão de modal do projeto (F5/F6, `create-order-dialog.tsx`): `Dialog`
  controlado por `open`/`onOpenChange`, estado de erro local (`serverError`),
  `useMutation` + `mutateAsync` dentro de `try/catch`, erro de rede como banner
  no corpo do modal, `toast.success`/`toast.error` (sonner, sempre no azul do
  Food Share via `--primary`), reset ao abrir ajustando estado **durante o
  render**. O F8 segue o mesmo molde.
- React Query: chaves do F7 sob `['orders']` (`list`, `count`, `detail`) e do F6
  (`in-progress`); `['foods']` e `['food', id]` do feed/detalhe do alimento.
  `staleTime` 30 s, sem retry em 4xx, `401` tratado centralmente.
- shadcn presente: `dialog`, `alert` (`default`/`destructive`/`warning`),
  `button` (`destructive` inclusive). **Não há** `alert-dialog`; o `Dialog`
  basta e evita uma dependência nova (`@radix-ui/react-alert-dialog`).

**Contrato do backend** (sem mudança nesta change) — `PATCH /api/orders/:id/…`,
sem corpo, resposta `200` = `OrderResponseDto` (formato de **listagem**, não o
do detalhe):

| Rota | Quem | Transição | `404` | `409` (mensagens em inglês, **sem `code`**) |
|---|---|---|---|---|
| `accept` | estabelecimento dono | Pendente → Aceito; subtrai a quantidade do estoque do alimento | sem estabelecimento / pedido inexistente ou de outro | `Order is not pending.` · `Linked food is no longer available.` · `Insufficient food quantity to accept this order.` |
| `reject` | estabelecimento dono | Pendente → Rejeitado; estoque intocado; **sem motivo** | idem | `Order is not pending.` |
| `receive` | entidade dona | Aceito → Recebido; estoque intocado | sem entidade / pedido inexistente ou de outra | `Order is not accepted.` |

- Concorrência resolvida no servidor (compare-and-swap no `updateMany`): duas
  ações simultâneas no mesmo pedido → uma vence, a outra recebe `409`.
- "Alimento indisponível" (`findAvailableById`) = status `Ativo`, não excluído,
  não vencido. O detalhe do pedido **não** filtra por isso (registro histórico),
  então o cliente não tem um campo que diga "vencido/inativo" — só a data de
  validade e o estoque.
- `POST /orders` ganhou `code` nos `409` no F6 (`bloqueio-pedido-duplicado`);
  as rotas de transição não têm.

**Protótipo Pencil** (lido via MCP `pencil`, `Get(document, …, {depth: 0})`):

- `NYKRt` (estabelecimento): card "Ações do pedido" — texto "Este pedido aguarda
  sua decisão. Aceite para iniciar o processo de doação ou rejeite com um
  motivo."; botão cheio verde "Aceitar pedido"; botão contornado "Rejeitar
  pedido". É o último card da coluna direita.
- `vRf3b` (lista do estabelecimento): por linha, olho + botão verde-claro
  "Aceitar".
- `I0EByf` (entidade): card "Ações do pedido" — botão verde "Confirmar
  recebimento", "Cancelar pedido" (contornado) e o texto "Ao confirmar o
  recebimento, esta ação não poderá ser desfeita e o pedido ficará como Doado."
  Uma variante do frame traz uma caixa amarela "Confirmar que você recebeu o
  alimento? Esta ação não pode ser desfeita."
- **Não há frame** de diálogo de confirmação para nenhuma das três ações.

### Pesquisa Refero

Buscas nas telas do Refero (MCP `refero`) para os diálogos de confirmação e o
detalhe acionável:

- **Confirmação de ação irreversível** — On "Cancel order" (`d03199f2`), Endless
  "Delete board" (`2a41fd88`), Supercut, Cushion: modal pequeno e centrado;
  título que **nomeia a ação e o objeto**; **uma frase de consequência** ("isto
  não pode ser desfeito"); rodapé alinhado à direita com **Cancelar** (contornado
  ou neutro) e a **confirmação sólida**, em vermelho quando destrói. → mesmo
  molde: título "Aceitar o pedido #N?", frase de consequência, `Cancelar` +
  confirmação (primária; `destructive` só no Rejeitar).
- **Detalhe de pedido com ações** — a busca por telas de "aprovar/recusar" no
  Refero trouxe pouco de direto (resultados de configuração e exclusão de
  conta); a referência aqui é o **próprio protótipo** (`NYKRt`/`I0EByf`): a
  decisão fica em um **card na lateral**, junto do resumo. O que o Refero sugere
  de geral — estado terminal como texto de situação, não como botão morto — está
  no card (Decisão 2).
- **Lista com fluxo de aprovação** — Mercury "Expenses" (`cc994704`, lida só pela
  descrição): tabela com selos de status para **triagem**, com o detalhe por
  item. Coerente com manter a lista só de leitura (Decisão 6).

## Goals / Non-Goals

**Goals:**

- RF16, RF17 e RF18 acionáveis no detalhe, para os dois papéis, com confirmação
  explícita e feedback claro do que mudou (status, estoque, toast).
- Nenhuma ação ambígua: só aparece o que o papel × status permite; o que o
  backend pode recusar (`409`) tem mensagem com causa.
- Manter cache coerente: lista, contadores, detalhe, feed, detalhe do alimento
  e limite de 10 pedidos do F6 refletem a transição sem F5.

**Non-Goals:**

- Ações na tabela/cartões da listagem, ações em lote, atualização otimista.
- Motivo de rejeição, cancelamento, "desfazer", histórico/timeline.
- Notificar a outra parte (e-mail, push) — o serviço de e-mail é pós-MVP.
- Mudança de backend (p. ex. `code` nos `409` do `accept`).
- Sincronizar o `.pen` — o código é a fonte da verdade (precedente F2–F7).

## Decisions

### 1. Tabela papel × status em uma função pura

`order-actions.ts` concentra a regra: `availableActions(role, status)` devolve
`['accept', 'reject']` (estabelecimento + `Pendente`), `['receive']` (entidade +
`Aceito`) ou `[]`. O card e o diálogo só consomem isso — nada de `if (role === …
&& status === …)` espalhado. `OrderAction = 'accept' | 'reject' | 'receive'` é a
chave de tudo o mais (rótulos, textos, chamada de API, status esperado).

*Alternativa:* condicionais inline no card — mais curto hoje, mas o F8 tem três
ações × dois papéis × quatro status; a tabela em um lugar só é revisável.

### 2. Card "Ações do pedido" no topo da lateral, texto de situação nos demais casos

`OrderActionsCard({ order, role })`, **primeiro** da coluna lateral (o
protótipo o põe por último; quem abre um pedido pendente veio para decidir, então
a decisão sobe). Conteúdo por papel × status:

| | Pendente | Aceito | Rejeitado | Recebido |
|---|---|---|---|---|
| **Estabelecimento** | "Este pedido aguarda a sua decisão. Ao aceitar, a quantidade solicitada fica reservada para a entidade." + `Aceitar pedido` / `Rejeitar pedido` | "Você aceitou este pedido. Aguardando a entidade confirmar o recebimento." | "Você rejeitou este pedido." | "A entidade confirmou o recebimento. Pedido encerrado." |
| **Entidade** | "Aguardando a resposta do estabelecimento." | "Pedido aceito: a quantidade está reservada para a sua entidade. Quando receber o alimento, confirme o recebimento." + `Confirmar recebimento` | "O estabelecimento rejeitou este pedido." | "Você confirmou o recebimento. Pedido encerrado." |

Título "Ações do pedido" quando há botões; "Situação do pedido" quando não há.
Sem botão desabilitado nem "Cancelar pedido". Não se instrui a "combinar a
retirada" com contato: o detalhe (RF20) não expõe contato e o WhatsApp é fora do
escopo.

Botões: `Aceitar pedido` e `Confirmar recebimento` na variante `default`
(primária, azul); `Rejeitar pedido` `outline` com texto/borda `destructive`. O
protótipo usa verde no "Aceitar"; aqui fica no azul do Food Share (o selo
`Aceito` do F7 também é azul — a ação e o estado resultante têm a mesma cor) e
não se cria um botão "success" só para isso. `rounded-md`, como nos demais.

*Alternativa:* botões no cabeçalho ao lado do título (padrão Shopify). Descartada
para manter o protótipo (card lateral) e porque o card comporta o texto de
consequência.

### 3. Confirmação em `Dialog` para as três ações

`OrderActionDialog({ order, action, open, onOpenChange })`. Molde do F6:
`DialogHeader` (ícone em círculo + título + descrição), corpo com a consequência,
`DialogFooter` com `Cancelar` (`outline`) e a confirmação. Textos:

- **Aceitar** — título "Aceitar o pedido #N?"; "**8 kg** de **Arroz Integral**
  ficam reservados para **{entidade}**. O estoque disponível passa de **50 kg** para
  **42 kg**. Esta ação não pode ser desfeita." (resto = estoque − pedido,
  arredondado a 2 casas). Confirmar: `Aceitar pedido`.
- **Rejeitar** — "Rejeitar o pedido #N?"; "O pedido será encerrado como
  Rejeitado e o estoque não muda. Esta ação não pode ser desfeita." Confirmar
  `destructive`: `Rejeitar pedido`. **Sem** campo de motivo (RF17).
- **Confirmar recebimento** — "Confirmar o recebimento?"; "Você confirma que
  recebeu **8 kg** de **Arroz Integral**. O pedido será encerrado como Recebido.
  Esta ação não pode ser desfeita." Confirmar: `Confirmar recebimento`.

O foco inicial cai em `Cancelar` (primeiro focável no DOM; o "X" do shadcn vem
depois) — padrão seguro para ação irreversível, verificado no E2E. Enquanto a
mutação corre: ambos os botões desabilitados, confirmação com `Loader2Icon`, e
`onOpenChange` ignora fechar (Esc/overlay/X) para não deixar a ação "fantasma".
O texto do diálogo é **congelado na abertura**: o refetch que segue a ação muda o
estoque com o diálogo ainda na tela, e recalcular o texto o faria mostrar
números novos ("passa de 42 para 34 kg") antes de fechar.

*Alternativa:* `AlertDialog` (semântica de `alertdialog`) — exigiria instalar
`@radix-ui/react-alert-dialog`; o `Dialog` com título/descrição e foco em
"Cancelar" cobre o mesmo risco sem dependência nova.

### 4. Um hook, uma mutação, três ações

`useOrderAction(order)` → `{ execute(action): Promise<'done' | 'conflict' | 'not-found' | 'retry'>, isPending }`
(`isPending` cobre a chamada **e** o refetch que a segue).
Chamada por `action`: `accept` → `PATCH …/accept`, etc. (`acceptOrder`/
`rejectOrder`/`receiveOrder` em `orders-api.ts`, todas `api.patch<Order>`).

- **Sucesso:** `await queryClient.invalidateQueries({ queryKey: ['orders'] })`
  (o detalhe ativo recarrega antes de o diálogo fechar — sem piscar o estado
  velho no card); no `accept`, também `['foods']` e `['food']` (estoque mudou,
  sem `await`). `toast.success` ("Pedido aceito. Quantidade reservada." /
  "Pedido rejeitado." / "Recebimento confirmado. Pedido encerrado.") e devolve
  `'done'`. Depois de fechar, o foco vai para o card (`tabIndex={-1}` + ref) —
  os botões que o tinham desapareceram com a mudança de status. Ao **cancelar**, o
  foco volta ao botão que abriu o diálogo: eles não são um `DialogTrigger` do
  Radix, que sem isso deixaria o foco no `<body>` (o card intercepta
  `onCloseAutoFocus`).
- **`409`:** `void invalidateQueries(['orders'])`, refaz o detalhe com
  `queryClient.fetchQuery({ queryKey: ['orders','detail',id], queryFn: getOrder,
  staleTime: 0 })` e classifica (Decisão 5); `toast.error` com a causa e devolve
  `'conflict'`.
- **`404`:** `toast.error('Pedido não encontrado.')`, invalida `['orders']`,
  devolve `'not-found'` e o chamador navega para `/pedidos`.
- **Demais (rede/`5xx`):** devolve `'retry'`; o diálogo mostra `Alert destructive`
  ("Não foi possível {aceitar|rejeitar|confirmar o recebimento do} pedido. Tente
  novamente em instantes.") e mantém o botão para nova tentativa.

Toasts de erro seguem o precedente do F6 (`toast.error`); o sonner do projeto
pinta tudo no azul do Food Share.

### 5. Causa do `409` deduzida do pedido recarregado — sem mexer no backend

O `accept` tem três `409` sem `code`, e o projeto decidiu no F6 nunca ler a
mensagem em inglês. Depois do `fetchQuery`, a causa sai dos dados:

1. status do pedido ≠ esperado (`Pendente` para `accept`/`reject`, `Aceito` para
   `receive`) → **"Este pedido já foi atualizado. Confira a situação atual."**
   (vale para as três ações; é o único `409` de `reject` e `receive`);
2. `accept` e `Number(food.quantity) < Number(quantity)` → **"Estoque
   insuficiente para aceitar este pedido."**;
3. `accept`, ainda `Pendente` e estoque suficiente → só sobra "alimento
   indisponível" → **"O alimento deste pedido não está mais disponível (vencido,
   inativo ou removido). Você ainda pode rejeitar o pedido."**;
4. se o refetch falhar → **"Não foi possível concluir a ação. O pedido pode ter
   sido atualizado."**

A dedução é exaustiva porque os três `409` do `accept` são exatamente esses;
comentário curto na função aponta `orders.service.ts` (regra espelhada — precisa
ficar em sincronia).

*Alternativas:* (a) adicionar `code` aos `409` do `accept` (backend + delta em
`pedidos/aceite`) — mais robusto, mas amplia a change para full-stack e sai do
`skip_specs`; fica como follow-up se a dedução incomodar; (b) mensagem única
genérica — perde a informação mais útil (o estabelecimento ainda pode rejeitar
quando o problema é o estoque).

### 6. A listagem continua só de leitura

O protótipo `vRf3b` põe "Aceitar" na linha; o plano diz "opcionalmente na
listagem". **Não entra:** para aceitar bem o estabelecimento precisa ver o
estoque atual contra a quantidade pedida ("Disponível agora" × "Quantidade
solicitada"), e a listagem não tem esse dado; um botão irreversível numa linha
sem contexto convida ao clique errado. A lista serve para triagem (referência
Mercury) e a decisão acontece no detalhe. As colunas "Ações" (olho) e o restante
da tabela/cartões **não mudam**.

### 7. Aviso proativo de estoque insuficiente (consultivo)

No card do estabelecimento com pedido `Pendente`, se `Number(food.quantity) <
Number(order.quantity)`: `Alert variant="warning"` ("Estoque insuficiente para
aceitar: disponível {X}, pedido {Y}. Você ainda pode rejeitar o pedido.") e
`Aceitar pedido` desabilitado. Mesmo espírito do limite do F6: dado que o cliente
já tem, decisão final do backend (se o estoque mudar entre a leitura e o clique,
o `409` da Decisão 5 cobre). O caso "alimento vencido/inativo" **não** ganha
aviso proativo — exigiria replicar a regra de dia/fuso do backend; fica só no
`409`.

### 8. Encaixe na página e limpeza de cache

`order-detail-page.tsx` renderiza `<OrderActionsCard order role />` antes do
`OrderSummaryCard`, e passa o callback de `404` (`navigate('/pedidos')`).
Nenhuma outra tela muda. A invalidação por prefixo `['orders']` atualiza, sem
código extra, as abas e contadores (F7), o aviso de limite e a checagem de
duplicidade (F6, chaves `in-progress`) e, via `['foods']`/`['food']` no aceite, o
feed e o detalhe do alimento.

## Risks / Trade-offs

- **Dedução do `409` acopla o cliente à regra do backend** → função pura única,
  cobre exatamente as três causas conhecidas, com fallback genérico e comentário
  de sincronia; upgrade natural é o `code` no backend (follow-up).
- **Ação irreversível com um clique errado** → diálogo com consequência escrita,
  foco inicial em `Cancelar`, botão destrutivo só no Rejeitar, botões desabilitados
  durante o envio.
- **Foco perdido depois da ação** (os botões somem) → foco programático no card
  (`tabIndex={-1}`) e, ao cancelar, de volta ao botão de origem; conferido no E2E
  com `document.activeElement`.
- **Card no topo diverge do protótipo (último card)** → decisão de UX
  registrada; troca de ordem é uma linha.
- **Aviso de estoque pode ficar velho** (30 s de `staleTime`) → só consultivo; o
  `409` é a autoridade, e a invalidação pós-ação refaz o detalhe.
- **Toast de erro no azul** (sonner do projeto) → mesma escolha do F6; a causa
  está no texto, não na cor.
- **Sem testes automatizados no frontend** → verificação no browser (E2E com
  dados montados pela API e corrida entre duas sessões para forçar `409`), como
  nas fases anteriores.
- **Protótipo diverge** (azul em vez de verde, sem motivo/cancelar/histórico, sem
  "Aceitar" na linha, card no topo, "Recebido" em vez de "Doado") → aceito e
  registrado em `docs/PLANO-FRONTEND.md`; `.pen` não é sincronizado.
