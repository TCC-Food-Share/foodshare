## Context

A motivação está em `proposal.md` e o comportamento em `specs/`. O que existe hoje em `develop`:

- **`OrdersService.list`** monta um `Prisma.OrderWhereInput` (`deleted: false`, dono pela sessão, status) e usa
  `findMany` + `count`. Não há busca.
- **`OrdersService.getById`** já inclui `establishment` e `beneficiaryEntity` com `address`, mas
  `toDetailResponse` descarta e-mail, celular e endereço. Não olha `deleted` das instituições, só o do pedido.
- **Busca em "Meus alimentos"** (`FoodsService.buildMyFoodsWhere`): SQL cru com `unaccent(...) ILIKE`, mais
  `to_char(..., 'DD/MM/YYYY') ILIKE` para a data. O DTO aceita `search` aparado, até 100 caracteres
  (`trimToUndefined`). No frontend, a tela usa o `AdminTable` com campo de busca.
- **Telefone institucional** é guardado com máscara (`(11) 3456-7890` ou `(18) 99123-4567`), validado por
  `^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$`.
- **`Order.quantityUpdatedAt`** já é gravado (edição, aceite, cancelamento), mas nenhuma resposta o devolve.
- **Frontend:** `OrdersPage` guarda status e página no endereço; `useOrderCounts` chama `listOrders` uma vez por
  status; `CounterpartCard` mostra só nome, cidade e descrição.

## Goals / Non-Goals

**Goals:**

- Uma única regra decide quando o contato aparece, no backend. O frontend só mostra o que vier preenchido.
- A busca reaproveita o que "Meus alimentos" já faz (acento, data), sem criar outro jeito.

**Non-Goals:**

- Busca por outros campos (categoria, quantidade, descrição) nem ordenação por coluna. O RF27 pede alimento, data
  e estabelecimento.
- Índice ou `pg_trgm` para a busca. O volume por instituição é pequeno (limite de 10 pedidos em aberto por
  entidade); pode ser revisto se virar problema.
- Contato no administrador (5.5) e perfil público (4.3).

## Decisions

### 1. `search` único, como em "Meus alimentos" (DT34)

`ListOrdersQueryDto` ganha `search?: string` com `@Transform(trimToUndefined)`, `@IsString()` e
`@MaxLength(100)`. O `trimToUndefined` hoje é local de `list-my-foods-query.dto.ts`; sobe para
`common/` e as duas DTOs o usam.

- **Alternativa recusada:** três parâmetros (`food`, `date`, `establishment`). A tela teria três campos para uma
  lista curta, e "Meus alimentos" já estabeleceu o campo único.

### 2. Busca por subconsulta de ids, mantendo o `findMany` do Prisma

`unaccent` não existe no Prisma Client. Quando há `search`, o service roda um `$queryRaw` que devolve só os `id`
dos pedidos do dono que casam, e o `where` do Prisma ganha `id: { in: ids }`. Sem `search`, nada muda.

```sql
SELECT o.id
FROM "order" o
JOIN food f ON f.id = o."foodId"
JOIN food_catalog_item ci ON ci.id = f."catalogItemId"
JOIN establishment e ON e.id = o."establishmentId"
WHERE o.deleted = false AND <dono> AND (
     unaccent(ci.name) ILIKE '%' || unaccent(${term}) || '%'
  OR unaccent(e."companyName") ILIKE '%' || unaccent(${term}) || '%'
  OR unaccent(COALESCE(e."tradeName", '')) ILIKE '%' || unaccent(${term}) || '%'
  OR to_char(o."orderDate" AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') ILIKE '%' || ${term} || '%'
)
```

- Os nomes de tabela e coluna acima são ilustrativos; o apply confere em `schema.prisma` (`@@map`).
- O `term` entra sempre como parâmetro do `Prisma.sql`, nunca concatenado. Os `%` e `_` digitados pelo usuário
  contam como curinga do `ILIKE`; é o comportamento atual de "Meus alimentos" e não vaza dado, porque o recorte
  de dono está no mesmo `WHERE`.
- O filtro de status continua no `where` do Prisma, depois do `id in`. O `count` usa o mesmo `where`, então `total`
  e páginas batem.
- **Alternativa recusada:** `contains` com `mode: 'insensitive'` do Prisma. Resolve maiúsculas, mas não acento, e a
  data exigiria outro caminho. **Outra recusada:** reescrever a listagem inteira em SQL cru, que perderia o
  `include` e o mapeamento já testados.
- O `orderDate` é `timestamp` sem fuso no Postgres (Prisma `DateTime`, gravado em UTC). O correto é
  `orderDate AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'`. O apply confere o tipo da coluna na migration e
  fixa a expressão com um teste às 22:30 de Brasília.

### 3. A regra do contato mora em `toDetailResponse`

`getById` já resolve quem é o solicitante (estabelecimento ou entidade). `toDetailResponse(order, viewer)` recebe o
papel e o status do pedido:

- `showContact = order.status.name === ORDER_STATUS.IN_PROGRESS`;
- a instituição da **outra** parte sai com `institutionalEmail`, `institutionalPhone` e `address` quando
  `showContact`; senão, `null`;
