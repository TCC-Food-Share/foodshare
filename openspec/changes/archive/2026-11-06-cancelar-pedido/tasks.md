## 1. Backend: schema e migration

- [x] 1.1 Em `prisma/schema.prisma`, criar o enum `OrderCancelledBy` (`ESTABLISHMENT`, `BENEFICIARY_ENTITY`, `ADMINISTRATOR`, `SYSTEM`) e o campo `Order.cancelledBy OrderCancelledBy?`
- [x] 1.2 Gerar a migration com `prisma migrate dev --create-only` e acrescentar o `UPDATE` que preenche `ESTABLISHMENT` nos pedidos `Cancelado` (design D5). Aplicar no local e pedir o restart do `start:dev`
- [x] 1.3 Conferir no banco local que os pedidos já cancelados ficaram com `ESTABLISHMENT` e os demais com nulo

## 2. Backend: motivo e devolução compartilhados

- [x] 2.1 Adicionar `ORDER_CONFLICT_CODES.notOpen = 'ORDER_NOT_OPEN'` (os códigos do motivo ficam em `foods/foods.constants.ts`, design D2)
- [x] 2.2 Extrair `assertSelectableReason(tx, id)` de `FoodsService` para `orders/cancellation-reason.ts` e usar o helper em `FoodsService.remove`
- [x] 2.3 Em `FoodsService.remove`, gravar `cancelledBy: ESTABLISHMENT` nos pedidos `Em andamento` cancelados, e ajustar o teste da exclusão
- [x] 2.4 Criar `returnReservedQuantity(tx, foodId, quantity)` em `foods/food-order-effects.ts` (design D4):
  - não faz nada se o alimento está excluído;
  - devolve a quantidade com `increment`;
  - troca `Reservado` por `Ativo`;
  - chama `applyNewQuantityToPendingOrders` com o novo estoque.

## 3. Backend: rota de cancelamento

- [x] 3.1 Criar `orders/dto/cancel-order.dto.ts` com `cancellationReasonId?` (`@IsOptional() @IsInt() @Min(1)`) e a descrição no Swagger
- [x] 3.2 Implementar `OrdersService.cancel` pela sequência do design D3. A parte vem da sessão e define o `cancelledBy`. O motivo é validado antes da trava. Depois vêm `lockFood`, a releitura do pedido, `ORDER_NOT_OPEN`, o CAS com o motivo e quem cancelou, e a devolução quando o pedido estava `Em andamento`
- [x] 3.3 Adicionar `PATCH /orders/:id/cancel` no `OrdersController`, com `@ApiOperation` (RF26, RN09, DT32) e as respostas `200`, `400` (os dois códigos), `404`, `409` (`ORDER_NOT_OPEN`) e `401`
- [x] 3.4 Incluir `cancellationReason` (`{ id, name } | null`) e `cancelledBy` (enum ou `null`) em `OrderResponseDto` e `OrderDetailResponseDto`, nos includes da listagem e do detalhe e nos mapeadores `toResponse` e `toDetailResponse`

## 4. Backend: testes

- [x] 4.1 Testar `cancel` em `orders.service.spec.ts`:
  - entidade e estabelecimento cancelam pendente e em andamento, com o `cancelledBy` certo;
  - motivo ausente, inexistente e de sistema (`400` com cada código, nada muda);
  - `409 ORDER_NOT_OPEN` para `Rejeitado`, `Doado` e `Cancelado`, sem trocar o motivo gravado;
  - `404` para quem não é parte, para pedido excluído e para conta sem instituição.
- [x] 4.2 Testar a devolução:
  - pendente não mexe no alimento nem nos outros pedidos;
  - em andamento soma ao estoque;
  - `Reservado` → `Ativo`;
  - alimento com outro pedido `Em andamento`;
  - alimento vencido também volta a `Ativo`;
  - alimento excluído não muda.
- [x] 4.3 Testar a DT32: o total pendente passa a pedir o novo estoque com `quantityUpdatedAt`; o parcial pendente não muda; o cancelamento de pendente não ajusta os totais
- [x] 4.4 Testar que a listagem e o detalhe trazem `cancellationReason` e `cancelledBy` no pedido cancelado, e nulos nos demais

