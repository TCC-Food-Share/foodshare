## Why

RF14–RF18 criaram e movimentaram pedidos, mas nem o estabelecimento nem a entidade beneficiária conseguem ver os próprios pedidos hoje — a única leitura de pedido é a resposta de cada mutação. RF19 abre a listagem: cada instituição vê os seus pedidos, com filtro por status, para acompanhar o que está pendente, aceito, rejeitado ou recebido.

## What Changes

- Novo endpoint `GET /orders`, autenticado, que lista **os pedidos do solicitante**, resolvido pela sessão:
  - conta de **estabelecimento** → pedidos em que ele é o `establishmentId`;
  - conta de **entidade beneficiária** → pedidos em que ela é o `beneficiaryEntityId`;
  - conta que não é nenhum dos dois → `404`.
- Filtro opcional `?status=<nome>` — um de `Pendente` | `Aceito` | `Rejeitado` | `Recebido`. Ausente → todos os status. Valor fora dessa lista → `400`. O frontend usa isso para renderizar uma aba por status (a "separação por status" do RF19); cada item da resposta também traz `status.name`.
- Paginação igual à listagem de alimentos (RF11): `page` (default 1) e `pageSize` (default 20, teto 50). `page`/`pageSize` não numérico, zero ou negativo → `400`; `pageSize` acima de 50 → aplica 50. Resposta: `{ data, total, page, pageSize }`, com `total` refletindo o filtro de status aplicado.
- Ordenação da mais recente para a mais antiga (`orderDate` desc).
- Cada item da resposta é um `OrderResponseDto` (mesmo formato já devolvido por `POST /orders` e pelas transições de status): `id`, `quantity`, `orderDate`, `status`, `food`, `establishment`, `beneficiaryEntity`.
- **Sem mudança de schema, sem migration.** Só leitura sobre `Order` já existente.

## Capabilities

### New Capabilities
- `pedidos/listagem`: permite que o estabelecimento ou a entidade beneficiária autenticada liste os próprios pedidos (recorte pela sessão), de forma paginada e ordenada do mais recente ao mais antigo, com filtro opcional por status.

### Modified Capabilities
<!-- Nenhuma. RF19 é leitura pura; não altera o texto de nenhum requisito de pedidos/*. -->

## Impact

- **Backend**: `OrdersService` ganha `list(userId, query)` (resolve o ator — estabelecimento OU entidade beneficiária — e monta o `where` com o vínculo + `deleted: false` + status opcional; pagina e ordena; reusa o `toResponse` privado). `OrdersController`: rota `GET /orders`, novos DTOs `ListOrdersQueryDto` e `PaginatedOrdersResponseDto`. Constantes de paginação espelhando `FoodsService` (`DEFAULT_PAGE`, `DEFAULT_PAGE_SIZE`, `MAX_PAGE_SIZE`).
- **Banco**: nenhuma migration. Query nova de `findMany` + `count` sobre `order`.
- **API/Doc**: nova operação `GET /orders` sob a tag `Pedidos`; respostas `200/400/401/404`.
- **Testes**: `orders.service.spec.ts` — casos de `list` (recorte por estabelecimento, por entidade, filtro de status, paginação/ordenação, conta sem vínculo → 404).
- **Frontend**: fora desta change (mas a resposta é desenhada para abas por status).
- **Fora do escopo**: RF20 (detalhe completo de um pedido por id), filtros além de status (por alimento, por período, por contraparte), `countsByStatus` na resposta, exportação/histórico avançado.
