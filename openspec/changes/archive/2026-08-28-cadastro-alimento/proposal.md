> **Revisado depois do archive, antes do merge**: o mecanismo de "Revisar" descrito abaixo foi removido a pedido da usuária. Alimento cadastrado recebe status "Ativo" direto, sem etapa de revisão. Ver `design.md` ("Decisão final") pro detalhe — este arquivo fica como registro do que foi originalmente proposto.

## Why

Nenhum fluxo de estoque existe ainda — sem um estabelecimento poder cadastrar um alimento (RF10), não há o que listar (RF12+) nem o que pedir (RF15+). RF11 exige que todo alimento cadastrado comece com status "Revisar" — inseparável de RF10, é o mesmo fluxo de criação.

## What Changes

- Endpoint `POST /foods`, autenticado, vinculado ao estabelecimento da sessão autenticada (resolve pelo `userId`, nunca por id vindo do cliente — mesmo padrão do RF05).
- Campos: imagem, nome, categoria (id), quantidade (valor numérico + unidade de medida), descrição, data de vencimento.
- Todo alimento cadastrado recebe automaticamente o status "Revisar" — o cliente não escolhe o status na criação (RF11).
- Schema: `Food.quantity` (`Decimal`) adicionado — campo não existia; RF10 pede "quantidade" e só havia `quantityUnit` (unidade de medida, sem valor numérico). `Food.condition` removido — não corresponde a nenhum RF do MVP (achado durante o planejamento, confirmado com a usuária).
- `Category` e `FoodStatus` viram lookups fixos seedados no banco (mesmo padrão de `Role`) — "categorias gerenciáveis" é explicitamente Fora do Escopo (`docs/MODELO-DE-DADOS.md`), então não têm CRUD; cliente usa os ids já seedados.

## Capabilities

### New Capabilities
- `alimentos/cadastro`: permite que um estabelecimento autenticado cadastre um alimento vinculado ao próprio cadastro, sempre iniciando com o status "Revisar".

## Impact

- **Backend**: novo módulo `foods/` (controller, service, DTOs). Migration nova em `Food` (`quantity` adicionado, `condition` removido). `prisma/seed.ts` ganha 8 categorias e 2 status (`Revisar`, `Ativo`).
- **Frontend**: fora desta change.
- **Fora desta change**: RF12–RF14 (listagem/busca/detalhe de alimento) e o mecanismo de transição de status Revisar → Ativo — não é nenhum RF do MVP (RF11 só define o estado inicial), gap identificado e documentado, não implementado agora.
