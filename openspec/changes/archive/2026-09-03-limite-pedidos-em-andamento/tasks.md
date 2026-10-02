## 1. OrdersService — checagem do limite

- [x] 1.1 `orders.service.ts`: adicionar constante de módulo `MAX_ORDERS_IN_PROGRESS = 10` (ao lado de `INITIAL_STATUS`).
- [x] 1.2 Em `create(userId, dto)`, logo após o guard de `beneficiaryEntity` (`null` ⇒ `NotFoundException`) e **antes** de `foodsService.findAvailableById`: contar `prisma.order.count({ where: { beneficiaryEntityId: beneficiaryEntity.id, deleted: false } })`.
- [x] 1.3 Se `count >= MAX_ORDERS_IN_PROGRESS`, lançar `ConflictException('Beneficiary entity has reached the limit of orders in progress.')` (importar `ConflictException` de `@nestjs/common`). Nenhum pedido é criado.
- [x] 1.4 Comentário curto (inglês) na linha da contagem explicando que hoje "em andamento" = todo pedido não excluído porque "Pendente" é o único status, e que RF17/RF18 vão adicionar um filtro de status terminal a esse `where`.

## 2. Documentação da API

- [x] 2.1 `orders.controller.ts`: importar e adicionar `@ApiConflictResponse` no `POST /orders`, `description` em pt-BR citando RF15 (limite de 10 pedidos em andamento por entidade beneficiária).
- [x] 2.2 Ajustar o `description` do `@ApiOperation` do `POST /orders` para mencionar a nova pré-condição do limite (RF15), mantendo o texto do RF14.

## 3. Testes

- [x] 3.1 `orders.service.spec.ts`: adicionar `order.count` ao `prismaMock` (`jest.fn`), com `mockResolvedValue(0)` no `beforeEach`.
- [x] 3.2 Teste: entidade com 9 pedidos em andamento (`count` → 9) → cria o pedido normalmente (`order.create` chamado).
- [x] 3.3 Teste: entidade com 10 pedidos em andamento (`count` → 10) → `ConflictException`, `order.create` não chamado, `foodsService.findAvailableById` não chamado.
- [x] 3.4 Teste: entidade com 15 pedidos (`count` → 15) → `ConflictException`, `order.create` não chamado.
- [x] 3.5 Teste: a contagem usa `where: { beneficiaryEntityId: <id da sessão>, deleted: false }` (garante isolamento por entidade e exclusão dos soft-deleted).
- [x] 3.6 Teste: limite verificado antes do alimento — `count` → 10 e `findAvailableById` mockado para `null`/alimento inválido → ainda assim `ConflictException` (não `NotFoundException`), `order.create` não chamado.
- [x] 3.7 Conferir que os testes existentes do arquivo seguem passando (o `count` → 0 default não altera os fluxos já cobertos).

## 4. Verificação e fechamento

- [x] 4.1 Verificação contra o Postgres local (script `tsx` temporário, `OrdersService` real + `PrismaService` real): entidade com 10 pedidos "Pendente" → `ConflictException` (409) e `order.count` inalterado; soft-delete de 1 pedido → `create` volta a criar (status "Pendente"); de volta em 10 → `409` de novo. Dados de teste limpos ao final.
- [x] 4.2 `npm run lint:check` (0 warnings), `npm test` (6 suites, 74 testes) e `npm run build` no `backend/` sem erro.
- [x] 4.3 `/openapi.json` (servidor local): `POST /orders` passa a listar resposta `409` (descrição citando RF15); `201/400/401/404`, body → `CreateOrderDto` e `201` → `OrderResponseDto` inalterados.
- [x] 4.4 `openspec validate limite-pedidos-em-andamento --strict` sem erro.
