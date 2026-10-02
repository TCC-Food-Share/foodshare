## Context

Ver `proposal.md` ("Why"). `OrdersService` tem `create`, `accept`, `reject`, `receive`, `list` (RF19) e o privado `toResponse(order)` que mapeia o payload com includes `{ status; food; establishment; beneficiaryEntity }` para o `OrderResponseDto` resumido (`food` só `{ id, name, quantityUnit }`; instituições só `{ id, companyName }`).

O `list` (RF19) já resolve o ator: `establishment = prisma.establishment.findUnique({ where: { userId } })`; se `null`, `beneficiaryEntity = prisma.beneficiaryEntity.findUnique({ where: { userId } })`; nenhum dos dois ⇒ `NotFoundException`. `Order` tem `establishmentId` e `beneficiaryEntityId`. `Establishment`/`BeneficiaryEntity` têm `address` (`addressId @unique`), com `city` e `state` no `Address`.

`FoodsController.getById` (RF13) usa `@Param('id', ParseIntPipe)` — id não numérico → `400` antes do handler. `FoodResponseDto` (RF13) é a referência de "alimento completo": `id`, `image`, `name`, `quantity` (string), `quantityUnit`, `description`, `expirationDate`, `publishedAt`, `category`, `status`, `establishment`.

## Goals / Non-Goals

**Goals:**
- `GET /orders/:id` retornando o detalhe completo do pedido apenas para as duas partes.
- Reusar a resolução de ator do `list` e o `ParseIntPipe` do padrão de detalhe.

**Non-Goals:**
- Contato institucional (e-mail/telefone) e endereço de rua das instituições — decisão do usuário: só `city`/`state`.
- Dados pessoais do usuário vinculado.
- Histórico de transições de status, motivo de cancelamento, anexos.
- Recorte de disponibilidade no alimento — o detalhe é registro histórico, o alimento aparece em qualquer estado.

## Decisions

**`getById(userId, orderId)` — resolução de ator do `list`, `findFirst` com o vínculo, includes de detalhe.**
```ts
async getById(userId: number, orderId: number): Promise<OrderDetailResponseDto> {
  const establishment = await this.prisma.establishment.findUnique({ where: { userId } });
  const beneficiaryEntity = establishment
    ? null
    : await this.prisma.beneficiaryEntity.findUnique({ where: { userId } });

  if (!establishment && !beneficiaryEntity) {
    throw new NotFoundException('Order not found.');
  }

  const order = await this.prisma.order.findFirst({
    where: {
      id: orderId,
      deleted: false,
      ...(establishment
        ? { establishmentId: establishment.id }
        : { beneficiaryEntityId: beneficiaryEntity!.id }),
    },
    include: {
      status: true,
      food: { include: { category: true, status: true } },
      establishment: { include: { address: true } },
      beneficiaryEntity: { include: { address: true } },
    },
  });
  if (!order) {
    throw new NotFoundException('Order not found.');
  }

  return this.toDetailResponse(order);
}
```
- **Conta sem instituição → `404 'Order not found.'`** (não `'No establishment or beneficiary entity...'` como no `list`): num endpoint de recurso único a mensagem uniforme de "não encontrado" evita distinguir "sua conta não pode ver pedidos" de "esse pedido não é seu". O `list` pode ser mais explícito porque não vaza nada sobre um pedido específico.
- **`findFirst` com o vínculo no `where`** (não `findUnique` + checagem depois): "não é parte" e "não existe" caem os dois no `null` → mesma resposta `404`, sem ramo que vaze a existência.
- **`food` sem filtro de disponibilidade** — inclui o alimento em qualquer status/vencimento/`deleted`. O pedido é histórico.

**Rota `GET /orders/:id`, `@Param('id', ParseIntPipe)`.**
`ParseIntPipe` → `400` para id não numérico, igual ao `GET /foods/:id`. Convive com `GET /orders` (RF19, sem param) e `PATCH /orders/:id/*` (método diferente). `@ApiTags('Pedidos')`, textos Scalar pt-BR citando RF20. Respostas: `200` / `400` (id inválido) / `401` / `404`.

**`OrderDetailResponseDto` novo em `orders/dto/`.**
```
id: number
quantity: string           // Decimal -> string, mesmo motivo do OrderResponseDto
orderDate: Date
status: { id: number; name: string }
food: {
  id: number
  image: string | null
  name: string
  quantity: string         // quantidade ATUAL do alimento (pós-reservas do RF16)
  quantityUnit: string
  description: string
  expirationDate: Date
  category: { id: number; name: string }
  status: { id: number; name: string }
}
establishment: { id: number; companyName: string; tradeName: string | null; description: string; city: string; state: string }
beneficiaryEntity: { id: number; companyName: string; tradeName: string | null; description: string; city: string; state: string }
```
Classes aninhadas com `@ApiProperty`/`@ApiPropertyOptional` (`image` e `tradeName` `nullable: true`), no mesmo estilo de `OrderResponseDto` e `FoodResponseDto`. `food.quantity` e `quantity` do pedido continuam string (`Decimal.toString()`).

**`toDetailResponse(order)` privado, separado do `toResponse`.**
Includes diferentes (`food.category`, `food.status`, `*.address`) e saída diferente (DTO de detalhe). Tipar o parâmetro com `Prisma.OrderGetPayload<{ include: {...} }>` do mesmo shape do `findFirst`. `toResponse` (resumo) fica intacto para as mutações e o `list`.

## Risks / Trade-offs

- [`food.quantity` no detalhe é a quantidade atual (líquida de reservas do RF16), não a do momento do pedido] → aceito: não há snapshot histórico de estoque no schema, e o número útil na tela é o atual. A quantidade do pedido em si (`order.quantity`) está no topo do DTO, separada.
- [Dois `toXResponse` na mesma classe] → aceitável; os shapes de entrada e saída são realmente distintos. Extrair um mapper compartilhado não paga para dois métodos.
- [`city`/`state` só — sem contato] → decisão explícita do usuário; se a coordenação de retirada precisar de contato no futuro, é outra change (expande o DTO, não muda o resto).
- [`establishment.address` incluído só para pegar `city`/`state`] → include mínimo necessário; o `Address` inteiro vem do banco mas só dois campos entram no DTO.
