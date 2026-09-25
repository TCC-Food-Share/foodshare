## Context

Ver `proposal.md` — "Why". Estado herdado:

- **Backend** (`backend/src/orders/orders.service.ts`), ordem atual de
  `create(userId, dto)`: entidade da sessão (`404`) → contagem de em andamento
  ≥ 10 (`ConflictException`, RF15) → `foodsService.findAvailableById` (`404`) →
  `quantity` > estoque (`BadRequestException`) → cria com status "Pendente".
  "Em andamento" = `{ beneficiaryEntityId, deleted: false, status.name in
  IN_PROGRESS_STATUSES }` (`Pendente`, `Aceito`, em `orders.constants.ts`). O
  schema `Order` não tem constraint única sobre `(beneficiaryEntityId, foodId)`.
- **Corpo de erro**: não há filtro global de exceção; o Nest devolve o formato
  padrão (`{ statusCode, message, error }`) e as mensagens são em inglês
  (`docs/CONVENCOES.md`). Não existe precedente de campo `code` em erro.
- **Testes** (`orders.service.spec.ts`): unitários com `PrismaService` e
  `FoodsService` mockados. O mock `order.findFirst` tem como **padrão** um
  pedido `Pendente` (é o que `accept`/`reject`/`receive` precisam), e
  `order.count` tem padrão `0`. Os testes de `create` estão soltos no
  `describe` de topo, sem `describe` próprio.
- **Frontend** (F6, `frontend-solicitar-doacao`, ainda não arquivado —
  `frontend/src/features/orders/`): `use-orders-in-progress.ts` faz duas
  `useQueries` (`Pendente`, `Aceito`) com `GET /orders?status=&pageSize=1` só
  para somar `total`; `create-order-dialog.tsx` lê **qualquer** `409` como
  "limite atingido" (o `design.md` do F6 registra isso como risco: era o único
  `409` da rota); `request-donation-card.tsx` decide entre "sem quantidade",
  "limite" e "normal".
- **Rota do listing** (`GET /orders`): para uma entidade aplica
  `{ deleted: false, beneficiaryEntityId }` + `status` opcional e devolve, em
  cada linha, `food { id, name, quantityUnit }` — ou seja, dá para saber o
  alimento de cada pedido em andamento sem endpoint novo.

## Goals / Non-Goals

**Goals:**

- Impor "um pedido em andamento por entidade e alimento" no backend, que é quem
  decide; o frontend só antecipa.
- Deixar o cliente distinguir os dois motivos de `409` sem ler texto em inglês.
- Nenhum request novo no frontend para a checagem proativa.

**Non-Goals:**

- Garantia transacional/constraint no banco (ver decisão 4).
- Migrar, limpar ou bloquear retroativamente duplicados que já existem — a regra
  só age em pedidos novos.
- Linkar o pedido existente (`/pedidos/:id`) — F7.
- Mudar `docs/REQUISITOS.md`.

## Decisions

### 1. Checagem em `create`, depois do alimento e antes da quantidade

```ts
const food = await this.foodsService.findAvailableById(dto.foodId);
if (!food) throw new NotFoundException('Food not found.');

const duplicate = await this.prisma.order.findFirst({
  where: { ...inProgressWhere(beneficiaryEntity.id), foodId: food.id },
  select: { id: true },
});
if (duplicate) {
  throw new ConflictException({ statusCode: 409, error: 'Conflict', message: '…', code: DUPLICATE_ORDER_IN_PROGRESS });
}

if (new Prisma.Decimal(dto.quantity).greaterThan(food.quantity)) { … }
```

- `inProgressWhere(id)` extrai o `where` que hoje está inline na contagem do
  limite (`{ beneficiaryEntityId, deleted: false, status: { name: { in:
  IN_PROGRESS_STATUSES } } }`); o limite e a duplicidade passam a compartilhar
  **um** critério de "em andamento". O objeto do `count` do limite não muda, então
  o teste existente que o asserta continua valendo.
