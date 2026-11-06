## 1. Documentação de requisitos

- [x] 1.1 Em `docs/REQUISITOS.md`, registrar a DT30 (a sobra de "Somente parcial" pode ser pedida inteira e o pedido é parcial) e citá-la no texto da RN03
- [x] 1.2 Em `docs/REQUISITOS.md`, registrar a DT31 e ajustar o texto da RN07, do RF23 e da máquina de estados do pedido:
  - com estoque restante, os totais pendentes passam a pedir o novo estoque, com a data da alteração, e só os parciais que não cabem viram `Rejeitado`;
  - com estoque zerado, todos os pendentes viram `Rejeitado`.

## 2. Banco

- [x] 2.1 Em `schema.prisma`, adicionar `acceptedAt DateTime?` e `@@index([beneficiaryEntityId, statusId])` em `Order`
- [x] 2.2 Gerar a migration `pedido_tipo_e_reserva`, com o preenchimento de `acceptedAt = "updatedAt"` nos pedidos `Em andamento`, buscando o status pelo nome (design D5)
- [x] 2.3 Conferir que `prisma migrate dev` aplica sobre um banco com pedidos e que `prisma generate` atualiza o client

## 3. Backend: base

- [x] 3.1 Em `foods/food-quantity.ts`, exportar `quantityStep` e `allowsPartialOrder` e fazer `checkFoodQuantity` (DT21) usar esses helpers, sem mudar o comportamento
- [x] 3.2 Criar `orders/order-quantity.ts` com `checkOrderQuantity` (na ordem estoque, fração, tipo, com a sobra da DT30) e `orderTypeFor`, com teste de unidade cobrindo todos os cenários da spec `pedidos/solicitacao`
- [x] 3.3 Em `orders.constants.ts`, adicionar `ORDER_QUANTITY_CODES` e os novos `ORDER_CONFLICT_CODES` (`ORDER_NOT_PENDING`, `FOOD_NOT_AVAILABLE`, `INSUFFICIENT_FOOD_QUANTITY`, `ORDER_NOT_IN_PROGRESS`)
- [x] 3.4 Mover de `FoodsService` para `food-order-effects.ts` as funções `applyNewQuantityToPendingOrders` e `rejectAllPendingOrders`, fazendo a edição e a desativação usarem as versões movidas, sem mudar o comportamento (os testes da 2.2 continuam passando)
- [x] 3.5 Criar `AcceptImpactResponseDto` (`pendingOrdersToReject`, `totalOrdersToUpdate`, `foodWillBeReserved`), com documentação do Scalar em pt-BR, e atualizar a descrição de `quantity` em `CreateOrderDto`

## 4. Backend: criação de pedido

- [x] 4.1 Em `OrdersService.create`, trocar a comparação com o estoque por `checkOrderQuantity` dentro da transação, respondendo `400` com `code`, e derivar o tipo pela nova `orderTypeFor`
- [x] 4.2 Atualizar `orders.service.spec.ts`: cada tipo de solicitação, fração por unidade, a sobra da DT30, códigos e tipo registrado, mantendo os testes de limite e de duplicidade

## 5. Backend: aceite

- [x] 5.1 Criar `evaluateAccept` com as conferências e os códigos do design D2
- [x] 5.2 Reescrever `accept` em transação, nesta ordem:
  - trava;
  - conferências;
  - CAS com `acceptedAt`;
  - decremento condicional;
  - `Reservado` ao zerar;
  - efeito nos pendentes: `applyNewQuantityToPendingOrders` com estoque restante, `rejectAllPendingOrders` com estoque zerado.
- [x] 5.3 Implementar `GET /orders/:id/accept-impact` no controller, declarado antes de qualquer rota `:id` conflitante, só para estabelecimento, com documentação do Scalar
- [x] 5.4 Testar o aceite:
  - `acceptedAt`;
  - aceite parcial mantendo `Ativo`;
  - aceite que zera e reserva;
  - totais ajustados ao novo estoque, com `quantityUpdatedAt`;
  - parciais que não cabem rejeitados;
  - parciais que cabem intactos;
  - todos os pendentes rejeitados, inclusive os totais, quando o estoque zera;
  - excluídos e outros alimentos intocados;
  - cada código de `409`.
