## Why

F4 entregou o detalhe do alimento com o card "Solicitar doação" para conta de
entidade beneficiária, mas o botão está **desabilitado** — RF14 e RF15 já estão
completos e testados no backend (spec `pedidos/solicitacao`, `POST
/api/orders`), porém nenhuma tela os expõe. Sem o F6 a entidade não consegue
pedir um alimento, o que trava todo o funil de doação: o F7 (listar pedidos) e
o F8 (aceitar/rejeitar/confirmar) não têm o que listar nem o que agir. O F6
fecha esse gap com o modal de solicitação e o tratamento do limite de pedidos
em andamento.

## What Changes

- **Botão "Solicitar doação" habilitado** no detalhe do alimento (só para
  `role === 'beneficiary'`, como já é hoje) — abre o modal de solicitação.
- **Modal de solicitação** (`Dialog` shadcn, copiado do frame Pencil `Modal -
  Solicitar Doação` / `X7Llb6`): cabeçalho com nome do alimento e quantidade
  disponível, caixa "Como funciona o processo", escolha de quantidade
  (total | parcial) e rodapé Cancelar / Enviar solicitação. `POST /api/orders`
  com `{ foodId, quantity }`.
- **Quantidade**: "total" envia `food.quantity`; "parcial" habilita o campo
  numérico (> 0, ≤ quantidade disponível, até 2 casas decimais — mesmas
  regras de `CreateOrderDto`). Melhoria sobre o protótipo (pesquisa Refero): a
  unidade de medida vira sufixo dentro do campo, em vez de ficar só no rótulo.
- **Sucesso**: fecha o modal, toast de confirmação, invalida a query de
  pedidos (`['orders']`). O usuário permanece no detalhe do alimento.
- **Erro de limite (RF15) — ausente no protótipo, desenhado nesta change**
  (não existe frame Pencil para ele), em duas camadas:
  - **Reativa (autoridade)**: `409` do `POST /orders` troca o corpo do modal
    por um estado "Limite de pedidos em andamento atingido" — explica que a
    entidade já tem 10 pedidos em andamento (pendentes ou aceitos), o que
    fazer para liberar espaço (confirmar o recebimento de pedidos aceitos ou
    aguardar a resposta dos pendentes) e oferece o atalho "Ver meus pedidos".
  - **Proativa (consultiva)**: o card do detalhe conta os pedidos em andamento
    (`GET /orders?status=Pendente` + `?status=Aceito`, `pageSize=1`, lendo o
    `total`) e, se já há 10 ou mais, mostra o mesmo aviso e desabilita o
    botão — a entidade não digita uma quantidade para ser recusada depois. Se
    a contagem falhar ou ainda estiver carregando, o botão continua
    habilitado: o backend segue sendo quem decide (o `409` cobre qualquer
    contagem velha).
- **Demais erros do `POST /orders`**: `400` (quantidade acima do disponível
  ou dado inválido) → alerta no modal e recarrega o alimento para atualizar o
  "máx."; `404` (alimento saiu do ar) → toast, fecha o modal e recarrega o
  detalhe; rede/5xx → alerta neutro, mesmo padrão do F5.
- **Caso de borda — alimento com quantidade 0**: o recorte de "disponível" do
  backend (`Ativo`, não excluído, não vencido) não olha a quantidade, então um
  alimento totalmente reservado por pedidos aceitos continua aparecendo. O
  card desabilita o botão com aviso ("sem quantidade disponível") em vez de
  abrir um modal onde nenhuma quantidade seria aceita.
- **REMOVER/AJUSTAR do protótipo** (frame `X7Llb6`, regra "toda tela alinhada
  ao RF"):
  - Passo 3 "os dados de contato são compartilhados…" — RF20 só expõe
    razão social/cidade/UF e não há contato institucional no MVP → passa a
    dizer que a quantidade fica reservada para a entidade no aceite (RF16).
  - Passo 4 "É só comparecer no momento combinado…" — fala de logística fora
    do escopo → passa a orientar a confirmar o recebimento (RF18).
  - Unidade fixa "(unidades)" no rótulo da quantidade → usa `quantityUnit`
    do alimento.

## Capabilities

### New Capabilities

<!-- Nenhuma. -->

### Modified Capabilities

<!-- Nenhuma. `skip_specs: true` no .openspec.yaml.

O comportamento observável de RF14 e RF15 já está descrito e implementado na
spec `pedidos/solicitacao` (changes `solicitacao-pedido` e
`limite-pedidos-em-andamento`): criar o pedido vinculado à entidade da sessão,
validar quantidade contra o estoque, status inicial "Pendente" e recusa por
conflito com 10 ou mais pedidos em andamento. `GET /orders?status=` (F7 no
frontend) já entrega a contagem que a checagem proativa usa, então não há gap
de backend a fechar. O F6 é a **entrega dessas capabilities na superfície de
UI**, mesmo precedente de F1/F2/F5 (`frontend-login`, `frontend-cadastro`,
`frontend-cadastro-alimento`), também `skip_specs`. -->

## Impact

- **Frontend** (único lado afetado):
  - Nova feature `src/features/orders/` (o F7 estende a mesma pasta):
    - `orders-api.ts`: `createOrder(payload)` → `POST /orders`;
      `countOrdersByStatus(status)` → `GET /orders?status=&pageSize=1`
      (retorna `total`); tipo `Order` (`OrderResponseDto`).
    - `use-orders-in-progress.ts`: hook que soma `Pendente` + `Aceito` e
      expõe `count` / `limitReached`; constante `ORDERS_IN_PROGRESS_LIMIT = 10`.
    - `create-order-schema.ts`: fábrica do schema zod (depende da quantidade
      disponível do alimento).
    - `create-order-dialog.tsx`: `Dialog` + `react-hook-form` + estado de
      limite atingido.
    - `order-limit-notice.tsx`: conteúdo do aviso de limite, reusado no modal
      e no card.
    - `request-donation-card.tsx`: card "Interessado neste alimento?"
      extraído do detalhe, com os estados (normal, limite, sem quantidade) e o
      gatilho do modal.
  - `src/features/foods/food-detail-page.tsx`: o bloco inline do card sai e
    entra `<RequestDonationCard food={food} />`.
  - Reaproveitados sem mudança: `dialog`, `form`, `input`, `radio-group`,
    `button`, `sonner`, `ApiError`, `formatQuantity`. O `alert` ganha a variante
    `warning` (`components/ui/alert.tsx`) e o tema o token `--warning`
    (`styles/index.css`) para os avisos de limite. Nenhuma
    dependência nova, nenhum componente shadcn novo.
- **Backend / schema**: nenhuma mudança.
- **Docs**: `docs/PLANO-FRONTEND.md` — marcar F6 como concluída e registrar
  as divergências do protótipo ao final (mesma cadência do F5).
- **Fora do escopo desta change**:
  - Listagem e detalhe de pedidos — F7. O atalho "Ver meus pedidos" do estado
    de limite aponta para `/pedidos`, que segue `RoutePlaceholder` até o F7.
  - Aceitar / rejeitar / confirmar recebimento — F8.
  - Cancelar pedido ou qualquer forma de "encerrar" pelo lado da entidade
    além do que RF18 já prevê — Fora do Escopo do MVP.
  - Endpoint dedicado de contagem de pedidos em andamento — a contagem via
    `GET /orders` basta e evita mudança de backend.
  - Sincronizar o protótipo Pencil (ajustes acima + o estado de limite, que
    não tem frame) — mesmo precedente do F2–F5: código é a fonte da verdade,
    divergência registrada em `docs/PLANO-FRONTEND.md`.