- a instituição do solicitante sai sempre com os três em `null`.

O DTO de instituição passa a ter os três campos como `nullable`. O `address` é um objeto novo
(`postalCode`, `street`, `number`, `complement`, `city`, `state`).

- **Alternativa recusada:** rota separada `GET /orders/:id/contact`. O RF28 pede o contato no detalhe, e duas
  rotas obrigariam a tela a decidir quando chamar a segunda, duplicando a regra.
- **Alternativa recusada:** devolver o contato sempre e esconder na tela. Quebra a RN12/RN36: o dado estaria no
  JSON de qualquer pedido.
- **Corrida:** aceite, cancelamento e confirmação trocam o status numa transação. O detalhe lê o pedido e a
  instituição numa só consulta (`include`), então a resposta nunca mistura status velho com contato novo.

### 4. Exclusão lógica da instituição não entra no `where` do detalhe

O `where` do detalhe filtra `deleted: false` só do **pedido**. A RN12 trata da exclusão da instituição, e as RN28 e
RN29 já preservam o pedido (`Doado` e `Cancelado`) quando a outra parte continua ativa. Então:

- instituição excluída, pedido preservado: o detalhe responde (é o caso que a RN12 protege);
- pedido com `deleted = true`: continua `404` (RN14). É o caso dos pedidos que a RN29 marca como excluídos junto
  com a entidade, e que o estabelecimento não precisa mais ver.

Nada muda no código além de **não** acrescentar filtro de instituição. A decisão fica registrada para que a 4.4 e a
5.3 não "corrijam" isso depois, e coberta por teste com `Establishment.deleted = true`.

### 5. `quantityUpdatedAt` no detalhe, não na listagem

Só o detalhe mostra o aviso (plano 3.3). Entra em `OrderDetailResponseDto` como `Date | null`. A listagem não muda.

### 6. WhatsApp no frontend, helper puro

`lib/whatsapp.ts` exporta `whatsappUrl(phone: string): string | null`:

- `digits = phone.replace(/\D/g, '')`;
- se `digits.length === 11`, devolve `https://wa.me/55${digits}`; senão `null` (DT35).

O botão usa `<a href target="_blank" rel="noopener noreferrer">`. Com `null`, a tela mostra só o texto do número.
O helper tem teste de unidade (máscara, parênteses, 10 e 11 dígitos).

- **Alternativa recusada:** mandar o `wa.me` pronto na API. O link é detalhe de apresentação, e a API devolveria
  um campo a mais para manter.
- **Não incluir `?text=`:** mensagem pré-preenchida é outra decisão de produto.

### 7. Tela: busca guardada no endereço, contagens seguindo a busca

- `OrdersPage` lê `search` do endereço junto de `status`, `page` e `pageSize`. O `ordersParams` inclui `search`
  quando não vazio. Trocar o texto volta para a página 1.
- O campo usa debounce de 300 ms antes de mudar o endereço, para não disparar uma consulta por tecla.
- A `queryKey` da listagem e a de `useOrderCounts` ganham `search`. As cinco consultas das abas passam o mesmo
  `search`.
- O campo de busca é um `Input` com ícone, no molde do `AdminTable`. Se o `AdminTable` não der para reusar sem
  trazer a tabela junto, extrai-se só o campo (`SearchInput`) para `components/` e os dois usam.
- Sem resultado com busca ativa: estado "Nenhum pedido corresponde à busca" com "Limpar busca"; o estado vazio de
  quem não tem pedidos continua para a busca vazia.
- O card de contato é um componente novo (`CounterpartContactCard`) renderizado quando `order.status.name` é
  `Em andamento` **e** a outra parte traz contato. Se por algum motivo o contato vier `null` nesse status, o card
  não aparece (a tela não decide a regra).

## Risks / Trade-offs

- [Contato vazar em status errado] → a regra é uma só, no `toDetailResponse`, com teste por status e por papel; a
  verificação final confere o JSON (não só a tela), inclusive na própria instituição.
- [`ILIKE` com `%` do usuário vira curinga] → igual a "Meus alimentos"; o recorte de dono está no mesmo `WHERE`,
  então no máximo o usuário filtra os próprios pedidos de um jeito inesperado.
- [Fuso errado na data] → expressão fixada por teste às 22:30 de Brasília; se a coluna for `timestamp` sem fuso, a
  conversão dupla do item 2 é obrigatória.
- [Cinco consultas de contagem por busca] → debounce de 300 ms e `pageSize` mínimo nas contagens (já é o padrão do
  `useOrderCounts`).
- [Telefone fixo sem WhatsApp] → DT35: a tela mostra o número sem o botão. Se a dupla preferir mostrar o botão para
  qualquer número, é trocar a condição do helper.
- [Endereço de instituição excluída aparece no detalhe de pedido histórico] → é o que a RN12 pede; só vale enquanto
  o pedido está `Em andamento`, e a exclusão de conta já cancela esses pedidos (RN28, RN29), então na prática o
  histórico não traz contato.
