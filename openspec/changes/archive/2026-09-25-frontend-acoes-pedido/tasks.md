## 1. API e regras de ação

- [x] 1.1 `frontend/src/features/orders/orders-api.ts`: `acceptOrder(id)`,
      `rejectOrder(id)` e `receiveOrder(id)` — `api.patch<Order>(`/orders/${id}/accept|reject|receive`)`
      (sem corpo; resposta no formato de listagem). Nada mais do F6/F7 muda.
      Verificar: `tsc -b`.
- [x] 1.2 `frontend/src/features/orders/order-actions.ts` (funções puras, sem
      React): `OrderAction = 'accept' | 'reject' | 'receive'`;
      `availableActions(role, status)` (estabelecimento + `Pendente` →
      `['accept', 'reject']`; entidade + `Aceito` → `['receive']`; senão `[]`);
      por ação — rótulo do botão, rótulo de confirmação, status esperado
      (`Pendente`/`Pendente`/`Aceito`), chamada de API, mensagem de sucesso e
      verbo da falha; builders de título/descrição do diálogo a partir do
      `OrderDetail` (Decisão 3, incluindo o resto do estoque no aceite,
      `Math.round((estoque - pedido) * 100) / 100` via `formatQuantity`);
      `situationText(role, status)` (tabela da Decisão 2);
      `insufficientStock(order)` (`Number(food.quantity) < Number(quantity)`);
      `conflictMessage(action, freshOrder | null)` (Decisão 5, com fallback
      genérico e um comentário curto apontando `orders.service.ts` — regra
      espelhada). Verificar: `tsc -b`; textos exatamente os do `design.md`.

## 2. Mutação

- [x] 2.1 `frontend/src/features/orders/use-order-action.ts`:
      `useOrderAction(order)` → `{ execute(action), isPending }` sobre
      `useMutation`; `execute` devolve `'done' | 'conflict' | 'not-found' | 'retry'`
      (`isPending` cobre a chamada e o refetch seguinte) e trata: sucesso
      (`await invalidateQueries(['orders'])`; no `accept`, também `['foods']` e
      `['food']` sem `await`; `toast.success`), `409` (`invalidateQueries`,
      `fetchQuery` do detalhe com `staleTime: 0`, `toast.error(conflictMessage)`),
      `404` (`toast.error('Pedido não encontrado.')`, invalida `['orders']`,
      devolve `'not-found'` para o chamador navegar) e demais falhas
      (`'retry'`). O `401` segue centralizado no `query-client`. Verificar:
      `tsc -b`.

## 3. Interface

- [x] 3.1 `frontend/src/features/orders/order-action-dialog.tsx`:
      `OrderActionDialog({ order, action, open, onOpenChange, onNotFound })` —
      `Dialog` no molde do F6 (ícone em círculo, título, descrição, rodapé);
      `Cancelar` (`outline`) + confirmação (`default`; `destructive` no
      `reject`) com `Loader2Icon` enquanto envia; ambos desabilitados e
      `onOpenChange` ignora fechar durante o envio; banner `Alert destructive`
      para `'retry'` (texto com o verbo da ação); estado de erro limpo ao abrir,
      ajustando estado durante o render (padrão do F5/F6). Sem campo de motivo.
      Verificar: foco inicial em `Cancelar`.
- [x] 3.2 `frontend/src/features/orders/order-actions-card.tsx`:
      `OrderActionsCard({ order, role })` — título "Ações do pedido" com botões
      ou "Situação do pedido" com só o texto (`situationText`); botões da
      `availableActions` (`Aceitar pedido` e `Confirmar recebimento` primários,
      `Rejeitar pedido` `outline` destrutivo, `gap`/largura total em <`sm`);
      `Alert variant="warning"` + `Aceitar pedido` desabilitado quando
      `insufficientStock(order)` (Decisão 7); guarda a ação escolhida e o `open`
      do `OrderActionDialog` (última ação mantida durante a animação de fechar);
      após sucesso, foco no card (`ref` + `tabIndex={-1}`) e, ao cancelar, de volta
      ao botão de origem (`onCloseAutoFocus`). Sem botão desabilitado
      fora do caso de estoque.
