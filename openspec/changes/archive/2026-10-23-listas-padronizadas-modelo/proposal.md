## Why

O cadastro de alimento (2.1), o cancelamento de pedido (3.2), o painel das
listas (1.3), a validação de termos proibidos (1.4) e as sugestões (1.5)
dependem de listas padronizadas que ainda não existem no banco: catálogo de
alimentos, unidades de medida, termos proibidos, sugestões e os motivos de
cancelamento com o marcador de sistema. Esta change cria esse modelo, os
seeds e as rotas de leitura para os selects (item 1.1 de
`docs/PLANO-IMPLEMENTACAO.md`), destravando a fase 1 e a fase 2.

## What Changes

- **Schema:** models novos `FoodCatalogItem`, `MeasurementUnit`,
  `ProhibitedTerm` e `Suggestion`, com os enums `SuggestionType` e
  `SuggestionStatus`, conforme `docs/MODELO-DE-DADOS.md`.
- **Schema:** `Category.administratorId` (opcional) e a relação
  `Category.catalogItems`; `CancellationReason.isSystem` e
  `CancellationReason.administratorId` passando a opcional.
- **Schema:** o nome de cada lista é único sem diferenciar maiúsculas nem
  acentos (RN37), garantido no banco.
- **Seeds:** as 8 unidades da RN40; os três motivos de sistema (RN31) e os
  quatro motivos comuns; uma lista inicial curta de termos proibidos
  (rascunho no `design.md`, para revisão da dupla); e um catálogo
  **provisório** de cerca de 20 itens, cada um ligado a uma categoria do
  seed. O catálogo definitivo (TACO) é a 1.2.
- **Backend:** módulo `catalog/` com rotas de leitura para os selects, só
  para instituições logadas:
  - `GET /catalog/categories`
  - `GET /catalog/food-items`
  - `GET /catalog/measurement-units`
  - `GET /catalog/cancellation-reasons`

  Todas aceitam `search`, com busca sem acento e sem diferenciar
  maiúsculas. Os motivos de sistema nunca aparecem.

- **Backend:** constante `SYSTEM_CANCELLATION_REASON` com os nomes dos três
  motivos de sistema (`docs/CONVENCOES.md`).
- **BREAKING:** `GET /categories` sai e vira `GET /catalog/categories`
  (decidido nesta proposta, para não ficarem duas rotas iguais). O
  administrador, que hoje consegue ler `/categories`, passa a receber `403`
  (decidido nesta proposta: o painel usa as rotas `/admin` da 1.3). O único
  cliente é o nosso frontend, que muda junto (uma linha em
  `features/foods/categories-api.ts`).

## Cobertura

- **RN31** — os três motivos de sistema existem desde o seed, marcados como
  tal, e não aparecem para seleção.
- **RN37** — as cinco listas existem; nome único sem diferenciar
  maiúsculas nem acentos; cada registro guarda o administrador que o criou
  (`NULL` nos do seed). O bloqueio de exclusão em uso é da 1.3, que cria a
  exclusão.
- **RN40** — seeds iniciais (o catálogo é provisório até a 1.2).
- **RN38** (parcial) — a busca sem acento que os selects vão usar ("pao"
  encontra "Pão francês"). O componente de select é das changes de tela.
- **DT05, DT10, DT11, DT18** — motivo de cancelamento com marcador de
  sistema, termos proibidos em tabela, listas + sugestões, enums do Prisma.

## Fora desta change

- CRUD das listas no painel, auditoria das escritas e bloqueio de exclusão
  em uso (RF33–RF40, RF59–RF70): 1.3.
- Catálogo definitivo a partir da TACO (DT12): 1.2.
- Validação de texto livre contra os termos proibidos (RNF07): 1.4.
- Criar, aprovar e recusar sugestões (RF49, RF71, RN39): 1.5. Aqui só a
  tabela.
- Ligar `Food` ao catálogo e à unidade, e tirar `Food.categoryId` e
  `Food.name` (RF14, RN16): 2.1. Até lá, o cadastro de alimento continua
  como no MVP.
- Cancelamento de pedido com motivo (RF26, RN09): 3.2.
- Qualquer tela. A única mudança no frontend é a URL das categorias.

## Perguntas em aberto

- **Lista inicial de termos proibidos.** O rascunho está no `design.md`
  (D7) e precisa da revisão da dupla antes do apply.
- **Como a 1.4 vai comparar os termos (palavra inteira ou trecho).** Não é
  decisão desta change, mas afeta a lista: por trecho, "puta" bloquearia
  "computador" e "disputa". Registrado para a 1.4.

## Capabilities

### New Capabilities

- `listas/padronizadas`: as cinco listas e a tabela de sugestões no banco,
  unicidade sem maiúsculas e acentos, administrador criador, motivos de
  sistema e os seeds iniciais.
- `listas/consulta`: rotas de leitura do catálogo de alimentos, das
  unidades de medida e dos motivos de cancelamento para os selects, com
  busca sem acento e sem os motivos de sistema.

### Modified Capabilities

- `alimentos/categorias`: a listagem passa a ser só para instituições,
  ganha a busca sem acento e muda de rota (`/catalog/categories`).

## Impact

- **Schema:** uma migration nova, com tabelas, enums, colunas novas e os
  índices únicos de nome sem acento (SQL escrito à mão na migration, porque
  o Prisma não representa índice de expressão).
- **Backend:** módulo novo `catalog/` (controller, service, DTOs,
  constantes). Sai o módulo `categories/`. `prisma/seed.ts` ganha os passos
  novos, e o catálogo provisório vai para `prisma/seed-data/food-catalog.ts`,
  o arquivo que a 1.2 vai substituir.
- **Frontend:** `features/foods/categories-api.ts` troca a URL.
- **Ambientes:** local recriado com `prisma migrate reset`. No staging e na
  produção, o deploy roda `migrate deploy` + seed. A migration só cria
  tabelas e colunas opcionais, então os dados atuais continuam válidos.
- **Dependências:** nenhuma nova.
