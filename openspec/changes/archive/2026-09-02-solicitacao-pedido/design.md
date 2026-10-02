## Context

Ver `proposal.md` ("Why"). O schema já tem `Order` (`foodId`, `statusId`, `establishmentId`, `beneficiaryEntityId`, `quantity Int`, `orderDate`, `deleted`) e `OrderStatus` (lookup, sem seed). `FoodsService` já tem `getById` + o privado `availableFoodWhereInput(id?)` que define "alimento disponível" em forma Prisma. A entidade beneficiária é resolvida por `prisma.beneficiaryEntity.findUnique({ where: { userId } })` (mesmo padrão do `FoodsService.create` com estabelecimento — conta do tipo errado cai no `null` → 404). `Food.quantity` é `Decimal(10,2)`, retornado como `string` nos DTOs.

## Goals / Non-Goals

**Goals:**
- `POST /orders` para entidade beneficiária, criando pedido "Pendente" contra alimento disponível, com quantidade validada.
- Reaproveitar a definição de "alimento disponível" do `FoodsService`, sem uma 3ª cópia da regra.

**Non-Goals:**
- Limite de 10 pedidos em andamento (RF15) — change própria.
- Aceite/rejeição/recebimento/listagem/detalhe de pedido (RF16-20).
- Reserva de estoque: a validação de quantidade aqui é só `0 < quantity <= Food.quantity` no instante do pedido; não há decremento nem trava.

## Decisions

**`Order.quantity`: `Int` → `Decimal(10, 2)`, migration via `prisma migrate dev`.**
`Food.quantity` é `Decimal` (aceita "2,5 kg"); o pedido precisa poder espelhar isso. `ALTER COLUMN ... TYPE numeric(10,2)` é conversão sem perda a partir de `integer`. Tabela `order` está vazia (nenhum fluxo de pedido existe ainda) — sem risco de dado. Confirmar a contagem antes de aplicar.

**`OrderStatus` seedado só com "Pendente".**
Mínimo que RF14 exige. "Aceito"/"Rejeitado"/"Recebido" entram com RF16-18 — mesmo princípio do RF10, que seedou só "Ativo". Nome em pt-BR (valor voltado ao usuário final, aparece em tela; plataforma PT-BR única) — mesma regra de `Category`/`FoodStatus`.

**`FoodsService` expõe `findAvailableById(id): Promise<FoodWithRelations | null>`; `getById` passa a usá-lo.**
Move o corpo do `getById` (o `findFirst` com `availableFoodWhereInput`) para um método público que devolve o registro cru (com `category`/`status`/`establishment` incluídos) ou `null`. `getById` vira `findAvailableById` + `NotFoundException` + `toResponse`. `OrdersService` injeta `FoodsService` (via `FoodsModule` com `exports: [FoodsService]`) e chama `findAvailableById` — precisa do `establishmentId` e do `quantity` (Decimal) do alimento, que o `FoodResponseDto` não entrega direito. A regra de "disponível" continua num lugar só no lado Prisma.

**`OrdersService.create(userId, dto)`:**
1. `beneficiaryEntity.findUnique({ where: { userId } })` → `null` ⇒ `NotFoundException` (cobre conta do tipo errado).
2. `foodsService.findAvailableById(dto.foodId)` → `null` ⇒ `NotFoundException('Food not found.')`.
3. `new Prisma.Decimal(dto.quantity).greaterThan(food.quantity)` ⇒ `BadRequestException('Requested quantity exceeds the available amount.')`.
4. `orderStatus.findUniqueOrThrow({ where: { name: 'Pendente' } })`.
5. `order.create({ data: { quantity: dto.quantity, foodId: food.id, statusId, establishmentId: food.establishmentId, beneficiaryEntityId: entity.id }, include: { status, food: { include: { category } }, establishment, beneficiaryEntity } })`.
6. `toResponse(order)` — `quantity` como `string` (mesmo motivo do `Food.quantity`).

**`CreateOrderDto`: `foodId` (`@IsInt` `@IsPositive`), `quantity` (`@IsNumber({ maxDecimalPlaces: 2 })` `@IsPositive`).**
Mesmo par de validadores de `CreateFoodDto.quantity`. `quantity` zero/negativa/não numérica/com mais de 2 casas cai no `ValidationPipe` → 400. `foodId`/`quantity` são os únicos campos do body; o `ValidationPipe` global roda com `forbidNonWhitelisted: true`, então enviar `beneficiaryEntityId`/`establishmentId` (ou qualquer outro campo) no corpo → 400. Isso é o que garante que o cliente não controla os vínculos — que vêm sempre da sessão e do alimento. (A `spec.md` foi ajustada na aplicação: o comportamento é recusar o campo extra, não ignorá-lo — consistente com o resto da API.)

**`OrderResponseDto`:** `id`, `quantity` (string), `orderDate`, `status { id, name }`, `food { id, name, quantityUnit }`, `establishment { id, companyName }`, `beneficiaryEntity { id, companyName }`. Resumo suficiente pra confirmar a criação; RF20 (detalhe completo) expande depois.

**Rota `POST /orders`, tag `@ApiTags('Pedidos')`.** Tag nova aparece sozinha no Scalar (agrupamento é por nome de tag nas operações; `main.ts` só lista 'Autenticação' à mão porque ela é montada de fora). Sem mudança em `main.ts`.

## Risks / Trade-offs

- [Sem reserva/trava de estoque: 2 entidades podem pedir a mesma quantidade e as duas passam na validação] → aceito e esperado nesta fase; a resolução é no aceite (RF16), que ainda não existe. RF14 só registra a intenção.
- [Validação de quantidade contra `Food.quantity` "crua", sem descontar pedidos já aceitos] → não há pedido aceito possível ainda (RF16 fora); quando entrar, RF16 revisita o cálculo de disponível.
- [`OrdersService` depende de `FoodsService`] → acoplamento aceitável entre módulos do mesmo domínio; alternativa (repetir o `where` de disponível em `orders/`) foi descartada pra não ter 3 cópias da regra.
- [Migration altera tipo de coluna] → sem risco: tabela vazia, conversão `integer`→`numeric` é segura mesmo com dado.
