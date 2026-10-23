## Context

- O schema do MVP tem `Category` (8 categorias no seed, ligada a `Food`) e
  `CancellationReason` com `administratorId` obrigatório. Não existem
  catálogo, unidades, termos proibidos nem sugestões. O seed não cria motivo
  nenhum.
- `GET /categories` (módulo `categories/`) exige sessão de qualquer papel e
  devolve `{ id, name }` ordenado por `id`. O frontend usa essa rota no filtro
  do feed e no cadastro de alimento (`features/foods/categories-api.ts`).
- A extensão `unaccent` já está instalada (migration de 2026-09-02). A busca
  do feed usa `unaccent(...) ILIKE` em `$queryRaw`.
- `Food` ainda tem `name`, `categoryId` e `quantityUnit` livres. Eles só
  mudam na 2.1.
- O seed é idempotente (`upsert` por nome) e roda depois do
  `migrate deploy` em cada deploy (`docs/INFRAESTRUTURA.md`). A produção tem
  dados de teste que devem ser mantidos (`docs/MODELO-DE-DADOS.md`,
  "Migração").

## Goals / Non-Goals

**Goals:**

- Todo o modelo das listas e das sugestões no banco, numa migration só, sem
  quebrar o fluxo atual do MVP.
- Unicidade de nome sem maiúsculas e sem acentos garantida pelo banco, para
  a 1.3 e a 1.5 só traduzirem o erro em `409`.
- Uma função de normalização de texto que a 1.4 reaproveite.
- Rotas de leitura prontas para os selects das changes de tela.

**Non-Goals:**

- Escrita nas listas (1.3) e nas sugestões (1.5).
- Mudar `Food` (2.1).
- Catálogo definitivo (1.2).

## Decisions

### D1. `Food.categoryId` continua até a 2.1

`docs/MODELO-DE-DADOS.md` tira `Category.foods`, mas tirar agora quebraria o
cadastro e a busca do MVP antes de o alimento passar a usar o catálogo. Nesta
change, `Category` ganha `catalogItems` e **mantém** `foods`. A 2.1 remove
`Food.categoryId` e `Category.foods` junto com `Food.name`.

_Alternativa:_ fazer as duas coisas aqui. Rejeitada: a 1.1 é só modelo, e o
plano põe a mudança do alimento na 2.1.

### D2. Unicidade sem acento por índice de expressão

A migration cria uma função imutável e um índice único por lista:

```sql
CREATE FUNCTION immutable_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent', $1) $$;

CREATE UNIQUE INDEX food_catalog_item_name_normalized_key
  ON food_catalog_item (lower(immutable_unaccent(name)));
```

- O mesmo vale para `category.name`, `measurement_unit.name`,
  `measurement_unit.abbreviation`, `cancellation_reason.name` e
  `prohibited_term.term`.
- O `unaccent()` puro não pode ir num índice, porque é `STABLE`. A função
  fixa o dicionário, o que a torna segura como `IMMUTABLE`.
- O `@unique` simples do schema continua: o seed faz `upsert` por nome.

_Alternativa:_ checar a duplicidade só no service da 1.3. Rejeitada: a RN37
é uma regra de dado, e duas escritas simultâneas passariam pela checagem.

### D3. Busca dos selects filtrada em memória

As listas são pequenas: a maior, o catálogo, terá de 150 a 250 itens (DT12).
O service lê a lista com `findMany` e filtra com `normalizeText()`, que faz
`NFD`, tira as marcas diacríticas, passa para minúsculas e apara os espaços.
A função fica em `src/common/normalize-text.ts`. O seed a usa para gravar os
termos proibidos, e a 1.4 vai usá-la para comparar os textos.

_Alternativa:_ `unaccent ILIKE` em `$queryRaw`, como o feed. Rejeitada: perde
a tipagem do Prisma em quatro consultas, para listas que cabem em memória.
O feed continua com SQL porque é paginado e cresce sem limite.

### D4. Módulo `catalog/` substitui `categories/`

- `CatalogController`, com `@RequireRoles(...INSTITUTION_ROLES)` na classe e
  `@ApiTags('Listas padronizadas')`:
  - `GET /catalog/categories`: `{ id, name }`, por `id`.
  - `GET /catalog/food-items`: `{ id, name, category: { id, name } }`, por
    nome (`localeCompare` `pt-BR`).
  - `GET /catalog/measurement-units`: `{ id, name, abbreviation,
allowsFraction }`, por `id`; a busca olha nome e sigla.
  - `GET /catalog/cancellation-reasons`: `{ id, name }`, por `id`, com
    `isSystem: false` no `where`.
- Todas recebem `?search=`, num DTO com `@IsOptional() @IsString()
@MaxLength(100)`.
- As listas curtas seguem a ordem do seed: assim "Outros" e "Outro" ficam no
  fim. O catálogo vai por nome, porque é longo.
- O módulo `categories/` e o teste dele saem. O teste é refeito em
  `catalog.service.spec.ts`.

### D5. Constantes dos motivos de sistema

`src/catalog/cancellation-reasons.constants.ts`:

```ts
export const SYSTEM_CANCELLATION_REASON = {
  ACCOUNT_CLOSED: 'Conta encerrada pela instituição',
  ORDER_EXPIRED: 'Pedido expirado sem resposta',
  FOOD_EXPIRED: 'Alimento vencido',
} as const;
```

