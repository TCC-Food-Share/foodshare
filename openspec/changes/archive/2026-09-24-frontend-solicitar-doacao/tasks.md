## 1. Frontend — base compartilhada e API

- [x] 1.1 `frontend/src/lib/validation.ts`: exportar `QUANTITY_REGEX`
      (`/^\d+(\.\d{1,2})?$/`, espelha `IsNumber({ maxDecimalPlaces: 2 })` do
      backend). `features/foods/create-food-schema.ts` passa a importá-lo e
      perde a constante local. Verificar: `tsc -b` passa, F5 sem mudança de
      comportamento.
- [x] 1.2 `frontend/src/features/orders/orders-api.ts`: tipos `Order`
      (`OrderResponseDto`: `id`, `quantity` string, `orderDate`, `status`,
      `food { id, name, quantityUnit }`, `establishment`,
      `beneficiaryEntity`), `PaginatedOrders`, `CreateOrderPayload
      { foodId; quantity }`; `createOrder(payload)` → `POST /orders`;
      `countOrdersByStatus(status)` → `GET /orders` com `{ status, pageSize: 1 }`,
      retornando `total`.
- [x] 1.3 `frontend/src/features/orders/use-orders-in-progress.ts`: exportar
      `ORDERS_IN_PROGRESS_LIMIT = 10` (com o comentário curto de que espelha
      `MAX_ORDERS_IN_PROGRESS` do backend) e `useOrdersInProgress(enabled)` —
      `useQueries` para `Pendente` e `Aceito`, chaves `['orders', 'count',
      status]`; expõe `count` (só com as duas contagens em mãos) e
      `limitReached` (`false` enquanto carrega ou se qualquer uma falhar).

## 2. Frontend — schema da solicitação

- [x] 2.1 `frontend/src/features/orders/create-order-schema.ts`:
      `createOrderSchema(available: number)` (fábrica) com `mode`
      (`'total' | 'partial'`) e `quantity` (string); `superRefine` valida
      `quantity` **só** em `partial` (vazio, fora de `QUANTITY_REGEX`, ≤ 0,
      > `available`, cada uma com mensagem em pt-BR e `path: ['quantity']`).
      Exportar `CreateOrderInput` e `DEFAULT_VALUES = { mode: 'total',
      quantity: '' }`.

## 3. Frontend — aviso de limite

- [x] 3.1 `frontend/src/features/orders/order-limit-notice.tsx`:
      `Alert variant="warning"` (estado esperado, não erro) com
      `TriangleAlertIcon`, título "Limite de pedidos em andamento atingido" e a
      descrição do `design.md` (decisão 4). Exige a variante `warning` em
      `components/ui/alert.tsx` e o token `--warning` (claro/escuro) +
      `--color-warning` em `styles/index.css`.
      Aceita `className`; sem lógica de navegação (o botão/link fica com quem
      usa).

## 4. Frontend — modal de solicitação

- [x] 4.1 `frontend/src/features/orders/create-order-dialog.tsx`: `Dialog`
      controlado (`food`, `open`, `onOpenChange` por props); cabeçalho no
      molde do `X7Llb6` — ícone em círculo `bg-primary`, título "Solicitar
      Doação", subtítulo `{food.name} · {qty} {unit} disponíveis`. Reset de
      `DEFAULT_VALUES` + limpeza de `serverError`/`limitReached` ao abrir,
      ajustando estado durante o render (mesmo padrão do
      `create-food-dialog.tsx`). `useForm` + `zodResolver(useMemo(() =>
      createOrderSchema(available), [available]))`, `mode: 'onChange'`.
- [x] 4.2 Caixa "Como funciona o processo": 4 passos numerados com a cópia do
      `design.md` (decisão 8 — passos 3 e 4 diferem do protótipo). Cores por
      tokens do tema (`--primary` em tom claro para o fundo/borda; sem hex
      literal do protótipo). Verificar lado a lado com o screenshot do frame
      `X7Llb6` (Pencil MCP).
