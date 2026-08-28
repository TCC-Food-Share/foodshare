## 1. Schema

- [x] 1.1 `Food.quantity Decimal @db.Decimal(10, 2)` adicionado — campo não existia, decidido com a usuária (Decimal em vez de Int, aceita fracionário)
- [x] 1.2 `Food.condition` removido — não corresponde a nenhum RF do MVP, decidido com a usuária
- [x] 1.3 Migration gerada e aplicada (`food_quantity_remove_condition`), tabela `food` estava vazia (0 linhas), sem risco de perda de dado
- [x] 1.4 `prisma/seed.ts`: 8 categorias seedadas (Perecíveis, Não Perecíveis, Hortifruti, Laticínios, Carnes, Pães e Massas, Bebidas, Outros) e 2 status (Revisar, Ativo), via `upsert` — idempotente, mesmo padrão do seed de `Role`

## 2. Módulo `foods/`

- [x] 2.1 `CreateFoodDto`: `image`, `name`, `categoryId`, `quantity`, `quantityUnit`, `description`, `expirationDate` — todos obrigatórios (RF10 lista como "informando X, Y, Z", mesmo padrão interpretativo do cadastro de estabelecimento/entidade)
- [x] 2.2 `FoodsService.create(userId, dto)`: resolve `Establishment` pelo `userId` da sessão (nunca por id do cliente) — `NotFoundException` se não existir (cobre também conta do tipo errado, mesmo padrão do RF05)
- [x] 2.3 Valida `categoryId` contra a tabela `Category` — `BadRequestException` se não existir
- [x] 2.4 Resolve `FoodStatus` "Revisar" e usa como status do registro criado — cliente não escolhe status, não é campo do DTO
- [x] 2.5 `publishedAt` setado automaticamente (`new Date()`) na criação — não é campo do DTO (ver `design.md`)
- [x] 2.6 `POST /foods` em `FoodsController`, protegido pelo guard global (sem `@AllowAnonymous()`), `userId` extraído via `@Session()`
- [x] 2.7 Resposta usa `FoodResponseDto`, com `category`/`status`/`establishment` expandidos (mesmo padrão de `user`/`address` nos DTOs de cadastro) e `quantity` convertido pra `string` (evita imprecisão de ponto flutuante do `Prisma.Decimal`)

## 3. Testes

- [x] 3.1 Teste unitário: cadastro com dados válidos cria o alimento vinculado ao estabelecimento correto, com status "Revisar"
- [x] 3.2 Teste unitário: `publishedAt` é setado automaticamente (não vem do dto)
- [x] 3.3 Teste unitário: resposta expõe `quantity` como `string`
- [x] 3.4 Teste unitário: `NotFoundException` quando o `userId` resolvido não tem `Establishment` vinculado (cobre conta do tipo errado)
- [x] 3.5 Teste unitário: `BadRequestException` quando `categoryId` não existe
- [x] 3.6 Verificação manual (`curl`): login → cadastro válido (201, status "Revisar") → categoria inválida (400) → sem sessão (401) → entidade beneficiária tentando cadastrar alimento (404)