O seed e as changes 3.2, 4.4 e 6.1 usam essa constante. Os motivos comuns
ficam só no arquivo de dados do seed.

### D6. Dados do seed em `prisma/seed-data/`

- Ficam em `prisma/seed-data/`: `measurement-units.ts`,
  `cancellation-reasons.ts`, `prohibited-terms.ts` e `food-catalog.ts`.
  Cada item do catálogo é `{ name, category }`, com o nome da categoria. A
  1.2 substitui só o `food-catalog.ts`.
- Ordem no `seed.ts`: papéis, status, categorias, unidades, motivos, termos,
  catálogo e o administrador (`docs/MODELO-DE-DADOS.md`, "Seed").
- `upsert` com `update: {}`: o seed não sobrescreve o que o administrador
  tiver editado depois.
- O catálogo busca o `id` da categoria pelo nome e falha com uma mensagem
  clara se ela não existir.

Catálogo provisório (24 itens):

| Categoria      | Itens                                                       |
| -------------- | ----------------------------------------------------------- |
| Hortifruti     | Alface, Banana prata, Batata, Cebola, Maçã, Tomate          |
| Laticínios     | Leite integral, Queijo muçarela, Iogurte natural            |
| Carnes         | Carne moída, Peito de frango, Linguiça                      |
| Pães e Massas  | Pão francês, Pão de forma, Macarrão espaguete               |
| Não Perecíveis | Arroz branco, Feijão carioca, Açúcar refinado, Óleo de soja |
| Bebidas        | Suco de laranja, Café                                       |
| Perecíveis     | Ovo de galinha, Bolo simples                                |
| Outros         | Refeição pronta                                             |

### D7. Termos proibidos iniciais

Só palavrões e ofensas comuns em pt-BR. O arquivo de dados usa a grafia
correta, e o seed grava cada termo por `normalizeText()` (minúsculas, sem
acento):

`porra`, `caralho`, `merda`, `foda`, `puta`, `arrombado`, `cuzão`,
`desgraçado`, `vagabundo`, `vagabunda`, `otário`, `imbecil`, `retardado`,
`viado`.

- Ficam de fora palavras com sentido legítimo no domínio (ex.: "macaco",
  "venda").
- Vários termos são trecho de palavras comuns ("puta" em "computador" e
  "disputa"; "foda" é seguro, mas "merda" não aparece em nada). Isso só é
  problema se a 1.4 comparar por trecho. Ver "Open Questions".

### D8. Chaves estrangeiras para administrador e sugestões

- Os `administratorId` das cinco listas e o `reviewerId` da sugestão usam
  `onDelete: SetNull`, como o `AuditLog`. A exclusão permanente de um
  administrador (RF31) não pode ser barrada nem apagar opções que estão em
  uso. Isso inclui trocar a relação atual `AdministratorReason`.
- `Suggestion.requesterId` fica sem cascade, como as demais relações
  (`docs/MODELO-DE-DADOS.md`, "Exclusões permanentes"). A ordem de exclusão
  da 5.3 vai precisar incluir as sugestões. Isso fica anotado na própria 5.3.
- Relações nomeadas em `User`:
  - `CategoryAdministrator`, `CatalogItemAdministrator`,
    `MeasurementUnitAdministrator`, `ProhibitedTermAdministrator` e a
    `AdministratorReason`, que já existe;
  - `SuggestionRequester` e `SuggestionReviewer`.

## Risks / Trade-offs

- **[O Prisma pode tentar apagar os índices de expressão numa migration
  futura]** → Na apply, rodar `prisma migrate dev` duas vezes e conferir que
  a segunda não gera migration. Se o Prisma gerar `DROP INDEX`, mover os
  índices para uma migration manual e documentar em `docs/CONVENCOES.md`.
  _Conferido na apply:_ a segunda execução gerou uma migration vazia, que
  foi descartada.
- **[A normalização do JS e o `unaccent` do banco podem divergir em algum
  caractere raro]** → Só afeta a busca dos selects, não a unicidade. Os
  nomes do domínio são pt-BR comum, que as duas tratam igual.
- **[`GET /categories` some]** → O frontend troca a URL no mesmo PR. Não há
  outro cliente.
- **[O administrador perde a leitura de `/categories`]** → Hoje nenhuma tela
  do painel a usa. A 1.3 cria as rotas `/admin`.

## Migration Plan

1. Migration `listas_padronizadas`: enums, tabelas novas, colunas novas,
   `administratorId` opcional nos motivos, a função `immutable_unaccent` e
   os índices únicos normalizados.
2. Local: `prisma migrate reset` (roda o seed).
3. Staging e produção: o deploy roda `migrate deploy` e depois o seed. A
   migration só acrescenta, então os dados atuais continuam válidos.
   - Os índices únicos normalizados só falhariam se já houvesse duas
     categorias iguais sem acento, o que o seed atual não cria.
4. Rollback: reverter o PR e recriar o banco do ambiente (P02). Na produção,
   uma migration de reversão escrita à mão.

## Open Questions

- **Termos proibidos (D7):** a lista precisa da aprovação da dupla antes do
  apply.
- **Comparação na 1.4:** palavra inteira ou trecho. A recomendação é palavra
  inteira, para não bloquear "computador" por causa de "puta". A decisão é
  da proposta da 1.4.