- [x] 4.3 Bloco "Quantidade desejada": `RadioGroup` (`value={field.value}`,
      `mode` nunca `undefined`) com os cartões **Total** ("Solicitar todas as
      {N} {unit} disponíveis") e **Parcial** ("Informe a quantidade que deseja
      solicitar"), estado marcado em `--primary`; campo numérico
      (`type="number"`, `inputMode="decimal"`, `step="0.01"`, `max`) com a
      unidade como sufixo dentro do campo e "máx. {N} {unit}" ao lado. Em
      `total` o campo mostra a quantidade disponível e fica `disabled`; em
      `partial` fica editável. Ler `mode` no campo com `useWatch`, não
      `form.watch`.
- [x] 4.4 Submissão: `useMutation(createOrder)`; `onSubmit` monta
      `quantity = mode === 'total' ? available : Number(values.quantity)`.
      Botão "Enviar solicitação" é `type="button"` com `onClick={() => void
      form.handleSubmit(onSubmit)()}` e o `<form>` tem `onSubmit={(e) =>
      e.preventDefault()}`; spinner e `disabled` durante `isPending`;
      "Cancelar" fecha sem enviar. Mapa de respostas (design, decisão 5):
      `201` → fecha, `toast.success('Solicitação enviada ao
      estabelecimento.')`, invalida `['orders']`; `400` → banner + invalida
      `['food', foodId]`; `404` → `toast.error` + fecha + invalida `['food',
      foodId]` e `['foods']`; rede/`5xx`/outro → banner neutro.
- [x] 4.5 Estado de limite (`409`): `limitReached` local troca o corpo do modal
      por `OrderLimitNotice` e o footer por `Fechar` + `Ver meus pedidos`
      (`Link` para `/pedidos`), em ramos de JSX distintos (nenhum botão
      alterna `type` no mesmo slot); invalida `['orders']` para o card
      refletir o limite ao fechar.

## 5. Frontend — card e detalhe do alimento

- [x] 5.1 `frontend/src/features/orders/request-donation-card.tsx`:
      `RequestDonationCard({ food })` com o card "Interessado neste
      alimento?" do F4 + `useState(open)` + `<CreateOrderDialog />`. Estados
      por precedência (design, decisão 7): (1) `Number(food.quantity) <= 0`
      → botão desabilitado + "Este alimento não tem mais quantidade
      disponível."; (2) `useOrdersInProgress(true).limitReached` →
      `OrderLimitNotice` + botão desabilitado; (3) normal → texto de apoio
      atual + botão habilitado que abre o modal.
- [x] 5.2 `frontend/src/features/foods/food-detail-page.tsx`: o bloco inline
      do card (dentro do `role === 'beneficiary' &&`) é substituído por
      `<RequestDonationCard food={food} />`; remover o import
      `HeartHandshakeIcon` que deixa de ser usado ali. Verificar: `tsc -b`
      passa e o detalhe de estabelecimento segue sem o card.

## 6. Verificação e fechamento

- [x] 6.1 `frontend/`: `npm run lint:check` (0 warnings) + `npm run build`
      (`tsc -b && vite build`) sem erro.
- [x] 6.2 Verificação de ponta a ponta no browser (`playwright-cli`, backend
      `:3000` + Postgres + `npm run dev`; contas de teste criadas via
      cadastro real):
  - Conta **entidade beneficiária**: o botão "Solicitar doação" está
    habilitado; o modal abre com o cabeçalho, os 4 passos (com os passos 3 e
    4 novos) e os cartões Total/Parcial, fiel ao `X7Llb6`; a unidade vem do
    alimento (kg, unidades…), não fixa.
  - **Total**: enviar → `201`, modal fecha, toast, permanece no detalhe; o
    pedido existe como `Pendente` com `quantity` igual à do alimento
    (`GET /orders`).
  - **Parcial**: campo vazio, `0`, `-1`, 3 casas decimais e valor acima do
    disponível → erro inline, **nenhum request**; valor válido (inclusive
    fracionário, ex.: `2.5`) → `201`.
  - Alternar Total ↔ Parcial várias vezes: campo desabilita/habilita, o que
    foi digitado em Parcial se mantém, erro some ao voltar a Total.
  - Fechar (Cancelar e X) e reabrir: formulário volta em Total, sem valor,
    sem banner e sem estado de limite.
  - **Limite (proativo)**: entidade com 10 pedidos em andamento (mistura de
    `Pendente` e `Aceito`, criados por API/SQL) abre o detalhe → o card mostra
    o aviso e o botão está desabilitado; com 9 o botão está habilitado.
  - **Limite (reativo)**: com 9 no momento do carregamento, criar o 10º por
    outra aba/API e então enviar pelo modal aberto → `409` → o corpo do modal
    vira o aviso, "Fechar" fecha, o card já aparece no estado de limite;
    "Ver meus pedidos" navega para `/pedidos`.
  - **Liberar vaga**: rejeitar um pendente (conta estabelecimento) ou
    confirmar recebimento de um aceito → após o refetch (recarregar a página)
    o card volta ao normal.
  - **Quantidade 0**: alimento com `quantity = 0` (SQL) → card mostra o
    aviso e o botão desabilitado; nenhum modal abre.
  - **`400`**: reduzir o estoque do alimento por SQL depois de carregar o
    detalhe e enviar "total" → banner; "máx." e o total atualizam.
  - **`404`**: alimento vencido/excluído por SQL depois de carregar e enviar
    → toast, modal fecha, detalhe mostra "Alimento não encontrado".
  - Conta **estabelecimento**: o detalhe do alimento **não** mostra o card.
  - `playwright-cli console` após interagir com o radio e o campo: 0 erros e
    0 warnings (lição do F5: `tsc`/eslint não pegam controlado ↔ não
    controlado). Dados de teste removidos ao final via SQL direto.
  - **Resultado**: verificado no browser com 1 estabelecimento e 1 entidade
    beneficiária de teste criados via cadastro real (`POST /establishments`,
    `POST /beneficiary-entities`), 5 alimentos e até 11 pedidos por API.
    Confirmado: modal idêntico ao `X7Llb6` (screenshot lado a lado) com os
    passos 3 e 4 novos e a unidade vinda do alimento (`unidades`, `kg`);
    parcial fracionário (`2.5` → pedido `2.50 Pendente`) e total (`50.00`)
    → `201`, toast azul, modal fecha, permanece no detalhe; validação inline
    de vazio / `0` / `-1` / 3 casas / acima do máx. sem nenhum `POST`; Total ↔
    Parcial mantém o digitado e limpa o erro; reabrir (Cancelar, Esc e X)
    sempre volta em Total, vazio, sem banner; com 9 pedidos em andamento o
    botão fica habilitado, com 10 vem desabilitado + aviso (carregamento
    novo); 10º pedido criado por API com o modal aberto → `409` → o corpo do
    modal vira o estado de limite e o card atrás já aparece desabilitado;
    "Ver meus pedidos" navega para `/pedidos` e o dialog desmonta sem travar o
    scroll; rejeitar um pendente / confirmar recebimento de um aceito libera
    a vaga (só `Pendente` e `Aceito` contam); aceitar um pedido de tudo
    zerou o alimento (`0.00`) e o card mostrou "sem quantidade" com o botão
    desabilitado; estoque reduzido por SQL depois de carregar → `400` →
    banner + cabeçalho/"máx."/total atualizados para o novo valor; alimento
    vencido por SQL depois de carregar → `404` → toast, modal fecha, detalhe
    "Alimento não encontrado"; estabelecimento não vê o card nem dispara as
    contagens; modal a 400px cabe na viewport (rolagem interna, sem
    overflow horizontal); console sem erro nem warning de código (única
    entrada: o host fictício da imagem dos alimentos de teste).
    **Achado e corrigido durante a verificação**: a ordem das checagens em
    `create-order-schema.ts` mandava `-1` para a mensagem de casas decimais
    (regex antes do `> 0`) — agora "vazio → `≤ 0`/não numérico → casas →
    acima do máx."; `design.md` (decisão 2) atualizado. Observação de dev
    (não é bug de código): um `eslint --fix` sobre arquivos abertos pelo Vite
    deixou o módulo em cache vazio ("does not provide an export named
    'OrderLimitNotice'") e a tela em branco até um `touch` nos arquivos; o
    build de produção nunca foi afetado.
- [x] 6.3 `openspec validate frontend-solicitar-doacao --strict` sem erro.
- [x] 6.4 `docs/PLANO-FRONTEND.md`: marcar F6 como concluída na tabela
      "Estado atual" e acrescentar à seção F6 o bloco "Feito" — passos 3 e 4
      do "Como funciona" reescritos, unidade como sufixo do campo, estado de
      limite (dois níveis, sem frame no protótipo) e card "sem quantidade" —
      com a nota de que o protótipo Pencil não foi sincronizado (mesmo
      precedente do F2–F5).