- [x] 5.5 Testar a prévia: as duas contagens com estoque restante e com estoque zerado, `foodWillBeReserved`, nenhuma escrita, `404` e `409` com código

## 6. Backend: confirmação de recebimento

- [x] 6.1 Reescrever `receive` em transação com `lockFood`, CAS para `Doado` com `ORDER_NOT_IN_PROGRESS` e o encerramento do alimento (RN08) pelo design D3
- [x] 6.2 Usar `ORDER_NOT_PENDING` no `409` da rejeição manual
- [x] 6.3 Testar a confirmação:
  - última com estoque 0 (`Inativo` e pendentes rejeitados);
  - com outro pedido `Em andamento`, o alimento continua `Reservado`;
  - com estoque, nada muda no alimento;
  - código do `409`.

## 7. Frontend: modal "Solicitar doação"

- [x] 7.1 Criar `features/orders/order-quantity.ts` com `orderModes` e a validação espelhando o backend, usando o passo mínimo de `features/foods/food-quantity.ts`
- [x] 7.2 Reescrever `create-order-schema.ts` para receber `{ available, allowsFraction, requestType }`, com o modo inicial igual ao primeiro permitido e o erro de quantidade inteira
- [x] 7.3 Em `create-order-dialog.tsx`, mostrar só os cartões permitidos e o cartão de sobra (DT30), com o `step` do input pela unidade, e manter o banner dos `400`
- [x] 7.4 Conferir que o detalhe do alimento passa `requestType` e `measurementUnit.allowsFraction` ao modal

## 8. Frontend: aceite e confirmação

- [x] 8.1 Em `orders-api.ts`, adicionar `getAcceptImpact`, o tipo `AcceptImpact` e os novos códigos de conflito
- [x] 8.2 No diálogo de aceite, buscar a prévia ao abrir e mostrar as linhas de efeito ("N pedidos pendentes deste alimento serão rejeitados", "N pedidos totais pendentes passarão a pedir X un", "o alimento ficará Reservado"), com o botão desabilitado durante o carregamento e o aviso com recarga do pedido em `409`
- [x] 8.3 Depois de aceitar ou confirmar, invalidar as chaves do alimento (feed, detalhe e "Meus Alimentos"), além das de pedido

## 9. Documentação

- [x] 9.1 Em `docs/MODELO-DE-DADOS.md`, registrar que `acceptedAt` e o índice `(beneficiaryEntityId, statusId)` entraram na 3.1, com o preenchimento da migration

## 10. Verificação

- [x] 10.1 Rodar lint, testes e build de backend e frontend, com o `start:dev` desligado no build do backend
- [x] 10.2 Verificar a concorrência contra o Postgres local, com requisições paralelas, sem estoque negativo e sem erro de impasse:
  - dois aceites que não cabem juntos (um aceito, outro `Rejeitado` e `409`);
  - dois aceites que cabem juntos;
  - as duas últimas confirmações simultâneas (alimento termina `Inativo`).
- [x] 10.3 Verificar ponta a ponta no navegador, com estabelecimento e entidade:
  - modal de cada tipo de solicitação, unidade com e sem fração e a sobra da DT30;
  - diálogo de aceite com e sem pendentes a rejeitar, com pedido total ajustado (conferir a nova quantidade no pedido da entidade) e com reserva;
  - aba Reservado em "Meus Alimentos";
  - confirmação que inativa o alimento;
  - console limpo.
- [x] 10.4 Conferir os diálogos a 400 px e nos temas claro e escuro
- [x] 10.5 Marcar ✅ no item 3.1 de `docs/PLANO-IMPLEMENTACAO.md`
