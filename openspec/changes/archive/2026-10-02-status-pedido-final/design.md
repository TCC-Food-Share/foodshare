## Context

Ver `proposal.md` ("Why"). Estado herdado do MVP:

- **Backend.** `orders/orders.constants.ts` tem `INITIAL_STATUS`,
  `ACCEPTED_STATUS = 'Aceito'`, `REJECTED_STATUS`, `RECEIVED_STATUS =
  'Recebido'`, `ORDER_STATUS_NAMES` (usado no `@IsIn` do filtro) e
  `IN_PROGRESS_STATUSES` (o conjunto do limite e da duplicidade).
  `foods/foods.service.ts` tem uma constante local `ACTIVE_STATUS = 'Ativo'`.
  O `prisma/seed.ts` repete as strings em listas próprias (`FOOD_STATUSES =
  ['Ativo']`, `ORDER_STATUSES` com os quatro nomes do MVP), rodado por `tsx`.
  Os testes (`orders.service.spec.ts`, `foods.service.spec.ts`) usam as strings
  literais. Os textos do Scalar em `orders.controller.ts` e os `example` dos
  DTOs citam "Aceito"/"Recebido" e a numeração RF do MVP.
- **Status são tabelas de domínio** (`order_status`, `food_status`), buscadas
  por nome (`findUniqueOrThrow({ where: { name } })`). Trocar um nome é só
  seed + código; não há migration (DT18, `docs/MODELO-DE-DADOS.md`).
- **Transições** já são condicionais (`updateMany` com o status de origem no
  `where`, `409` se `count === 0`) e o aceite já desconta o estoque com
  `quantity >= x` na mesma transação. Nada disso muda aqui.
- **Frontend.** `features/orders/orders-api.ts` define o tipo
  `OrderStatusName` e `ORDER_STATUSES` com os quatro nomes do MVP. O resto das
  telas usa `Record<OrderStatusName, …>` (selo, estado vazio, texto de
  situação), então o TypeScript acusa qualquer status sem entrada.
  `use-orders-in-progress.ts` tem uma lista própria `['Pendente', 'Aceito']`.
  O status da aba vai na URL (`/pedidos?status=Pendente`). Os nomes de status
  são mostrados na tela como estão (exceção de idioma de
  `docs/CONVENCOES.md`).

## Goals / Non-Goals

**Goals:**

- Uma única fonte para os nomes de status em cada camada: `ORDER_STATUS` e
  `FOOD_STATUS` no backend (usados também pelo seed) e um arquivo de status de
  pedido no frontend.
- `grep -rn "Aceito\|Recebido"` vazio em `backend/src`, `backend/prisma` e
  `frontend/src`.
- Fluxo do MVP (pedir → aceitar → confirmar) funcionando com os nomes novos.

**Non-Goals:**

- Qualquer regra nova de estoque ou de status (`Reservado`, `Inativo`,
  rejeição automática, cancelamento). Ver "Fora do escopo" na proposta.
- Converter dados existentes. O banco é recriado (P02).
- Mudar as rotas (`/accept`, `/reject`, `/receive`) ou os códigos de erro.

## Decisions

### 1. Constantes como objeto `as const`, por domínio

```ts
// orders/orders.constants.ts
export const ORDER_STATUS = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  REJECTED: 'Rejeitado',
  DONATED: 'Doado',
  CANCELLED: 'Cancelado',
} as const;
export const ORDER_STATUS_NAMES = Object.values(ORDER_STATUS);
export const OPEN_ORDER_STATUSES = [ORDER_STATUS.PENDING, ORDER_STATUS.IN_PROGRESS];

// foods/foods.constants.ts (novo)
export const FOOD_STATUS = { ACTIVE: 'Ativo', RESERVED: 'Reservado', INACTIVE: 'Inativo' } as const;
export const FOOD_STATUS_NAMES = Object.values(FOOD_STATUS);
```

- É o formato que `docs/MODELO-DE-DADOS.md` e `docs/CONVENCOES.md` já citam
  (`ORDER_STATUS.IN_PROGRESS`).
- `ORDER_STATUS_NAMES` segue a ordem da máquina de estados; o `@IsIn` do
  filtro e o `enum` do Scalar usam essa lista.
- `IN_PROGRESS_STATUSES` vira `OPEN_ORDER_STATUSES`: com "Em andamento" sendo
  um status, o nome antigo induziria a erro.
- Cada domínio no seu módulo (`orders/`, `foods/`), como os outros
  `*.constants.ts`.
- **Alternativa descartada:** um `common/statuses.ts` com os dois. Não existe
  `common/` no backend, e os módulos já têm o próprio arquivo de constantes.
- **Alternativa descartada:** enum do TypeScript. Os valores são dados
  (linhas de tabela), e a DT18 reserva enum para os tipos que viram enum do
  Prisma.

### 2. O seed importa as constantes do `src/`

`prisma/seed.ts` passa a usar `ORDER_STATUS_NAMES` e `FOOD_STATUS_NAMES`
(import relativo de `../src/orders/orders.constants` e
`../src/foods/foods.constants`). Os dois arquivos são TypeScript puro, sem
dependência do Nest, e o seed já roda com `tsx`. Assim o seed e o código
nunca divergem.

O seed continua só com `upsert` e **não apaga** status antigos. Em um banco do
MVP, "Aceito" e "Recebido" continuariam na tabela, com pedidos apontando para
eles. Por isso o reset (decisão 6) é obrigatório, e não um passo opcional.

### 3. Nomes das constantes antigas

