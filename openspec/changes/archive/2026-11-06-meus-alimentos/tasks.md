## 1. Banco

- [x] 1.1 Em `schema.prisma`, adicionar o enum `OrderType` e, em `Order`, `type`, `quantityUpdatedAt` e `@@index([foodId, statusId])`
- [x] 1.2 Gerar a migration `meus_alimentos`: `type` nulo, preenchimento (design D3) e `NOT NULL`, sem default
- [x] 1.3 Conferir que `prisma migrate dev` aplica sobre um banco com pedidos e que `prisma generate` atualiza o client

## 2. Backend: base

- [x] 2.1 Adicionar os códigos de erro em `foods.constants.ts` (design D4)
- [x] 2.2 Criar o helper `lockFood(tx, foodId)` em `foods/`
- [x] 2.3 Criar as funções compartilhadas de `where` para pedidos totais a atualizar e parciais a rejeitar (design D7), com teste unitário
- [x] 2.4 Criar os DTOs: `ListMyFoodsQueryDto` (status, busca, ordenação, paginação), `UpdateFoodDto` (ao menos um campo), `ReactivateFoodDto`, `DeleteFoodQueryDto`, `QuantityImpactQueryDto`, `MyFoodResponseDto` e `QuantityImpactResponseDto`, com documentação do Scalar em pt-BR

## 3. Backend: listagem e detalhe

- [x] 3.1 Implementar `GET /foods/mine` com busca sem acento, datas em dd/mm/aaaa, quantidade, ordenação por mapa fixo e contagens por `groupBy` (design D5), declarada antes de `GET /foods/:id`
- [x] 3.2 Implementar `GET /foods/mine/:id/quantity-impact`
- [x] 3.3 Alterar `GET /foods/:id` para o dono ver o próprio alimento não excluído fora do recorte (design D6), mantendo `findAvailableById`
- [x] 3.4 Testar listagem, busca, ordenação, contagens, prévia, detalhe do dono e `403` de entidade beneficiária

## 4. Backend: ações

- [x] 4.1 Implementar `PATCH /foods/:id`, em transação sob trava, com os efeitos da RN20 e `quantityUpdatedAt` só nos pedidos totais que mudarem
- [x] 4.2 Implementar `PATCH /foods/:id/deactivate`, com os pedidos `Pendente` indo para `Rejeitado`
- [x] 4.3 Implementar `PATCH /foods/:id/reactivate`, com as validações de quantidade e data
- [x] 4.4 Implementar `DELETE /foods/:id`, com `Pendente` indo para `Rejeitado`, `Em andamento` para `Cancelado` com motivo, sem mexer em quantidade e status (DT27)
- [x] 4.5 Testar cada ação, cobrindo cada cenário de `specs/alimentos/gestao/spec.md`, inclusive cada transição automática de pedido

## 5. Backend: pedidos

- [x] 5.1 Alterar `OrdersService.create`: conferir disponibilidade e quantidade e gravar em transação sob trava, com o tipo derivado (design D2), mantendo a precedência da RN06
- [x] 5.2 Alterar `OrdersService.accept`: travar o alimento primeiro e reler pedido e disponibilidade na transação (design D1)
- [x] 5.3 Atualizar `orders.service.spec.ts` e cobrir os cenários novos de `pedidos/solicitacao` e `pedidos/aceite`
- [x] 5.4 Verificar a concorrência contra o Postgres local, com requisições paralelas: dois aceites sobre estoque insuficiente; edição e aceite; desativação e criação. Sem estoque negativo, sem erro de impasse e sem pedido `Pendente` em alimento `Inativo`

## 6. Frontend: base

- [x] 6.1 Criar `food-status.ts` (nomes e rótulos) e `FoodStatusBadge`, e usar o selo no detalhe do alimento
- [x] 6.2 Em `foods-api.ts`, adicionar tipos e funções das rotas novas; criar `useMyFoodCounts`
- [x] 6.3 Em `catalog-api.ts`, adicionar `listCancellationReasons` e `useCancellationReasons`
- [x] 6.4 Adicionar a rota `/meus-alimentos` com `RoleRoute roles={['establishment']}` e o item "Meus alimentos" em `nav-items.ts`

## 7. Frontend: tela e diálogos

- [x] 7.1 Criar `my-foods-page.tsx` com abas, contagens, `AdminTable` (alimento, categoria, quantidade, status, validade, publicação, solicitações) e o botão de cadastrar alimento, usando `CreateFoodDialog`
- [x] 7.2 Criar as ações por linha conforme o estado, com o motivo visível quando indisponíveis
- [x] 7.3 Criar o diálogo de edição, enviando só o que mudou e mostrando a prévia do efeito
- [x] 7.4 Criar o diálogo de reativação, com data e quantidade obrigatórias
- [x] 7.5 Criar o diálogo de desativação, com a contagem de pedidos que serão rejeitados
- [x] 7.6 Criar o diálogo de exclusão, com as contagens e, se houver pedido `Em andamento`, o select de motivo com "Sugerir nova opção"
- [x] 7.7 Mapear os códigos de erro para mensagens em pt-BR e invalidar `['foods']` e `['orders']` após cada ação

## 8. Documentação

- [x] 8.1 Em `docs/REQUISITOS.md`, registrar DT26, DT27, DT28 e DT29
- [x] 8.2 Em `docs/MODELO-DE-DADOS.md`, registrar o que entrou em `Order` nesta change
- [x] 8.3 Em `docs/PLANO-IMPLEMENTACAO.md`, tirar `Order.type` e a parte correspondente da 3.1 e registrar a antecipação na 2.2

## 9. Verificação

- [x] 9.1 Rodar lint, testes e build de backend e frontend (com o `start:dev` desligado no build do backend)
- [x] 9.2 Verificar ponta a ponta no navegador, com estabelecimento e entidade: editar (total atualizado, parcial rejeitado, parcial mantido), desativar, reativar, excluir com e sem pedido `Em andamento`, "Ver" em cada estado, busca, ordenação, abas e console limpo
- [x] 9.3 Conferir a aba Reservado e suas ações com um alimento atualizado direto no banco local
- [x] 9.4 Conferir a tela a 400 px e nos temas claro e escuro
- [x] 9.5 Marcar ✅ no item 2.2 de `docs/PLANO-IMPLEMENTACAO.md`

## 10. Correções encontradas na verificação

- [x] 10.1 Reproduzir o erro `500` com quantidade a partir de 100.000.000 na edição
- [x] 10.2 Limitar a quantidade a 99.999.999,99 nos DTOs de cadastro, edição, reativação e prévia, com teste
- [x] 10.3 Avisar no campo de quantidade do cadastro, da edição e da reativação
- [x] 10.4 Mostrar a tela de erro com "Tentar novamente" quando a consulta da sessão falhar com algo diferente de `401`
- [x] 10.5 Verificar no navegador: `429` e falta de conexão em `/me`, nova tentativa, `401` levando ao login e aviso de quantidade nos dois formulários
