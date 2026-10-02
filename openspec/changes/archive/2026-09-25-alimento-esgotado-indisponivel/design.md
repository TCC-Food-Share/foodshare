## Context

Ver `proposal.md` — "Why". Estado atual (`backend/src/foods/foods.service.ts`):

- "Alimento disponível" existe em **dois lugares que se espelham** (comentário no
  código: "keep both in sync"): `availableFoodWhereInput` (Prisma, usado por
  `findAvailableById` → `getById`, `POST /orders` e `PATCH /orders/:id/accept`) e
  `buildAvailableAndFilteredWhere` (SQL bruto, por causa do `unaccent`, usado na
  listagem/busca). Ambos: `deleted = false`, `status = 'Ativo'`,
  `expirationDate >= hoje (UTC)`. **Nenhum olha `quantity`.**
- `quantity` é `Decimal` com 2 casas. O aceite subtrai a quantidade do pedido de
  forma atômica (`updateMany` com `quantity >= pedido`), então um alimento chega a
  `0` exatamente quando os aceites somam o estoque.
- `orders.service.ts` **não** reimplementa a regra: chama `findAvailableById`. Os
  testes do serviço de pedidos mocam essa função, então não dependem do filtro.
- Frontend: feed/busca renderizam o que a API devolve; o detalhe do alimento já
  trata `404`; o F6 tem o card "sem quantidade" (rede de segurança) e o F8 o aviso
  de estoque no detalhe do pedido; o detalhe do **pedido** (RF20) lê o alimento
  como registro histórico, sem filtro de disponibilidade.

## Goals / Non-Goals

**Goals:**

- Uma definição de "disponível" que exclui alimento sem estoque, aplicada de forma
  idêntica em listagem, busca, detalhe, criação de pedido e aceite.
- Corrigir na origem (backend), sem duplicar a regra no cliente.

**Non-Goals:**

- Novo status de alimento ("Esgotado"), reativação/desativação manual (fora do
  escopo do MVP), tela "Meus alimentos" para o estabelecimento ver esgotados.
- Mudar o detalhe do pedido (RF20) ou o histórico: o alimento esgotado segue
  visível **dentro do pedido**.
- Devolver estoque (não existe cancelamento; rejeitar um `Pendente` nunca
  reservou nada).

## Decisions

### 1. Predicado derivado (`quantity > 0`) nos dois filtros, não um status novo

`availableFoodWhereInput` ganha `quantity: { gt: 0 }` e
`buildAvailableAndFilteredWhere` ganha `f.quantity > 0` (literal no SQL, sem novo
parâmetro). O comentário de sincronia continua valendo.

*Alternativa:* marcar o alimento como `Esgotado` (novo `FoodStatus`) no aceite que
zera o estoque — exige seed/migration, lógica de reativação (que não existe no
MVP) e deixa dois estados que podem divergir (`quantity` × status). O predicado
derivado é autocorretivo, não guarda estado extra e mantém o schema intacto.

### 2. Uma definição para todos os fluxos (decisão do usuário)

Como `findAvailableById` já alimenta detalhe, criação de pedido e aceite, mudar o
predicado muda os quatro de uma vez. Consequências de comportamento, todas
intencionais:

| Fluxo | Antes (`quantity = 0`) | Depois |
|---|---|---|
| `GET /foods`, busca | aparece | **não aparece** |
| `GET /foods/:id` | `200` | `404` |
| `POST /orders` | `400` "quantidade excede" | `404` "alimento não encontrado" |
| `PATCH /orders/:id/accept` | `409` "estoque insuficiente" | `409` "alimento indisponível" (pedido segue `Pendente`) |

A ordem de checagens do `accept` (pedido `Pendente` → alimento disponível → reserva
atômica) não muda. O último aceite que zera o estoque passa pela checagem **antes**
de subtrair (o alimento ainda tem quantidade), então não é bloqueado.

### 3. Frontend sem alteração de código

- O cliente do F8 deduz a causa de um `409` do aceite do pedido recarregado
  (status → estoque → "alimento indisponível"); com `quantity = 0` a checagem de
  estoque insuficiente vem **antes** da de "indisponível", então a mensagem
  continua correta ("Estoque insuficiente…"). Nada a ajustar.
- O card "sem quantidade" (F6) e o aviso de estoque (F8) ficam como rede de
  segurança para páginas abertas antes de o estoque zerar.
- Feed e busca: o alimento simplesmente não vem mais na resposta.

### 4. Sem migration e sem tratamento de dados existentes

O predicado é lido a cada consulta; alimentos que já estão com `quantity = 0`
somem sozinhos. Nenhum `UPDATE` de dados.

## Risks / Trade-offs

- **O estabelecimento deixa de ver o alimento esgotado** (o feed é o único lugar
  onde ele vê os próprios alimentos; não há "Meus alimentos" no MVP) → aceito, é a
  consequência direta de "esgotado não é disponível"; os pedidos daquele alimento
  seguem em "Pedidos recebidos" e o detalhe do pedido mostra o alimento.
- **Regra em dois lugares (Prisma + SQL)** → já era assim; o comentário de
  sincronia permanece e os testes de ambos os caminhos passam a cobrir
  `quantity`.
- **Link direto/aba antiga para um alimento que esgotou** → `404` "Alimento não
  encontrado" (mesmo tratamento do vencido), sem regressão de UX.
- **Corrida** (dois aceites simultâneos do mesmo alimento) → inalterada: a reserva
  atômica (`quantity >= pedido`) continua sendo a autoridade; o predicado só
  decide a visibilidade e a pré-checagem.
