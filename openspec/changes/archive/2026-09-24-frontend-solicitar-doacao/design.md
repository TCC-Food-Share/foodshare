## Context

Ver `proposal.md` — "Why". Estado herdado (F0–F5, em `develop`):

- `features/foods/food-detail-page.tsx`: o card "Interessado neste alimento?"
  (só para `role === 'beneficiary'`) já existe, inline, com o botão
  "Solicitar doação" `disabled` e sem modal. Os hooks de página
  (`useState(imageFailed)`, `useQuery`) ficam antes dos `return` antecipados.
- `features/foods/create-food-dialog.tsx` (F5): padrão de modal do projeto —
  `Dialog` controlado por `open`/`onOpenChange`, `useForm` + `zodResolver`,
  reset do formulário ao abrir ajustando estado **durante o render** (não em
  efeito), `useMutation`, banner `Alert destructive` para erro de servidor,
  `toast.success` + `invalidateQueries` no sucesso. O F6 segue o mesmo molde.
- `lib/query-client.ts`: sem retry para 4xx, `staleTime: 30_000`,
  `refetchOnWindowFocus: false`; `401` tratado centralmente (query e
  mutation). `lib/api.ts`: `ApiError` com `status`; `query` ignora valores
  `undefined`/`''`.
- shadcn presente: `dialog`, `form`, `input`, `radio-group`, `alert`
  (variantes `default` e `destructive`; esta change acrescenta `warning`, ver
  decisão 4), `button`, `sonner` (toasts no azul do Food Share via `--primary`).
  Nenhum componente novo a instalar.
- `router.tsx`: `/pedidos` e `/pedidos/:id` ainda são `RoutePlaceholder` do
  F7; `nav-items.ts` já expõe "Meus pedidos" → `/pedidos` para a entidade.

**Contrato do backend** (`POST /api/orders`, sem mudança nesta change):

- Corpo `{ foodId: int > 0, quantity: number > 0, até 2 casas }`
  (`CreateOrderDto`). Qualquer outro campo é recusado (`whitelist`).
- `201` → `OrderResponseDto`: `id`, `quantity` (string), `orderDate`,
  `status`, `food { id, name, quantityUnit }`, `establishment`,
  `beneficiaryEntity`.
- Ordem das checagens no serviço: entidade da sessão (`404`) → **limite de
  10 pedidos em andamento (`409`)** → alimento disponível (`404`) →
  quantidade ≤ quantidade atual do alimento (`400`). O `400` do
  `class-validator` (corpo malformado) roda antes do serviço; o cliente só
  envia corpo já validado, então isso não aparece na prática.
- O `409` é a **única** causa de conflito do `POST /orders` — a mensagem
  ("Beneficiary entity has reached the limit of orders in progress.") é em
  inglês, então o cliente decide pelo `status`, nunca pelo texto.
- Em andamento = `Pendente` + `Aceito`, `deleted = false`, da entidade da
  sessão. `GET /orders` para uma entidade aplica exatamente esse recorte
  (`deleted = false`, entidade da sessão) e aceita `status` e `pageSize`,
  então `total` de `?status=Pendente&pageSize=1` mais o de `?status=Aceito`
  é a contagem exata do limite — sem endpoint novo.
- "Disponível" (`findAvailableById`) = `Ativo`, não excluído, não vencido.
  **Não olha `quantity`**: um alimento cujos pedidos aceitos reservaram tudo
  (`quantity = 0`) continua listado e com detalhe.

