## Why

Até aqui o MVP só cobre o lado do estabelecimento (cadastrar alimento) e a leitura (listar, buscar, detalhar). RF14 abre o primeiro fluxo da entidade beneficiária: pedir uma doação de um alimento disponível. Sem isso não há o que o estabelecimento aceitar (RF16) nem o que a entidade confirmar receber (RF18).

## What Changes

- Novo módulo `orders/` e endpoint `POST /orders`, autenticado, **exclusivo de entidade beneficiária** — o pedido é vinculado à entidade da sessão (resolvida pelo `userId`, nunca por id do cliente, mesmo padrão do RF05/RF10). Conta que não é entidade beneficiária (ex: estabelecimento) → `404`.
- Body: `foodId` e `quantity` (valor numérico, aceita fracionário, até 2 casas). A entidade escolhe quanto pedir — uma parte ou o lote inteiro (informando a quantidade total).
- O alimento precisa estar **disponível** — mesmo recorte da listagem/detalhe (RF11/RF13): status "Ativo", não excluído, não vencido. Alimento fora disso ou inexistente → `404`.
- `quantity` deve ser `> 0` e **não pode exceder a quantidade atual do alimento** — pedido acima do estoque → `400`. (Ainda não existe reserva de RF16, então "estoque" = quantidade cadastrada do alimento.)
- O pedido é criado com status inicial **"Pendente"** (o cliente não escolhe status), `establishmentId` derivado do alimento, `beneficiaryEntityId` da sessão, `orderDate` = agora.
- **Schema**: `Order.quantity` muda de `Int` para `Decimal(10, 2)` — para casar com `Food.quantity` (alimento fracionário). Migration nova.
- **Seed**: `OrderStatus` ganha "Pendente" (só o status inicial que RF14 exige — não antecipa RF16-18).
- `FoodsService` passa a expor a busca de "alimento disponível por id" (hoje privada, usada só pelo `getById`) para o `OrdersService` reusar — a regra de "disponível" fica numa fonte só do lado Prisma.

## Capabilities

### New Capabilities
- `pedidos/solicitacao`: permite que uma entidade beneficiária autenticada crie um pedido de doação para um alimento disponível, informando a quantidade desejada, sempre iniciando com status "Pendente".

### Modified Capabilities
<!-- Nenhuma. RF14 não altera requisito de alimentos/*. A exposição do helper do FoodsService é refactor interno, sem mudança de comportamento observável do endpoint de alimentos. -->

## Impact

- **Backend**: novo módulo `orders/` (controller, service, DTOs). `FoodsModule` passa a exportar `FoodsService`; `FoodsService` ganha um método público de "alimento disponível por id" e `getById` passa a usá-lo. `AppModule` importa `OrdersModule`.
- **Banco**: migration alterando `order.quantity` (`integer` → `numeric(10,2)`). `prisma/seed.ts` ganha `OrderStatus` "Pendente".
- **API/Doc**: nova operação sob a tag `Pedidos` (nova) no Scalar/OpenAPI, textos em pt-BR.
- **Frontend**: fora desta change.
- **Fora do escopo**: RF15 (limite de 10 pedidos em andamento), RF16-RF20 (aceite, rejeição, confirmação de recebimento, listagem e detalhe de pedido), mecanismo de reserva de estoque, motivos de cancelamento padronizados, e bloqueio de pedido duplicado para o mesmo alimento (RF15 é o limite que vale).