| Antes | Depois |
| ----- | ------ |
| `INITIAL_STATUS` | `ORDER_STATUS.PENDING` |
| `ACCEPTED_STATUS` | `ORDER_STATUS.IN_PROGRESS` |
| `REJECTED_STATUS` | `ORDER_STATUS.REJECTED` |
| `RECEIVED_STATUS` | `ORDER_STATUS.DONATED` |
| `IN_PROGRESS_STATUSES` | `OPEN_ORDER_STATUSES` |
| `ACTIVE_STATUS` (local em `foods.service.ts`) | `FOOD_STATUS.ACTIVE` |

As variáveis locais do service (`accepted`, `received`) passam a `inProgress` e
`donated`. Os nomes de método (`accept`, `receive`) e as rotas continuam: são
ações, não status. `MAX_ORDERS_IN_PROGRESS` vira `MAX_OPEN_ORDERS`; os códigos
de erro (`ORDERS_IN_PROGRESS_LIMIT_REACHED`, `DUPLICATE_ORDER_IN_PROGRESS`)
**não mudam**, porque são contrato com o frontend e o plano manda mantê-los.

### 4. Frontend: `features/orders/order-status.ts`

Um arquivo só para o domínio de status de pedido (`docs/CONVENCOES.md`,
"Rótulos de status e tipos"):

- `ORDER_STATUS` (mesmo formato do backend), `OrderStatusName`,
  `ORDER_STATUSES` (ordem das abas), `OPEN_ORDER_STATUSES` e `isOrderStatus`;
- `ORDER_STATUS_STYLES`: classes do selo para cada status.

`orders-api.ts` deixa de definir o tipo e a lista e passa a importar daqui. O
rótulo exibido continua sendo o próprio nome do status (é dado em pt-BR,
mostrado como está), então não há tabela de tradução.

Os textos por papel (estado vazio, texto de situação) continuam nos arquivos de
cada tela, em `Record<OrderStatusName, …>`: o tipo força uma entrada para
`Cancelado` em cada um. Juntar todos os textos num arquivo só misturaria
copy de telas diferentes sem ganho.

### 5. Cores do selo

Conferidas no protótipo (frame "Desktop - Admin Pedidos", que tem os cinco
status, confirmado nos frames de pedidos das instituições):

| Status | Cor | Protótipo |
| ------ | --- | --------- |
| Pendente | `primary` (azul) | "Ativo", azul `#dbeafe`/`#1d4ed8` |
| Em andamento | `warning` (âmbar) | âmbar/laranja `#fef3c7`/`#a16207` |
| Rejeitado | `destructive` (vermelho) | vermelho `#fee2e2`/`#b91c1c` |
| Doado | verde | verde `#dcfce7`/`#15803d` |
| Cancelado | neutro (`muted`) | cinza `#f3f4f6`/`#525252` |

O MVP usava âmbar para "Pendente" e azul para "Aceito"; a versão final segue
o protótipo e inverte. Os tokens do tema (`primary`, `warning`,
`destructive`) substituem os hex do protótipo para manter o tema escuro.

**Divergência registrada:** o protótipo chama o pedido pendente de "Ativo"
(nome do documento do TCC). Vale "Pendente" (DT01); o protótipo não é
redesenhado.

### 6. Banco: reset, sem migration

Não há mudança de schema. Os dados do MVP são de teste (P02), então:

- **Local:** `prisma migrate reset` + `prisma db seed`. O comando é bloqueado
  para o agente sem consentimento explícito, que é pedido na hora.
- **Staging:** limpar o banco no Coolify depois do merge em `develop`; o
  deploy roda `migrate deploy` + seed. É uma ação manual da dupla.

O seed não cria usuários: as contas de teste são recriadas pelo `/cadastro`.

**Alternativa descartada:** migration de dados renomeando `Aceito` →
`Em andamento` e `Recebido` → `Doado`. Preservaria os dados, mas a P02 já
decidiu não converter, e a change 2.1 vai exigir o reset de qualquer forma
(alimentos sem nome livre).

### 7. URL das abas

O status vai na URL como está (`/pedidos?status=Em%20andamento`). Links antigos
com `?status=Aceito` deixam de ser um status válido e caem na aba padrão
(Pendente), que já é o comportamento atual para valor inválido. Não vale a pena
criar slugs só para isso.

### 8. Textos de "pedidos em aberto" na tela

O aviso de limite e o de pedido duplicado deixam de dizer "pedidos em
andamento (pendentes ou aceitos)" e passam a falar de **pedidos em aberto**
(pendentes ou em andamento). O aviso de limite **não** menciona cancelar
pedidos ainda: a ação só existe a partir da 3.2, que atualiza o texto.

## Risks / Trade-offs

- [Staging fica quebrado entre o deploy e o reset: pedidos apontam para
  "Aceito"/"Recebido", que o frontend novo não conhece] → Fazer o reset do
  staging logo após o merge em `develop`. Os dados são de teste.
- [Esquecer uma string antiga em algum canto] → Critério de pronto com `grep`
  vazio de "Aceito"/"Recebido" em `backend/src`, `backend/prisma` e
  `frontend/src`, além do tipo `Record<OrderStatusName, …>`, que quebra o build
  se faltar um status.
- [Contador da aba Cancelado faz uma requisição a mais por tela] →
  Aceitável: é uma consulta `pageSize=1`, como as outras quatro.
- [`ORDER_STATUS` duplicado entre backend e frontend] → Mesmo padrão do limite
  de 10 (`ORDERS_IN_PROGRESS_LIMIT`), já espelhado hoje. Comentário curto no
  frontend apontando o arquivo do backend.

## Migration Plan

1. Merge em `develop` (deploy automático no staging).
2. Limpar o banco do staging no Coolify e redeployar (migrate + seed).
3. Recriar as contas de teste pelo `/cadastro`.

Rollback: reverter o merge e limpar o banco de novo (o seed antigo recria os
nomes do MVP).