**Protótipo Pencil**, frame `X7Llb6` ("Modal - Solicitar Doação", 600px, lido
via MCP `pencil`; contido em `tJQ7g`): header (ícone em círculo `--primary`,
título "Solicitar Doação", subtítulo "Pães Franceses · 50 unidades
disponíveis", X); caixa azul "Como funciona o processo" com 4 passos
numerados; divisor; "Quantidade desejada" + dica; duas opções em cartão
(**Total** selecionada em `--primary`, **Parcial**); campo de quantidade
(desabilitado com `Ex: 20`) com "máx. 50" ao lado; footer Cancelar / Enviar
solicitação (ícone). **Não existe frame para o estado de limite (RF15).**

### Pesquisa Refero

Buscas nas telas do Refero (MCP `refero`) para validar e refinar o protótipo
— estrutura e estados, não a identidade visual (herdada do F4: tokens
Neutral + azul `--primary`, sem trocar por estética de outro produto):

- **Modal com escolha por rádio + campo numérico dependente + aviso
  informativo** (Teachable, "Set up referrer reward"; Faire, "Request
  unlisted products"): confirma o formato do protótipo — título, opções,
  campo numérico logo abaixo da escolha, um único botão primário no rodapé.
  Dois refinamentos adotados: (1) a **unidade vai como sufixo dentro do
  campo** (o Teachable põe o "%" dentro do input), em vez de só no rótulo
  como no protótipo; (2) o campo fica sempre visível e só muda entre
  desabilitado (total) e editável (parcial), sem layout que pula.
- **Posição do aviso**: o Teachable coloca a caixa informativa *depois* dos
  campos, colada ao botão. Não adotado para o "Como funciona": são 4 passos,
  contexto que a pessoa lê *antes* de decidir a quantidade — fica no topo,
  como no protótipo. O aviso de **limite** (que impede a ação) é o que fica
  colado ao rodapé/ação.
- **Estado de limite atingido**: a busca por "você atingiu o limite… conclua
  um para criar outro" não trouxe nenhuma tela de referência utilizável
  (só modais de criar/excluir projeto e estados vazios genéricos). Nenhuma
  conclusão foi tirada dessas telas: o estado é desenhado a partir dos
  padrões do próprio app — o `Alert` do banner de erro do F5 (na variante
  `warning`, ver decisão 4) e a estrutura ícone + mensagem + ação do
  `EmptyState` do F4.

## Goals / Non-Goals

**Goals:**

- Modal fiel ao recorte do protótipo (`X7Llb6`), com o texto dos passos
  alinhado ao que o MVP realmente faz (RF16, RF18, RF20).
- Erro de limite (RF15) entendido *antes* de digitar (aviso no card) e
  *depois* de recusado (estado no modal), com a saída explicada.
- Toda decisão de aceitar/recusar continua no backend; o cliente só
  antecipa.
- `features/orders/` nasce com o que o F7/F8 vão reusar (`orders-api.ts`,
  tipo `Order`, hook de contagem, chaves `['orders', …]`).

**Non-Goals (nível de design):**

- Endpoint de contagem no backend, ou qualquer mudança de backend/schema.
- Reserva otimista da quantidade ou qualquer tratamento de concorrência
  além de "o backend recusa, o cliente recarrega": pedido `Pendente` não
  reserva estoque (só o aceite reserva, RF16), então dois pedidos para o
  mesmo alimento coexistem por definição.
- Impedir que a mesma entidade peça o mesmo alimento duas vezes — nenhum RF
  pede, o backend não impede.
- Campo de observação/mensagem no pedido — não existe em `CreateOrderDto`.

## Decisions

### 1. Nova feature `features/orders/`; card extraído do detalhe

```
features/orders/
  orders-api.ts               createOrder, countOrdersByStatus, tipos
  use-orders-in-progress.ts   hook de contagem + ORDERS_IN_PROGRESS_LIMIT
  create-order-schema.ts      fábrica do schema zod
  create-order-dialog.tsx     Dialog + form + estado de limite
  order-limit-notice.tsx      conteúdo do aviso de limite (modal e card)
  request-donation-card.tsx   card "Interessado neste alimento?" + gatilho
```

`FoodDetailPage` passa a renderizar `<RequestDonationCard food={food} />`
dentro do `role === 'beneficiary' &&` que já existe; o bloco inline do card
sai. O estado do modal (`open`) mora no card.

- Alternativa descartada: manter tudo inline no `FoodDetailPage`. A página já
  tem ~190 linhas de apresentação; somar hook de contagem, três estados de
  botão e o dialog misturaria "mostrar o alimento" com "regras do pedido".
- Alternativa descartada: pôr os arquivos em `features/foods/`. `Order`,
  `createOrder` e o hook de contagem são domínio de pedido — o F7 (listagem,
  detalhe) e o F8 (ações) vão morar/invalidar ali, e `foods/` não deve
  importar de volta o que `orders/` já importa dele.

### 2. Modelo da quantidade: `mode` + `quantity`, schema por fábrica

```ts
export function createOrderSchema(available: number) {
  return z
    .object({ mode: z.enum(['total', 'partial']), quantity: z.string() })
    .superRefine(({ mode, quantity }, ctx) => {
      if (mode === 'total') return;
      // quantity: vazio → 'Informe a quantidade.'
      //           ≤ 0 ou não numérico → 'A quantidade deve ser maior que zero.'
      //           fora de QUANTITY_REGEX → 'Use um número com no máximo 2 casas decimais.'
      //           > available → 'A quantidade não pode ser maior que a disponível.'
      // (todas com path: ['quantity'])
    });
}
export type CreateOrderInput = z.infer<ReturnType<typeof createOrderSchema>>;
export const DEFAULT_VALUES: CreateOrderInput = { mode: 'total', quantity: '' };
```

- O schema é recriado com `useMemo(() => createOrderSchema(available),
  [available])` no dialog; `available = Number(food.quantity)` (vem do
  detalhe, que o React Query recarrega — decisão 5).
- **`quantity` só vale em `partial`.** Em `total` o campo mostra a quantidade
  disponível como valor *derivado* (`formatQuantity(food.quantity)`) e vem
  `disabled`; nada é gravado no form. No submit:
  `quantity = mode === 'total' ? available : Number(values.quantity)`. Assim,
  se o alimento for recarregado com outra quantidade (decisão 5), o "total"
  nunca fica com valor velho guardado no form.
- Trocar para `partial` mantém o que a pessoa já digitou antes (começa
  vazio); trocar de volta para `total` não apaga. Erro de `quantity` some ao
  voltar para `total` (o `superRefine` deixa de validar o campo).
- `quantity` e `mode` como `string`/enum, não `z.coerce.number()` — mesma
  lição do F5 (input/output types do `coerce` não fecham com
  `useForm<T>`); só converte para `number` ao montar o payload.
- `QUANTITY_REGEX` (`/^\d+(\.\d{1,2})?$/`) sai de `create-food-schema.ts` e
  vai para `lib/validation.ts` — passa a ser usada por dois schemas, e o
  arquivo já é o lugar dos regex espelhados do backend.
- Alternativa descartada: um único campo numérico + botão "Solicitar tudo".
  Mais simples, mas descarta os cartões Total/Parcial do protótipo e o texto
  "Solicitar todas as 50 unidades disponíveis", que é justamente o que
  deixa claro que pedir tudo é uma opção de primeira classe.
- `mode: 'onChange'` (não `onTouched`): ao virar `partial`, o campo
  recém-habilitado precisa validar por tecla, e o histórico do projeto com
  `onTouched` + erro vindo de fora do campo é ruim (ver o wizard do F2).

### 3. Limite em duas camadas — contagem consultiva + `409` autoritativo

```ts
// use-orders-in-progress.ts
export const ORDERS_IN_PROGRESS_LIMIT = 10;

export function useOrdersInProgress(enabled: boolean) {
  const results = useQueries({
    queries: (['Pendente', 'Aceito'] as const).map((status) => ({
      queryKey: ['orders', 'count', status],
      queryFn: () => countOrdersByStatus(status),
      enabled,
    })),
  });
  const ready = results.every((r) => r.data !== undefined);
  const count = ready ? results.reduce((sum, r) => sum + r.data!, 0) : undefined;
  return { count, limitReached: count !== undefined && count >= ORDERS_IN_PROGRESS_LIMIT };
}
```

`countOrdersByStatus(status)` = `api.get<Paginated>('/orders', { query: {
status, pageSize: 1 } }).then((r) => r.total)`.

- `limitReached` só é `true` com as duas contagens em mãos. Carregando ou
  erro em qualquer uma → `false`: o botão fica habilitado e o backend
  decide. O aviso proativo é uma **conveniência**, nunca uma trava de
  segurança.
- Chaves sob `['orders', …]`: `createOrder` invalida `['orders']` no sucesso
  (a contagem sobe e o card já pode virar "limite" sem recarregar), e o F8
  já planeja invalidar as queries de pedido após aceitar/rejeitar/receber —
  confirmar um recebimento libera uma vaga e o card volta ao normal de graça.
- `ORDERS_IN_PROGRESS_LIMIT = 10` espelha `MAX_ORDERS_IN_PROGRESS` do
  backend — um comentário curto marca o espelhamento (regra de
  `docs/CONVENCOES.md` para valores espelhados de outra camada).
- Custo: 2 GETs pequenos e paralelos (`pageSize=1`, uma linha cada) por
  visita ao detalhe de alimento, só para entidade beneficiária, cacheados
  por 30s pelo `staleTime` default. Dentro do orçamento do RNF04.
- Alternativas descartadas:
  - **Só reativo** (esperar o `409`): mais simples, mas faz a pessoa
    preencher a quantidade para ser recusada — o `PLANO-FRONTEND.md` pede
    "bloquear/avisar antes se possível".
  - **`GET /orders?pageSize=50` e contar no cliente**: inexato quando a
    entidade tem mais de 50 pedidos no total (o histórico terminal
    acumula), justamente o caso comum de quem usa a plataforma há meses.
  - **Endpoint `GET /orders/in-progress-count`**: exato e barato, mas é
    mudança de backend + spec nova, para poupar um GET que já existe.

### 4. Estado de limite dentro do modal; conteúdo compartilhado com o card

`OrderLimitNotice` renderiza o aviso; o mesmo componente aparece:

- **no modal**, quando o `POST /orders` volta `409`: o corpo do modal (caixa
  "Como funciona" + formulário) é *substituído* pelo aviso, e o footer vira
  `Fechar` + `Ver meus pedidos` (`Link` para `/pedidos`). Além disso o
  dialog invalida `['orders']`, então ao fechar o card já está no estado de
  limite (botão desabilitado + aviso), coerente com o que a pessoa acabou
  de ver.
- **no card do detalhe**, quando `useOrdersInProgress().limitReached`: aviso
  no lugar do texto de apoio e botão desabilitado. O botão fica como
  `disabled` *com* o motivo escrito ao lado (não só um botão cinza).

Layout do aviso: `Alert variant="warning"` com `TriangleAlertIcon`, título e
descrição. É **warning, não erro**: bater no limite é um estado esperado do
uso, e um aviso vermelho (`destructive`) assusta e sugere que algo deu errado.
A variante `warning` é nova: fundo âmbar suave, borda âmbar, ícone âmbar e
**texto no tom normal** (só o ícone e a borda carregam a cor — mantém o contraste
de leitura e alarma menos que texto colorido), sobre um token `--warning` em
`styles/index.css` (`#b45309` no claro, `#fbbf24` no escuro). O protótipo Pencil
não tem cor de warning (nenhuma variável nem frame), então não há valor a
portar. Texto (pt-BR):

- **Título**: "Limite de pedidos em andamento atingido"
- **Descrição**: "Sua entidade já tem 10 pedidos em andamento (pendentes ou
  aceitos) e não pode fazer novas solicitações por enquanto. Para liberar
  espaço, confirme o recebimento dos pedidos aceitos ou aguarde a resposta
  dos pendentes."

O texto dá a saída *real* dentro do MVP: a entidade não cancela pedido (Fora
do Escopo), então "encerrar algum" (texto do `PLANO-FRONTEND.md`) se traduz
em confirmar recebimento de `Aceito` (RF18, ação dela) ou esperar o
estabelecimento aceitar/rejeitar `Pendente` (RF16/RF17, ação de outro).
"10" é o valor do limite, não a contagem lida (o `409` não devolve
contagem; e o `PLANO` diz "10+" porque RF15 é "10 ou mais").

- Alternativas descartadas: (a) só toast no `409` — some em segundos e não
  cabe a explicação de como liberar espaço; (b) segundo `Dialog` em cima do
  primeiro — dois modais empilhados, foco e Esc ambíguos; (c) fechar o modal
  e mostrar só o aviso no card — perde o contexto de "o que eu acabei de
  tentar".
- O `Link` "Ver meus pedidos" leva ao `/pedidos` do F7 (placeholder até lá).
  Ao navegar, `FoodDetailPage` desmonta e o `Dialog` some junto — sem
  `onOpenChange` extra.

### 5. Mapa de resposta do `POST /orders`

| Resposta | O que a UI faz |
| --- | --- |
| `201` | fecha o modal; `toast.success('Solicitação enviada ao estabelecimento.')`; `invalidateQueries({ queryKey: ['orders'] })`; permanece no detalhe |
| `409` | troca o corpo do modal pelo estado de limite (decisão 4); invalida `['orders']` |
| `400` | banner `Alert destructive` "Não foi possível enviar: a quantidade pode ter mudado. Confira o valor e tente novamente."; `invalidateQueries({ queryKey: ['food', foodId] })` para atualizar o "máx." e a quantidade total |
| `404` | `toast.error('Este alimento não está mais disponível.')`; fecha o modal; invalida `['food', foodId]` e `['foods']` (o detalhe passa a mostrar "Alimento não encontrado") |
| rede / `5xx` / outro | banner neutro "Não foi possível enviar a solicitação. Tente novamente em instantes." (mesmo padrão do F5) |

O `400` real que o cliente pode receber é "quantidade acima do disponível"
(alguém teve um pedido aceito entre o carregamento do detalhe e o envio); a
mensagem do backend é em inglês e o `400` também cobre corpo inválido, então
o texto do banner é genérico o bastante para os dois. O cliente não tenta
distinguir por texto.

### 6. Mecânica do dialog — mesmo molde do F5, com o trap do submit

- `CreateOrderDialog({ food, open, onOpenChange })`: `Dialog` controlado;
  reset de `DEFAULT_VALUES` + limpeza de `serverError`/`limitReached` ao
  abrir, ajustando estado durante o render (mesmo padrão e mesma razão do F5:
  evita `setState` em efeito).
- **Submit**: nenhum botão do modal é `type="submit"`. "Enviar solicitação" é
  `type="button"` com `onClick={() => void form.handleSubmit(onSubmit)()}` e o
  `<form>` faz `onSubmit={(e) => e.preventDefault()}` — regra herdada do F2
  que vale explicitamente para F5/F6 (nunca alternar `type=button`/`submit`
  no mesmo slot; o F6 troca o footer inteiro ao virar estado de limite,
  então o risco é maior que no F5). Consequência aceita: Enter dentro do
  campo de quantidade não envia — igual ao modal do F5.
- Footer do estado normal e do estado de limite são **ramos distintos** do
  JSX (`limitReached ? <LimitFooter /> : <FormFooter />`), cada um com o
  próprio `DialogFooter`.
- Radio: `RadioGroup value={field.value} onValueChange={field.onChange}`
  com `DEFAULT_VALUES.mode = 'total'` — nunca `undefined`, então não repete o
  trap controlado/não-controlado do `Select` (F5). Os "cartões" Total/Parcial
  são `<label>` que envolvem o `RadioGroupItem`, com o estado marcado
  estilizado via `has-[[data-state=checked]]:` (fundo `--primary`, texto
  `--primary-foreground`, como no protótipo).
- Como `mode` é lido por um componente que não é o dono do `useForm` (o
  campo de quantidade), usa `useWatch({ control, name: 'mode' })`, não
  `form.watch` (regra herdada do F2).
- Campo de quantidade: `Input type="number" inputMode="decimal" step="0.01"
  min="0" max={available}`, dentro de um wrapper `relative` com o sufixo da
  unidade (`quantityUnit`) em `absolute`, e `pr-` suficiente para o texto não
  ficar por baixo dele; "máx. {available} {unit}" como texto de apoio ao
  lado, como no protótipo.

### 7. Estados do card "Interessado neste alimento?"

Ordem de precedência (a primeira que casa vence):

1. **Sem quantidade** (`Number(food.quantity) <= 0`): botão desabilitado +
   texto "Este alimento não tem mais quantidade disponível." — a causa é do
   alimento, e a entidade não tem como agir; o limite de pedidos é
   irrelevante aqui.
2. **Limite atingido** (`limitReached`): `OrderLimitNotice` + botão
   desabilitado.
3. **Normal**: texto de apoio atual + botão habilitado que abre o modal.

- O botão e o texto de apoio do estado normal permanecem como no F4
  (`HeartHandshakeIcon`, "Solicitar doação"). Mesmo critério de gate por
  papel do F4/F5: o card **não existe** para estabelecimento (não é
  "indisponível", é uma ação que aquele papel nunca tem).
- Alternativa descartada: esconder o card quando `quantity <= 0`. Some a
  explicação e a entidade fica sem saber por que não consegue pedir.

### 8. Cópia do "Como funciona o processo"

Os quatro passos do protótipo, com o texto ajustado ao MVP (o formato, a
numeração e a caixa azul ficam como no `X7Llb6`):

1. "Sua solicitação será enviada ao estabelecimento para análise." *(igual)*
2. "O estabelecimento analisará sua solicitação e poderá aceitá-la ou
   recusá-la." *(igual)*
3. "Se aceitar, a quantidade solicitada fica reservada para a sua entidade."
   *(no lugar de "os dados de contato são compartilhados…")*
4. "Ao receber o alimento, confirme o recebimento em Meus pedidos."
   *(no lugar de "É só comparecer no momento combinado…")*

O passo 3 do protótipo promete compartilhamento de contato, que o MVP não
tem (RF20 só expõe razão social/cidade/UF e "WhatsApp direto" é Fora do
Escopo); o 4 fala de combinar logística, também Fora do Escopo. Os novos
descrevem o que RF16 e RF18 realmente fazem.

## Risks / Trade-offs

- **Contagem velha no card** (outra aba, outro dispositivo, `staleTime` de
  30s) → o botão pode estar habilitado quando o limite já foi atingido, ou
  desabilitado quando uma vaga acabou de abrir. O primeiro cai no `409`
  (estado de limite, que também invalida a contagem); o segundo se corrige
  no próximo refetch. Aceito: a checagem é consultiva, o backend decide.
- **Quantidade "total" velha** (detalhe em cache com estoque que já caiu)
  → `400` do backend; banner + refetch do alimento atualizam o "máx." e o
  total, a pessoa reenvia. Nenhum estado velho fica guardado no form
  (decisão 2).
- **`409` é lido só pelo `status`** → hoje é a única causa de conflito do
  `POST /orders`. Se o backend ganhar outro `409` nessa rota, a UI o
  mostraria como "limite atingido"; o risco é de evolução futura, e a
  correção seria o backend diferenciar o erro (código no corpo), não o
  cliente ler texto em inglês.
- **`/pedidos` ainda é placeholder** → o "Ver meus pedidos" leva a uma tela
  vazia até o F7. Aceito: a rota e o item de nav já existem; o link é
  igualmente válido no dia em que o F7 chegar, sem retrabalho.
- **2 requests a mais por visita ao detalhe** (só entidade) → payload mínimo,
  paralelos, não bloqueiam a renderização. Se a contagem falhar, nada muda
  para a pessoa.
- **Enter não envia** no campo de quantidade → consequência da regra do
  trap do submit (decisão 6); mesmo comportamento do F5.
- **Divergência do protótipo** (passos 3 e 4, unidade no campo, estado de
  limite sem frame) não é sincronizada no `.pen` → mesmo precedente do
  F2–F5; registrada em `docs/PLANO-FRONTEND.md`.

## Migration Plan

1. Frontend apenas — nenhuma mudança de backend/schema.
2. Implementar na ordem das tasks: `lib/validation.ts` → `orders-api.ts` →
   schema → hook → aviso → dialog → card → detalhe. `npm run lint:check`
   (0 warnings) + `npm run build` (`tsc -b && vite build`).
3. Verificação de ponta a ponta no browser (backend `:3000` + Postgres +
   `npm run dev`, `playwright-cli`), incluindo o `console` depois de
   interagir com o modal (lição do F5: `tsc`/eslint não pegam warning de
   componente controlado).
4. PR para `develop`. Sem migração de dado. Rollback = reverter o PR: o
   botão volta a `disabled`, `POST /orders` continua existindo.

## Open Questions

Nenhuma que mude a especificação, a abordagem ou o recorte de tasks:

- Se, com o F7 pronto, o sucesso do pedido deve levar direto para
  `/pedidos/:id` em vez de só o toast — decisão de fluxo do F7.
- Se a listagem de pedidos da entidade (F7) deve mostrar um indicador
  "X de 10 em andamento" reaproveitando `useOrdersInProgress` — idem.
