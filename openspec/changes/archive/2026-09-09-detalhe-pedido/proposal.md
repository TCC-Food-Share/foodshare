## Why

RF19 deu a listagem dos pedidos com um resumo por item. RF20 fecha o MVP de pedidos: abrir um pedido e ver os detalhes completos — o alimento inteiro (não só nome/unidade), o status, a quantidade, a data, e a identificação e localização das duas instituições envolvidas. É a tela que o estabelecimento e a entidade abrem para acompanhar um pedido específico e saber com quem estão tratando.

## What Changes

- Novo endpoint `GET /orders/:id`, autenticado, que retorna os **detalhes completos de um pedido vinculado ao solicitante**:
  - o solicitante precisa ser **parte do pedido** — o estabelecimento de origem OU a entidade beneficiária, resolvido pela sessão;
  - pedido inexistente, excluído logicamente, ou em que o solicitante não é parte → `404` (não revela se o pedido existe para outra instituição);
  - `id` não numérico → `400`.
- Resposta (`OrderDetailResponseDto`):
  - do pedido: `id`, `quantity`, `orderDate`, `status` (`id`, `name`);
  - `food` **completo** (registro histórico — o alimento aparece mesmo se depois foi excluído ou venceu): `id`, `image`, `name`, `quantity` (quantidade atual do alimento), `quantityUnit`, `description`, `expirationDate`, `category` (`id`, `name`), `status` (`id`, `name`);
  - `establishment` e `beneficiaryEntity`: `id`, `companyName`, `tradeName`, `description`, `city`, `state`. **Sem e-mail/telefone institucional e sem endereço de rua** — só identificação e cidade/UF.
- **Sem mudança de schema, sem migration.** Só leitura sobre `Order` já existente, com includes de `food.category`, `food.status`, `establishment.address` e `beneficiaryEntity.address`.

## Capabilities

### New Capabilities
- `pedidos/detalhe`: permite que o estabelecimento de origem ou a entidade beneficiária de um pedido obtenha, por id, os detalhes completos desse pedido — alimento completo, status, quantidade, data e identificação/localização (cidade/UF) das duas instituições.

### Modified Capabilities
<!-- Nenhuma. RF20 é leitura pura; não altera o texto de nenhum requisito de pedidos/*. -->

## Impact

- **Backend**: `OrdersService` ganha `getById(userId, orderId)` (resolve o ator — estabelecimento OU entidade — igual ao `list` do RF19; `findFirst` com o vínculo + `deleted: false` + includes; `null` → `NotFoundException`) e um mapeador `toDetailResponse` privado. `OrdersController`: rota `GET /orders/:id`, novo DTO `OrderDetailResponseDto`.
- **Banco**: nenhuma migration. Uma query `findFirst` com includes sobre `order`.
- **API/Doc**: nova operação `GET /orders/:id` sob a tag `Pedidos`; respostas `200/400/401/404`.
- **Testes**: `orders.service.spec.ts` — casos de `getById` (parte estabelecimento, parte entidade, não-parte → 404, inexistente → 404, conta sem instituição → 404, forma do DTO completo).
- **Frontend**: fora desta change.
- **Fora do escopo**: contato institucional (e-mail/telefone) e endereço de rua das instituições no detalhe, dados pessoais do usuário vinculado, histórico de transições de status do pedido, motivo de cancelamento, anexos/comprovantes.
