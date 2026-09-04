## Context

Ver `proposal.md` ("Why"). `OrdersService.create(userId, dto)` (change `solicitacao-pedido`) hoje faz, em ordem: resolve a entidade beneficiária pelo `userId` (`null` ⇒ `NotFoundException`), busca o alimento disponível via `FoodsService.findAvailableById` (`null` ⇒ `NotFoundException`), valida `quantity` contra `Food.quantity` (`BadRequestException`), resolve o status "Pendente" e cria o pedido.

O schema `Order` já tem `beneficiaryEntityId`, `statusId` e `deleted Boolean @default(false)`. `OrderStatus` é lookup seedado só com `"Pendente"` — nenhum fluxo de encerramento de pedido (RF17 rejeição, RF18 recebimento) existe ainda, então não há status terminal no sistema hoje.

Erros de conflito de estado no projeto usam `ConflictException` (409) — ver `establishments.service.ts` / `beneficiary-entities.service.ts` (cadastro duplicado). Testes do `OrdersService` são unitários com `PrismaService` e `FoodsService` mockados (`orders.service.spec.ts`).

## Goals / Non-Goals

**Goals:**
- Impor o teto de 10 pedidos em andamento por entidade na criação de pedido, com o mínimo de superfície nova (uma contagem + um `throw`).
- Deixar a regra de "em andamento" pronta para RF17/RF18 sem precisar de outra change de RF15.

**Non-Goals:**
- Introduzir os status terminais ("Rejeitado", "Recebido") ou qualquer parte de RF16-RF20 — este change só lê `deleted` e `statusId`.
- Tornar o teto configurável (env/DB). Constante no código; se virar requisito, é outra change.
- Endpoint de "quantos pedidos em andamento eu tenho" — só a validação no `POST /orders`.

## Decisions

**Contagem via `prisma.order.count`, logo após resolver a entidade e antes do alimento.**
```ts
const inProgress = await this.prisma.order.count({
  where: { beneficiaryEntityId: beneficiaryEntity.id, deleted: false },
});
if (inProgress >= MAX_ORDERS_IN_PROGRESS) {
  throw new ConflictException('Beneficiary entity has reached the limit of orders in progress.');
}
```
- **Posição**: depois do `beneficiaryEntity.findUnique` (precisa do `id`), antes do `findAvailableById`. É uma trava sobre o ator — não depende do `foodId`/`quantity`. Uma entidade no limite recebe `409` mesmo mandando `foodId` inexistente (que sozinho daria `404`). Mantém o `404` de "conta não é entidade beneficiária" acontecendo antes (resolução da entidade não muda).
- **`>= MAX_ORDERS_IN_PROGRESS`** com `MAX_ORDERS_IN_PROGRESS = 10` (constante de módulo, ao lado de `INITIAL_STATUS`). "10 ou mais" ⇒ bloqueia a partir de 10; entidade com 9 ainda cria (o 10º).
- **`where` hoje = `{ beneficiaryEntityId, deleted: false }`.** Todo pedido não terminal e não excluído. Como só existe "Pendente", isso já é exatamente "em andamento". Quando RF17/RF18 entrarem, o `where` ganha um filtro de status (ex.: `status: { name: { notIn: TERMINAL_STATUSES } }` ou um flag `OrderStatus.terminal`) — a mudança fica contida nesse `where`, sem mexer na posição da checagem nem no controller. A spec já está escrita em termos de "status não terminal" pra cobrir isso.

Alternativa considerada: checar o limite dentro de uma transação junto do `order.create`, para evitar corrida (duas requisições simultâneas da mesma entidade passando as duas em `count = 9`). Descartado nesta fase: sem `SELECT ... FOR UPDATE`/serializable a transação não fecha a corrida de verdade, e o custo de um pedido a mais acima do teto é baixo (a entidade encerra um e volta ao limite). RF16 (aceite/reserva) revisita concorrência de pedido com trava real. Registrado em Riscos.

**`ConflictException` (409), não `BadRequestException` (400).**
O corpo da requisição está correto — o que impede o pedido é o estado atual da entidade (10 em andamento). É o mesmo tipo de "conflito com o estado do servidor" do cadastro duplicado (`ConflictException` no projeto). `400` fica reservado para dado inválido (quantidade, campo extra) — RF14 já usa assim.

**Mensagem de erro em inglês, texto Scalar em pt-BR.**
`'Beneficiary entity has reached the limit of orders in progress.'` — segue `docs/CONVENCOES.md` (texto que a API devolve é inglês). O `@ApiConflictResponse({ description: ... })` no controller descreve em pt-BR e cita RF15.

**Sem teste E2E/HTTP novo.** Cobertura unitária em `orders.service.spec.ts` mockando `prisma.order.count` — mesmo padrão dos outros cenários do arquivo. Verificação manual (`curl`) confirma o `409` no fluxo real, como no RF14.

## Risks / Trade-offs

- [Corrida: duas requisições simultâneas da mesma entidade em `count = 9` criam as duas → 11 em andamento] → aceito nesta fase. Sem trava de linha o `count` fora de transação não resolve; o excedente é transitório e sem dano (nada de estoque é reservado ainda — isso é RF16). RF16 traz a trava real de pedido.
- [Teto fixo em 10 no código] → aceito; `docs/REQUISITOS.md` fixa "10", não há requisito de configurabilidade. Constante nomeada deixa a mudança trivial se aparecer.
- [`where` sem filtro de status hoje] → correto enquanto "Pendente" for o único status; a spec e este design deixam explícito o ponto de extensão para RF17/RF18, então não vira dívida escondida.
- [Custo de um `count` extra por criação de pedido] → desprezível: query indexável por `beneficiaryEntityId`, volume de pedidos por entidade é baixo por definição (teto 10).
