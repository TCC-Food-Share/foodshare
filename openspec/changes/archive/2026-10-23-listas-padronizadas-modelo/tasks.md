## 1. Schema e migration (backend)

- [x] 1.1 `schema.prisma`: enums `SuggestionType` e `SuggestionStatus`;
      models `FoodCatalogItem`, `MeasurementUnit`, `ProhibitedTerm` e
      `Suggestion`, conforme `docs/MODELO-DE-DADOS.md`, com as relações
      nomeadas em `User` e `onDelete: SetNull` nos administradores e no
      revisor (design D8).
- [x] 1.2 `schema.prisma`: `Category.administratorId` (opcional) e
      `Category.catalogItems`, mantendo `Category.foods` (design D1);
      `CancellationReason.isSystem @default(false)` e `administratorId`
      opcional, com `onDelete: SetNull`.
- [x] 1.3 Gerar a migration com `prisma migrate dev --create-only --name
listas_padronizadas` e acrescentar à mão a função `immutable_unaccent`
      e os seis índices únicos normalizados (design D2).
- [x] 1.4 Aplicar a migration e rodar `prisma migrate dev` de novo,
      conferindo que nenhuma migration nova é gerada (risco dos índices de
      expressão, design "Risks").

## 2. Normalização e constantes (backend)

- [x] 2.1 `src/common/normalize-text.ts` com `normalizeText()`
      (NFD, sem diacríticos, minúsculas, `trim`) e teste unitário
      ("Pão Francês " → "pao frances").
- [x] 2.2 `src/catalog/cancellation-reasons.constants.ts` com
      `SYSTEM_CANCELLATION_REASON` (design D5).

## 3. Seeds (backend)

- [x] 3.1 `prisma/seed-data/measurement-units.ts` com as 8 unidades (só kg e
      L com fração) e `prisma/seed-data/cancellation-reasons.ts` com os
      motivos comuns (design D6).
- [x] 3.2 `prisma/seed-data/prohibited-terms.ts` com a lista aprovada pela
      dupla (design D7), gravada por `normalizeText()`.
- [x] 3.3 `prisma/seed-data/food-catalog.ts` com o catálogo provisório de 24
      itens `{ name, category }` (design D6).
- [x] 3.4 `seed.ts`: unidades, motivos (de sistema com `isSystem: true`, a
      partir da constante), termos e catálogo, na ordem de
      `docs/MODELO-DE-DADOS.md`, com `upsert` e `update: {}`. Falhar com
      mensagem clara se a categoria de um item do catálogo não existir.
- [x] 3.5 `prisma migrate reset` e conferir no banco as contagens, os três
      motivos de sistema e as unidades com fração. Rodar o seed de novo e
      conferir que as contagens não mudam. _Na apply:_ em vez do reset, que
      apagaria o banco local, o seed rodou duas vezes sobre o banco migrado,
      com as mesmas contagens (8 categorias, 24 itens, 8 unidades, 7 motivos,
      3 de sistema, 14 termos).
- [x] 3.6 Conferir no `psql` que "PAO FRANCES" é recusado no catálogo e "KG"
      nas siglas, e que "Outros" é aceito como motivo.

## 4. Módulo `catalog` (backend)

- [x] 4.1 DTOs: `CatalogSearchQueryDto` (`search` opcional, string, até 100)
      e os DTOs de resposta das quatro listas, com `@ApiProperty` em pt-BR.
- [x] 4.2 `CatalogService`: as quatro consultas com o filtro em memória por
      `normalizeText()`, termo vazio tratado como ausente, a ordenação do
      design D4 e `isSystem: false` nos motivos.
- [x] 4.3 `CatalogController` com `@RequireRoles(...INSTITUTION_ROLES)`,
      `@ApiTags('Listas padronizadas')` e a documentação de `401` e `403`
      (design D4). Registrar `CatalogModule` no `AppModule`.
- [x] 4.4 Remover o módulo `categories/` e o registro dele no `AppModule`.
- [x] 4.5 `catalog.service.spec.ts`: busca sem acento ("pao" → "Pão
      francês", "PAES" → "Pães e Massas"), busca pela sigla da unidade,
      termo só com espaços, motivos de sistema ausentes mesmo buscando
      "vencido" e ordenação de cada lista.
- [x] 4.6 Rodar `npm test`, `npm run lint:check` e `npm run build` no
      backend.

## 5. Frontend

- [x] 5.1 `features/foods/categories-api.ts`: trocar `/categories` por
      `/catalog/categories`.
- [x] 5.2 Rodar `npm run lint:check` e `npm run build` no frontend.

## 6. Verificação e fechamento

- [x] 6.1 Com o backend local, conferir pelo Scalar (`/docs`) ou `curl`:
      instituição recebe as quatro listas; `?search=pao` traz "Pão francês";
      os motivos não trazem os de sistema; sem sessão dá `401`; o
      administrador do seed recebe `403` com `ROLE_NOT_ALLOWED`; e
      `GET /categories` responde `404`.
- [x] 6.2 No navegador, como estabelecimento e como entidade: o filtro de
      categoria do feed e o cadastro de alimento continuam carregando as
      categorias, sem erro no console.
- [x] 6.3 Atualizar `docs/MODELO-DE-DADOS.md` (D1: `Category.foods` sai na
      2.1; D2: índices únicos normalizados; D8: `onDelete: SetNull`) e
      anotar na 5.3 do `docs/PLANO-IMPLEMENTACAO.md` a exclusão das
      sugestões da instituição.
- [x] 6.4 Marcar ✅ o item 1.1 em `docs/PLANO-IMPLEMENTACAO.md`.