- [x] 3.3 `frontend/src/features/orders/order-detail-page.tsx`: renderizar
      `<OrderActionsCard order={order} role={role} />` **antes** do
      `OrderSummaryCard` na coluna lateral; `onNotFound` → `navigate('/pedidos')`.
      Verificar: `tsc -b`; o resto da página (F7) idêntico.

## 4. Verificação

- [x] 4.1 `cd frontend && npx tsc -b`, `npm run lint:check` e
      `npm run format:check` limpos. **Não** rodar `npm run lint` (tem `--fix`)
      com o dev server ligado — deixa o módulo vazio/tela branca (se rodar,
      `touch` nos arquivos alterados e conferir com `curl`).
- [x] 4.2 E2E no browser (`playwright-cli`, dev server + backend locais; o banco
      foi resetado — recriar estabelecimentos, entidades, alimentos e pedidos
      `Pendente` pela API com um script fora do repo, no scratchpad). Cobrir:
      **estabelecimento** — card com `Aceitar pedido`/`Rejeitar pedido`; diálogo
      de aceite com "50 kg → 42 kg" e foco inicial em `Cancelar`; `Cancelar` não
      altera nada; confirmar → toast, selo `Aceito`, "Disponível agora" reduzido,
      card "Você aceitou…", contadores das abas (Pendente −1 / Aceito +1) e
      estoque no feed/detalhe do alimento atualizados; rejeitar (diálogo sem campo
      de motivo, estoque igual, selo `Rejeitado`); **entidade** — `Pendente` sem
      botões ("Aguardando…"), `Aceito` com `Confirmar recebimento`, diálogo de
      irreversibilidade, selo `Recebido`, card "Você confirmou…", vaga do limite
      de 10 (F6) liberada; **erros** — `409` "já atualizado" (pedido mudado por
      outra sessão via API com a página aberta), estoque insuficiente (aviso
      proativo + botão desabilitado; e `409` com página velha), alimento vencido
      (data ajustada no banco por script temporário → toast "não está mais
      disponível…" e `Rejeitar` ainda funciona), `404` (mock de rota → toast e
      volta a `/pedidos`), `5xx`/rede (mock → banner no diálogo e nova tentativa
      após remover o mock), envio lento (botões desabilitados, diálogo não fecha
      com Esc); **acessibilidade** — `document.activeElement` no card após o
      sucesso; **layout** — diálogo e card a 400 px sem rolagem horizontal, tema
      escuro; **regressão** — lista/abas/contadores do F7, aviso de limite do F6,
      console limpo.
- [x] 4.3 Comparar o card de ações com os frames `NYKRt` e `I0EByf`
      (`mcp__pencil__get_screenshot` × screenshot do app) e corrigir deriva
      visual acionável; as divergências **intencionais** são as listadas em
      `docs/PLANO-FRONTEND.md` (5.1).

## 5. Documentação

- [x] 5.1 `docs/PLANO-FRONTEND.md`: linha do F8 na tabela → `✅ feito (change
      frontend-acoes-pedido)`; bloco **Feito** sob a seção F8 (card de ações por
      papel × status, diálogos de confirmação, aviso proativo de estoque,
      tratamento de `409`/`404`/rede com a causa deduzida do pedido recarregado,
      invalidação de cache, sem mudança de backend, resultado do E2E) e
      **Protótipo Pencil — divergência aceita, não sincronizado** (azul em vez de
      verde, sem motivo de rejeição/cancelar/histórico, sem "Aceitar" na linha da
      tabela, card no topo da lateral, "Recebido" em vez de "Doado", diálogos sem
      frame); a nota do F7 deixa de listar as ações como pendência.
