## Why

O F7 deixou os pedidos **visíveis** (`/pedidos` e `/pedidos/:id`), mas nada
neles é acionável: o estabelecimento vê um pedido `Pendente` e não consegue
aceitá-lo ou rejeitá-lo, e a entidade vê um pedido `Aceito` e não consegue
confirmar que recebeu o alimento. RF16, RF17 e RF18 já estão completos e
testados no backend (specs `pedidos/aceite`, `pedidos/rejeicao` e
`pedidos/recebimento`, `PATCH /api/orders/:id/accept|reject|receive`), mas sem
tela o funil de doação para em `Pendente` — o pedido nunca é reservado, nunca
libera a vaga do limite de 10 (RF15) e nunca vira `Recebido`. O F8 fecha o MVP
do lado do frontend.

## What Changes

- **Card "Ações do pedido"** (`OrderActionsCard`) no topo da coluna lateral do
  detalhe `/pedidos/:id`, copiado do card de ações dos frames Pencil `NYKRt`
  (estabelecimento) e `I0EByf` (entidade) e recortado para o MVP. O que ele
  mostra depende de **papel × status**:

  | Papel | Pendente | Aceito | Rejeitado | Recebido |
  |---|---|---|---|---|
  | Estabelecimento | **Aceitar** / **Rejeitar** | aguardando a entidade | encerrado | encerrado |
  | Entidade | aguardando o estabelecimento | **Confirmar recebimento** | encerrado | encerrado |

  Onde não há ação, o card vira uma linha de situação ("Situação do pedido")
  — sem botão desabilitado.
- **Diálogo de confirmação** (`Dialog` shadcn, `OrderActionDialog`) para as
  três ações, todas irreversíveis no MVP (não há cancelamento nem "desfazer"):
  - *Aceitar* — explica a reserva ("8 kg de Arroz Integral ficam reservados; o
    estoque disponível passa de 50 kg para 42 kg").
  - *Rejeitar* — botão destrutivo; "o estoque não é alterado"; **sem campo de
    motivo** (RF17).
  - *Confirmar recebimento* — "o pedido é encerrado como Recebido"; texto de
    irreversibilidade exigido pelo plano do F8.
- **Aviso proativo de estoque** no card do estabelecimento: se a quantidade
  atual do alimento é menor que a do pedido, o card avisa e desabilita
  "Aceitar" (o "Rejeitar" continua). Consultivo — o backend decide.
- **Tratamento de erros**:
  - `409` (o estado mudou por outra aba/pessoa, ou o aceite não fecha): fecha o
    diálogo, **recarrega** o pedido e mostra um toast com a causa —
    "já foi atualizado", "estoque insuficiente" ou "alimento indisponível" —
    deduzida do pedido recarregado (o `accept` tem três causas de `409` sem
    `code`; ver `design.md`).
  - `404`: toast "Pedido não encontrado" e volta para `/pedidos`.
  - Falha de rede/`5xx`: o diálogo fica aberto com um aviso e "Tentar de novo".
- **Sucesso**: fecha o diálogo, toast de confirmação, permanece no detalhe (o
  selo e o card já refletem o novo status) e invalida `['orders']`; o aceite
  invalida também `['foods']`/`['food']` (o estoque mudou). Listas, contadores
  das abas, "Disponível agora" e o limite de 10 pedidos do F6 se atualizam
  sozinhos.
- **Removido do protótipo** (fora do MVP): "Rejeitar com um motivo", "Cancelar
  pedido", "Histórico do pedido", "Ver perfil", contato/WhatsApp, o status
  "Doado" (é "Recebido") e o botão **"Aceitar" na linha da tabela** (ver
  `design.md`: a listagem continua só de leitura).
- **Sem mudança de backend.**

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

Nenhuma. Change puramente de frontend: o comportamento de RF16/RF17/RF18 já
está especificado em `pedidos/aceite`, `pedidos/rejeicao` e
`pedidos/recebimento` e não muda — por isso o `.openspec.yaml` declara
`skip_specs: true` (mesma prática das changes `frontend-*` sem backend).

## Impact

- **Código novo** em `frontend/src/features/orders/`: `order-actions.ts`
  (papel × status → ações + textos), `use-order-action.ts` (mutação +
  invalidação + tratamento de erro), `order-action-dialog.tsx`,
  `order-actions-card.tsx` (+ `acceptOrder`/`rejectOrder`/`receiveOrder` em
  `orders-api.ts`).
- **Código alterado**: `features/orders/order-detail-page.tsx` (encaixa o
  card no topo da coluna lateral).
- **Docs**: `docs/PLANO-FRONTEND.md` (F8 → feito, com as divergências do
  protótipo; a nota de "ações" do F7 deixa de ser pendência).
- **Backend / API / dependências**: nenhuma mudança; nenhuma dependência nova
  (usa `Dialog`, `Alert`, `Button`, `sonner` e React Query já instalados).
