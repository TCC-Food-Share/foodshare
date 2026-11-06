## Context

Motivação em `proposal.md`, comportamento nas specs desta change.

Estado atual que molda a solução:

- `FoodsService` só cadastra e lê. A busca do feed usa SQL cru por causa do `unaccent`
  e hidrata o resultado com Prisma.
- `OrdersService.accept` lê o pedido fora da transação e usa essa quantidade no desconto.
  `create` não usa transação.
- `Order` ainda não tem `type` nem `quantityUpdatedAt`.
- O frontend já tem `AdminTable`, `SearchableSelect` com `onSuggest`, `CreateFoodDialog` e
  o padrão de contagem de `useOrderCounts`.

## Goals / Non-Goals

**Goals:**

- Toda ação aplica suas consequências em uma única transação, sem corrida com aceite e
  criação de pedido.
- Os diálogos informam o efeito real antes da confirmação.

**Non-Goals:**

- Reescrever o aceite conforme a RN07 e validar a RN03 (3.1). Aqui `accept` e `create`
  só ganham a trava e o que ela exige.

## Decisions

### D1. Trava pela linha do alimento, sempre nesta ordem: alimento, depois pedidos

Toda operação que depende do estoque abre a transação com
`SELECT id FROM food WHERE id = $1 FOR UPDATE`, em um helper único
(`lockFood(tx, foodId)`, em `foods/food-order-effects.ts`), e só então lê alimento e pedidos.

Vale para editar, desativar, reativar, excluir, `OrdersService.create` e
`OrdersService.accept`.

- **Por que no `accept`:** hoje ele move o pedido e depois desconta do alimento. A edição
  travaria o alimento e depois atualizaria o pedido, em ordem inversa, o que gera impasse
  no Postgres. Além disso, a quantidade do pedido lida fora da transação pode estar antiga.
  Com a trava, ele relê pedido e disponibilidade dentro da transação. O update condicional
  (`quantity >= x`, status de origem no `where`) continua, como pede `docs/CONVENCOES.md`.
- **Por que no `create`:** sem a trava, um pedido pode ser gravado logo depois de uma
  desativação, ou com um tipo calculado sobre o estoque antigo.
- **Sem trava em `reject` e `receive`:** alteram uma linha de pedido com status de origem no
  `where`. Não há impasse, e os updates em lote das ações filtram por status.
- **Alternativa descartada:** só updates condicionais. Não cobre "nenhum pedido
  `Em andamento`", que depende de outra tabela.

A trava em `create` cobre conferência de disponibilidade, quantidade e gravação. As checagens
de limite e duplicidade (RN04, RN05) ficam como estão, para não mudar a precedência da RN06.

### D2. `Order.type` derivado até a 3.1 (DT28)

`create` calcula o tipo com o alimento travado: `PARTIAL_ONLY` dá `PARTIAL`; quantidade igual
ao estoque dá `TOTAL`; o resto dá `PARTIAL`. O cliente não envia o tipo, e o campo não aparece
nas respostas até haver quem o use. A 3.1 define como ele fica junto da RN03 e do modal.

### D3. Migration de `Order`

- `type` entra nulo, é preenchido e passa a `NOT NULL`, sem default. Assim, o banco recusa um
  pedido sem tipo. Preenchimento: pedido `Pendente` com quantidade igual ao estoque em alimento
  que não é `PARTIAL_ONLY` vira `TOTAL`; o resto vira `PARTIAL`.
- `quantityUpdatedAt` nulo e `@@index([foodId, statusId])`, conforme `docs/MODELO-DE-DADOS.md`.
- `acceptedAt`, `@@index([beneficiaryEntityId, statusId])` e `@@index([statusId, orderDate])`
  continuam fora, com a 3.1 e a 6.1.

### D4. Rotas

| Rota                                                      | Papel           | Observação                                              |
| --------------------------------------------------------- | --------------- | ------------------------------------------------------- |
| `GET /foods/mine?status&search&sort&order&page&pageSize`  | Estabelecimento | Declarada antes de `GET /foods/:id`                     |
| `GET /foods/mine/:id/quantity-impact?quantity`            | Estabelecimento | Só leitura                                              |
| `PATCH /foods/:id` `{ expirationDate?, quantity? }`       | Estabelecimento | JSON, sem imagem                                        |
| `PATCH /foods/:id/deactivate`                             | Estabelecimento |                                                         |
| `PATCH /foods/:id/reactivate` `{ expirationDate, quantity }` | Estabelecimento |                                                      |
| `DELETE /foods/:id?cancellationReasonId`                  | Estabelecimento | Query, porque corpo em `DELETE` não é confiável         |
| `GET /foods/:id`                                          | Instituições    | Passa a receber o usuário da sessão (D6)                |

`@RequireRoles(ROLE.ESTABLISHMENT)` no método substitui o papel da classe (`SetMetadata` com a
mesma chave; conferido com uma requisição real de entidade, que recebe `403`). Editar, desativar
e reativar devolvem o alimento atualizado com as contagens; excluir responde `204`.

Códigos novos em `foods.constants.ts`: `FOOD_NOT_ACTIVE`, `FOOD_NOT_INACTIVE`,
`FOOD_HAS_ORDERS_IN_PROGRESS` (`409`); `EXPIRATION_DATE_IN_PAST`,
`CANCELLATION_REASON_REQUIRED`, `INVALID_CANCELLATION_REASON` (`400`).