## 5. Frontend: API e rótulos

- [x] 5.1 Em `orders-api.ts`:
  - `cancelOrder(id, cancellationReasonId)`;
  - o tipo `OrderCancelledBy`;
  - os campos `cancellationReason` e `cancelledBy` em `Order` e `OrderDetail`;
  - `ORDER_CONFLICT_CODES.notOpen`.
- [x] 5.2 Em `order-status.ts`, criar `cancelledByLabel(cancelledBy, role)` ("Você", "Estabelecimento", "Entidade", "Nossa equipe", "Automático") e `cancelledBySentence(cancelledBy, role)` com as quatro frases da spec, sem a palavra "administrador"
- [x] 5.3 Fazer `situationText` receber o pedido e, para `Cancelado`, usar `cancelledBySentence`, e atualizar quem chama

## 6. Frontend: ação e diálogo de cancelamento

- [x] 6.1 Criar `features/orders/order-cancel-dialog.tsx` pelo design D7:
  - select de motivos com busca e "Sugerir nova opção";
  - erro de campo sem motivo;
  - descrição por status, com a quantidade devolvida no `Em andamento`;
  - tratamento de `409 ORDER_NOT_OPEN`, `400 INVALID_CANCELLATION_REASON` e `404`;
  - invalidação de `['orders']`, `['foods']` e `['food']` no sucesso.
- [x] 6.2 Em `OrderActionsCard`, mostrar "Cancelar pedido" (`ghost`, texto destrutivo, último botão) para as duas partes quando o status é `Pendente` ou `Em andamento`, com o mesmo cuidado de foco ao fechar que as outras ações têm
- [x] 6.3 No card de situação do pedido `Cancelado`, mostrar a frase de quem cancelou e o motivo
- [x] 6.4 Atualizar o texto do `OrderLimitNotice` para citar o cancelamento (DT07)

## 7. Frontend: aba "Cancelado"

- [x] 7.1 Passar o status da aba para `OrdersTable` e `OrderCards`
- [x] 7.2 Em `OrdersTable`, na aba `Cancelado`, trocar a coluna "Status" por "Motivo" e "Cancelado por"
- [x] 7.3 Em `OrderCards`, na aba `Cancelado`, mostrar o motivo e quem cancelou no card

## 8. Documentação

- [x] 8.1 Em `docs/REQUISITOS.md`, registrar a DT32 (totais pendentes acompanham o estoque devolvido) e a DT33 (`Order.cancelledBy`, seus valores e quem grava cada um)
- [x] 8.2 Em `docs/MODELO-DE-DADOS.md`, registrar o enum `OrderCancelledBy` e o campo `Order.cancelledBy`, com o preenchimento da migration

## 9. Verificação

- [x] 9.1 Rodar lint, testes e build de backend e frontend, com o `start:dev` desligado no build do backend
- [x] 9.2 Verificar a concorrência contra o Postgres local, com requisições paralelas, sem estoque devolvido duas vezes e sem erro de impasse:
  - dois cancelamentos do mesmo pedido `Em andamento` (um `200`, outro `409 ORDER_NOT_OPEN`);
  - cancelamento e aceite do mesmo pendente;
  - cancelamento e confirmação do mesmo pedido `Em andamento`.
- [x] 9.3 Verificar ponta a ponta no navegador, com estabelecimento e entidade:
  - cancelar pendente pelos dois lados;
  - cancelar em andamento de alimento `Reservado` e conferir o alimento `Ativo` de volta no feed e em "Meus Alimentos";
  - total pendente ajustado depois da devolução;
  - "Sugerir nova opção" a partir do diálogo;
  - aba "Cancelado" e detalhe com motivo e quem cancelou, dos dois lados, inclusive o pedido cancelado pela exclusão do alimento;
  - console limpo.
- [x] 9.4 Conferir o diálogo, a aba "Cancelado" e os cards a 400 px e nos temas claro e escuro
- [x] 9.5 Marcar ✅ no item 3.2 de `docs/PLANO-IMPLEMENTACAO.md`
