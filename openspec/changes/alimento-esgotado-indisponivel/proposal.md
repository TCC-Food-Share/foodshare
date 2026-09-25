## Why

Um alimento cujos pedidos aceitos reservaram **toda** a quantidade (`quantity = 0`)
continua aparecendo no feed, na busca e no detalhe, e ainda aceita pedidos.
Reproduzido em teste manual: alimento cadastrado com 5 kg, pedido de 3 kg aceito,
pedido de 2 kg (o total restante) aceito → estoque 0 kg, mas o alimento segue na
listagem. Causa: o recorte de "alimento disponível" (`status = Ativo`, não
excluído, não vencido) **nunca olhou a quantidade** — o `design.md` do F6 até
registra isso ("o `disponível` do backend não olha a quantidade") e o frontend
contornou com um card "sem quantidade". Um alimento esgotado não pode ser
solicitado nem aceito; mantê-lo visível só gera pedido que nasce condenado ao
`400`/`409`. A regra precisa mudar na fonte.

## What Changes

- **Definição única de "disponível" passa a exigir quantidade atual maior que
  zero**: `status = Ativo` **e** não excluído **e** não vencido **e** `quantity > 0`.
  O mesmo recorte já é compartilhado por quatro fluxos, então a mudança vale para
  todos de uma vez:
  - **Listagem e busca** (RF11, RF12): alimento esgotado deixa de aparecer;
    nenhum filtro o traz de volta.
  - **Detalhe do alimento** (RF13): por link direto, alimento esgotado responde
    "não encontrado" — como já acontece com o vencido.
  - **Solicitação de pedido** (RF14): pedido para alimento esgotado responde
    "alimento não encontrado" (antes: `400` "quantidade excede o disponível").
  - **Aceite de pedido** (RF16): aceitar um pedido `Pendente` cujo alimento
    esgotou (por outros aceites) segue recusado por conflito de estado; o motivo
    passa a ser "alimento indisponível" em vez de "estoque insuficiente" — o
    pedido continua `Pendente` e pode ser rejeitado.
- **Sem mudança de schema, migration nem dados**: alimentos que já estão com
  `quantity = 0` simplesmente deixam de aparecer.
- **Frontend sem alteração de código.** O feed e a busca já renderizam o que a API
  devolve; o detalhe do alimento já trata `404` ("Alimento não encontrado"); o
  card "sem quantidade" do F6 e o aviso de estoque do F8 passam a ser rede de
  segurança (página aberta antes de o estoque zerar). O detalhe do **pedido**
  (RF20) não muda: continua mostrando o alimento como registro histórico, agora
  com "Disponível agora 0 kg".
- **Efeito colateral aceito**: o estabelecimento também deixa de ver o alimento
  esgotado no feed. O MVP não tem "Meus alimentos" (fora do escopo, ver
  `docs/PLANO-FRONTEND.md`); os pedidos daquele alimento seguem em "Pedidos
  recebidos".

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `alimentos/listagem`: a definição de alimento disponível na listagem e na busca
  passa a exigir quantidade maior que zero.
- `alimentos/detalhe`: o detalhe só retorna alimento disponível, agora incluindo
  quantidade maior que zero.
- `pedidos/solicitacao`: pedido só para alimento disponível — alimento esgotado é
  "não encontrado".
- `pedidos/aceite`: o aceite exige alimento ainda disponível — alimento esgotado
  é recusado por conflito de estado.

## Impact

- **Backend**: `backend/src/foods/foods.service.ts` (os dois filtros de
  disponibilidade — Prisma e SQL bruto — que já se espelham) e
  `backend/src/foods/foods.service.spec.ts`. `orders.service.ts` não muda (usa
  `findAvailableById`).
- **API**: `GET /foods`, `GET /foods/:id`, `POST /orders` e `PATCH /orders/:id/accept`
  mudam de comportamento **só** para alimento com quantidade 0.
- **Frontend**: nenhuma mudança de código; verificação no browser.
- **Docs**: `docs/PLANO-FRONTEND.md` (nota do F6 sobre `quantity = 0`).
- **Dependências / migrations**: nenhuma.