`checkFoodQuantity` é reaproveitada na edição e na reativação, e a data é comparada com
`startOfTodayUtc()`, a mesma base da disponibilidade. O DTO `@IsPositive` recusa quantidade
zero, como no cadastro. Nenhuma RN trata de estoque zero na edição, e a RN20 ficaria sem sentido
com um pedido total de 0.

### D5. Listagem em SQL cru, como o feed

`GET /foods/mine` segue o padrão de `list`: a página de ids sai de `$queryRaw` (por causa do
`unaccent`) e os dados vêm de `hydrate`.

- **Busca:** `unaccent(ci.name)`, `unaccent(cat.name)` e `unaccent(f.description)` com `ILIKE`;
  `f.quantity::text`, com a vírgula do termo trocada por ponto; `to_char(data, 'DD/MM/YYYY')`
  nas duas datas. O termo sempre vai parametrizado.
- **Ordenação:** mapa fixo de campo para coluna (`Prisma.raw` só sobre valores do mapa), com
  `f.id` como desempate. O DTO recusa campo fora da lista.
- **Contagens:** `groupBy` de `Order` por `foodId` e status para os ids da página, sem N+1 e
  sem mudar `FOOD_INCLUDE`. Pedidos com `deleted = true` não contam.

**Alternativa descartada:** filtro por coluna. O RF19 lista os campos de busca, e a `AdminTable`
já oferece um único campo.

### D6. Detalhe do dono

`getById(userId, id)` tenta o recorte de disponível e, se não achar, procura o alimento com
`deleted = false` e `establishment.userId = userId`. O `findAvailableById`, usado por pedidos,
não muda, então pedido e aceite continuam só sobre alimento disponível.

### D7. Prévia do efeito

A prévia conta, sem trava, os pedidos que a edição afetaria, usando os mesmos filtros de `where`
da edição (funções compartilhadas, para as duas não divergirem). Pode ficar desatualizada entre
abrir o diálogo e confirmar, mas a regra é reaplicada sob trava na hora de gravar.

Desativação e exclusão não precisam de rota nova: usam as contagens da listagem.

### D8. Frontend

- **Tela:** `features/foods/my-foods-page.tsx`, em `/meus-alimentos`, dentro de um
  `RoleRoute roles={['establishment']}`. Reaproveita `AdminTable` (busca, ordenação,
  paginação, `rowActions`, `toolbar`) e as abas de `orders-page`. Item "Meus alimentos" em
  `nav-items.ts`, só para estabelecimento.
- **Contagem das abas:** um `useMyFoodCounts` no padrão de `useOrderCounts`, lendo `total`.
- **Ações:** "Ver" como link para `/alimentos/:id` e as demais em `DropdownMenu`. Item
  indisponível fica desabilitado, com texto explicando o motivo.
- **Diálogos:** edição e reativação compartilham um formulário (react-hook-form + zod,
  `mode: 'onChange'`, com `checkFoodQuantity` do frontend). A edição envia só o que mudou:
  assim, um alimento já vencido pode ter a quantidade alterada sem esbarrar na DT26. A prévia é
  consultada com atraso de digitação e só com quantidade válida.
- **Motivo:** `useCancellationReasons` em `catalog-api.ts` e `SearchableSelect` com `onSuggest`
  abrindo `SuggestOptionDialog` com o tipo `CANCELLATION_REASON`.
- **Rótulos e selos:** `food-status.ts` com os nomes e um `FoodStatusBadge`, usado também no
  detalhe, que hoje pinta qualquer status de verde. Como o dono vê "Inativo" nessa tela, o selo
  precisa ficar correto.
- **Detalhe:** o card de solicitar doação já só aparece para `beneficiary`, então nada muda.
- **Erros:** mensagem por `code`, nunca pelo texto. Após cada ação, invalidar `['foods']` e
  `['orders']`.

## Risks / Trade-offs

- **Aba Reservado vazia até a 3.1** → o aceite ainda não muda o status. Os testes de serviço
  cobrem o estado com dados montados, e a verificação no navegador usa um alimento atualizado
  direto no banco local.
- **Aceite que zera o estoque deixa o alimento `Ativo` com quantidade 0 até a 3.1** → a edição
  é bloqueada pelo pedido `Em andamento`, e o feed já esconde quantidade 0. Comportamento
  existente, corrigido na 3.1.
- **Pedido antigo classificado pelo preenchimento pode divergir do que a entidade quis** → só há
  dados de teste (P02), e a regra usa a mesma derivação da criação.
- **Tipo derivado pode classificar como total um pedido feito em alimento `TOTAL_OR_PARTIAL`
  com a quantidade inteira** → é o que a RN03 descreve. Quando a 3.1 passar a receber a escolha
  da entidade, revisa a derivação.
- **Trava em `create` e `accept` serializa operações do mesmo alimento** → impacto baixo: a
  transação é curta e a disputa é por alimento.
- **Testes com mock não exercitam `FOR UPDATE`** → uma tarefa cobre a concorrência contra o
  Postgres local, com requisições paralelas.

## Migration Plan

1. `prisma migrate dev --name meus_alimentos` local. A migration preenche os pedidos, então não
   exige reset.
2. O deploy roda `migrate deploy`, como nas outras changes. Staging e produção não precisam de
   limpeza.
3. **Rollback:** reverter o código não exige reverter o banco, porque `type` não tem default.
   Código antigo não preencheria o campo, então, se houver rollback, uma migration nova deve
   tornar `type` opcional.

## Open Questions

Nenhuma. As quatro decisões em aberto foram respondidas na revisão desta proposta
(DT26–DT29).