- **Depois do alimento**: um alimento inexistente/indisponível segue `404` mesmo
  que a entidade tenha um pedido antigo para ele (spec: "Alimento que deixou de
  estar disponível"); e usa `food.id` já confirmado, não o `dto.foodId` cru.
- **Antes da quantidade**: duplicidade é conflito de estado, quantidade é
  validação de entrada — mesma distinção que já põe o limite antes do resto.
- **Depois do limite**: o limite é a trava sobre o ator e continua sendo a
  primeira (spec do RF15: "antes de qualquer validação do alimento").
- `findFirst({ select: { id: true } })` em vez de `count`: só interessa a
  existência, e evita reusar `order.count` (já usado pelo limite) — no teste, duas
  chamadas de `count` com o mesmo `mockResolvedValue` se confundiriam.
- Alternativa descartada: checar duplicidade **junto** do limite, antes do
  alimento. Faria um `foodId` inexistente virar `409` em vez de `404` para quem
  já pediu aquele id, e misturaria um conflito por-alimento com a trava por-ator.

### 2. `code` no corpo do `409`, nos dois motivos

```ts
// orders.constants.ts
export const ORDER_CONFLICT_CODES = {
  limitReached: 'ORDERS_IN_PROGRESS_LIMIT_REACHED',
  duplicateInProgress: 'DUPLICATE_ORDER_IN_PROGRESS',
} as const;
```

`ConflictException` recebe o objeto `{ statusCode: 409, error: 'Conflict',
message, code }` — o mesmo envelope de sempre mais `code`, então quem só lê
`message` (o `extractMessage` do `lib/api.ts`) não muda.

- **Por quê**: o F6 lê `409` como "limite". Com dois motivos isso deixaria de ser
  verdade, e a saída fácil (casar o texto da `message`) acopla o frontend a uma
  string em inglês que a convenção do projeto permite reescrever.
- **Nos dois, não só no novo**: se só a duplicidade tivesse `code`, "`409` sem
  código = limite" continuaria como convenção implícita — exatamente o
  acoplamento que esta change tira. Adicionar `code` ao limite é aditivo (a
  `message` e o status não mudam) e custa uma linha.
- Alternativas descartadas: (a) casar a `message` — frágil; (b) outro status
  para a duplicidade (ex.: `422`) — o projeto usa `409` para "conflito com o
  estado" (cadastro duplicado, limite) e um status isolado só para esta rota
  seria inconsistente; (c) `code` só no novo, `409` sem código = limite —
  assimétrico, ver acima.
- Documentar no Scalar: `@ApiConflictResponse` do `POST /orders` lista os dois
  motivos com os `code`, em pt-BR (texto explicativo pt-BR, valores em inglês —
  `docs/CONVENCOES.md`).

### 3. Frontend — `blocked` no lugar de `limitReached`, e a checagem proativa sem request novo

**Contrato lido no cliente** (`orders-api.ts`):

```ts
export const ORDER_CONFLICT_CODES = { limitReached: '…', duplicateInProgress: '…' } as const; // espelha o backend
export function conflictCode(error: unknown): string | undefined { /* ApiError 409 → body.code */ }
```

**Modal** (`create-order-dialog.tsx`): o `useState<boolean>` `limitReached` vira
`useState<'limit' | 'duplicate' | null>` (`blocked`). No `409`: código do limite
→ `'limit'`; código de duplicidade → `'duplicate'`; qualquer outro `409` →
banner genérico (`serverError = 'network'`). Os dois estados bloqueados usam o
mesmo layout — aviso no lugar do formulário, footer `Fechar` + `Ver meus
pedidos` — e ambos invalidam `['orders']`, então o card atrás já reflete.
Continuam sendo ramos de JSX distintos do formulário (regra do trap do submit
herdada do F2/F6); nenhum botão alterna `type`.

**Card** (`request-donation-card.tsx`) — precedência, espelhando a ordem do
backend (limite antes da duplicidade):

1. sem quantidade (`quantity <= 0`);
2. limite atingido → `OrderLimitNotice` + botão desabilitado;
3. **já há pedido em andamento deste alimento** → `DuplicateOrderNotice` + botão
   desabilitado;
4. normal.

- Espelhar o backend evita a mesma situação mostrar um aviso no card e outro no
  `409` (uma entidade com 10 em andamento, um deles deste alimento, vê "limite"
  nos dois lugares). O custo é que, ao liberar uma vaga, ela pode ainda encontrar
  o aviso de duplicidade — que é verdade e aparece no lugar certo.
- **Sem request novo**: `useOrdersInProgress` continua com as duas consultas
  (`Pendente`, `Aceito`), mas `countOrdersByStatus` (`pageSize=1`, devolve só
  `total`) vira `listOrdersByStatus` (`pageSize=50`, devolve a página). O hook
  expõe `count` (soma dos `total`, exato), `limitReached` (como hoje) e
  `hasInProgressOrderFor(foodId)` (algum `order.food.id === foodId` nas linhas
  carregadas). Chave `['orders', 'in-progress', status]`, ainda sob `['orders']`
  para as invalidações do F6/F8.
- **Por que `pageSize=50` é exato**: RF15 mantém as em andamento em ~10 por
  entidade (uma corrida pode passar disso por poucas unidades), muito abaixo do
  teto de 50 da página — todas as linhas em andamento cabem numa página por
  status. O `count` segue vindo do `total`, exato mesmo assim.
- Payload: até ~10 linhas de resumo de pedido (a mesma forma que a listagem do F7
  vai usar) em vez de 2 linhas; irrelevante frente ao RNF04.
- `hasInProgressOrderFor` é definitivo quando encontra (um achado não depende da
  outra consulta ter carregado); `false` enquanto carrega ou se falhar — mesmo
  contrato consultivo do limite: o backend decide.
- **Estilo: warning, não erro.** "Você já pediu este alimento" não é uma falha —
  é um estado esperado, e um aviso vermelho (`destructive`) assusta e sugere que
  algo deu errado. O `DuplicateOrderNotice` usa a variante `warning` do `Alert`,
  a mesma do `OrderLimitNotice` (criada com ele no F6: fundo âmbar suave, borda
  âmbar, ícone de triângulo âmbar e **texto no tom normal**, sobre o token
  `--warning` de `styles/index.css`) — os dois avisos de "não dá para pedir agora"
  ficam com o mesmo tratamento visual.
- **Textos (pt-BR)** do `DuplicateOrderNotice` (mesmo molde do `OrderLimitNotice`):
  - Título: "Sua entidade já tem um pedido em andamento para este alimento"
    ("Sua entidade", como no aviso de limite).
  - Descrição: "Esse pedido ainda está pendente ou aceito. Acompanhe em Meus
    pedidos; quando ele for concluído, você poderá solicitar este alimento
    novamente."
- Alternativa descartada: endpoint/param novo (`GET /orders?foodId=`) para a
  checagem proativa — mudança de backend e de spec de listagem para poupar uma
  filtragem em memória de ≤ 10 linhas.

### 4. Sem constraint no banco; corrida aceita

A checagem é "consulta e depois insere", igual à do limite (a change
`limite-pedidos-em-andamento` aceitou a mesma corrida). Duas requisições
simultâneas da mesma entidade para o mesmo alimento podem passar as duas.

- **Índice único parcial** (`(beneficiaryEntityId, foodId)` onde o pedido é
  não excluído e em andamento) fecharia a corrida, mas: o Prisma não modela índice
  parcial (migration com SQL cru e risco de drift no `schema.prisma`, que é a
  "única fonte de verdade"); o predicado precisaria de `statusId` fixo (ids do
  seed) ou de uma coluna nova; e "em andamento" muda quando os status mudam. É
  desproporcional ao dano.
- **Dano da corrida**: dois pedidos `Pendente` do mesmo alimento — exatamente o
  que acontece hoje, sem a regra, e que o estabelecimento resolve rejeitando um.
  A regra reduz o caso comum (a pessoa clicar de novo mais tarde), não promete
  exclusão mútua. No modal, o botão fica `disabled` durante `isPending`, o que
  cobre o duplo clique.

### 5. Testes (backend)

Os testes de `create` entram num `describe('create')` com `beforeEach` que põe
`order.findFirst` → `null`, porque o padrão do mock (um pedido `Pendente`, para
`accept`/`reject`/`receive`) faria toda criação parecer duplicada. Casos novos:

- cria quando não há pedido em andamento do alimento (`findFirst` → `null`);
- `ConflictException` com `code` de duplicidade quando `findFirst` acha um
  pedido, e `order.create` não é chamado;
- o `where` do `findFirst` é `{ beneficiaryEntityId: <sessão>, foodId:
  <food.id>, deleted: false, status: { name: { in: ['Pendente', 'Aceito'] } } }`
  (cobre isolamento por entidade e por alimento, soft-delete e terminais, na
  mesma asserção que já cobre o limite);
- alimento indisponível → `NotFoundException` sem chamar `findFirst`;
- limite prevalece → `ConflictException` com o `code` do **limite**, sem chamar
  `findFirst` nem `findAvailableById`;
- duplicidade antes da quantidade: `findFirst` acha pedido + quantidade acima do
  estoque → `ConflictException`, não `BadRequestException`;
- o `code` do `409` do limite (o teste do limite existente passa a conferir o
  `code`).

## Risks / Trade-offs

- **Corrida** (duas requisições simultâneas) → aceito, ver decisão 4.
- **Aviso velho no card** (o pedido em andamento foi rejeitado/recebido por
  outra via e o `staleTime` de 30s ainda não expirou) → o botão pode ficar
  desabilitado até o próximo refetch/recarga; as mutations do F8 invalidam
  `['orders']`, então o caso comum (a própria entidade confirma o recebimento) se
  resolve sozinho. O caso oposto (botão habilitado, backend recusa) cai no `409`.
- **Frontend novo com backend velho** (staging faz deploy separado): um `409` do
  limite sem `code` cairia no banner genérico em vez do estado de limite →
  degrada, não quebra, e a checagem proativa do card ainda avisa antes de enviar.
  Janela curta de deploy; sem código de compatibilidade.
- **`code` no `409` do limite** altera o corpo de uma resposta existente →
  aditivo (`message`/status inalterados); nenhum consumidor além do frontend do
  F6 lê o corpo.
- **Duplicados já existentes** no banco (ex.: dados de teste) → não são
  tocados; a regra só barra os novos.
- **Precedência do card** (limite antes de duplicidade) → uma entidade no limite
  que já pediu aquele alimento vê só "limite"; ao liberar uma vaga passa a ver
  "duplicidade". Mostrar os dois ao mesmo tempo poluiria o card por um caso raro.

## Migration Plan

1. Backend e frontend na mesma entrega (monorepo). Sem migration, sem seed.
2. Ordem das tasks: constantes/`where` compartilhado → serviço → testes
   (`npm test`, `lint:check`, `build` no `backend/`) → doc Scalar → frontend
   (`orders-api` → hook → aviso → modal → card) → verificação de ponta a ponta →
   `openspec validate --strict`.
3. Rollback = reverter o PR: a regra some e o `409` do limite volta a não ter
   `code`; o frontend do F6 continua compatível (o `409` sem código cai no
   banner genérico, a checagem proativa do limite segue funcionando).

## Open Questions

Nenhuma que mude a spec, a abordagem ou o recorte de tasks:

- Se, com o F7 pronto, o aviso de duplicidade deve linkar direto o pedido
  existente (`/pedidos/:id`) em vez da lista — o hook já tem a linha do pedido,
  então a troca é local; decisão de fluxo do F7.
