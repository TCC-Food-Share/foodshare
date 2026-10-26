## Context

- `Food` ainda tem `name`, `categoryId` e `quantityUnit` livres, e `image`
  é uma URL opcional. O `POST /foods` recebe JSON (`CreateFoodDto`).
- A busca do feed é SQL cru (`$queryRaw`) com `unaccent(f.name)` e
  `f."categoryId"`. O recorte de disponível não olha se o estabelecimento
  foi excluído, embora o RF20 peça.
- As respostas de pedido usam `food.name`, `food.quantityUnit` e, no
  detalhe, `food.image` cru e `food.category`.
- Já existem:
  - `@ImageUpload()`, `ImageFilePipe` e `ImageStorageService`
    (`store`, `removeQuietly`, `toUrl`), da 0.3;
  - o `ImagePicker` e o `toFormData`, no frontend;
  - `GET /catalog/food-items` e `GET /catalog/measurement-units`, da 1.1,
    e os 234 itens da TACO, da 1.2.
- Não existe select com busca no frontend: só `Select` do Radix e um
  autocomplete próprio de cidades.
- Decisões da proposta: produção e staging recriados antes do deploy; o
  "Somente parcial" é recusado quando nenhum pedido parcial é possível.

## Goals / Non-Goals

**Goals:**

- O alimento passa a depender só das listas padronizadas, sem texto livre.
- Contrato de resposta que a 2.2 e a 3.1 usem sem mudar de novo.
- Um select com busca reaproveitável pelas próximas changes.

**Non-Goals:**

- Edição do alimento (2.2), pedido por tipo (3.1), sugestão de opção (1.5)
  e termos proibidos (1.4).

## Decisions

### D1. Migration sem conversão

A migration troca as colunas de `food` (sai `name`, `categoryId`,
`quantityUnit`; entram `catalogItemId`, `measurementUnitId`,
`requestType` e `notes`; `image` vira `NOT NULL`), cria o enum
`FoodRequestType` e os dois índices, e tira `Category.foods`.

- As colunas novas são `NOT NULL` sem default, então a migration **falha**
  se `food` tiver linhas. É a trava que impede um deploy sobre o banco
  antigo: staging e produção precisam ser limpos antes (decisão da
  proposta).
- `Order` não muda.

### D2. Contrato do alimento

`FoodResponseDto` (cadastro, feed e detalhe):

```ts
{
  id, image /* URL */, name /* catálogo */, quantity /* string */,
  measurementUnit: { id, name, abbreviation, allowsFraction },
  requestType: 'TOTAL_ONLY' | 'PARTIAL_ONLY' | 'TOTAL_OR_PARTIAL',
  description, notes /* string | null */, expirationDate, publishedAt,
  category: { id, name } /* do catálogo */, status: { id, name },
  establishment: { id, companyName, tradeName, city, state },
}
```

- `quantityUnit` sai. `name` e `category` continuam com o mesmo formato,
  para o feed, o card e os pedidos mudarem pouco.
- `allowsFraction` vem junto porque a 3.1 vai precisar dele no modal de
  pedido.
- Os pedidos **mantêm** `food.quantityUnit` (agora a sigla da unidade) e
  `food.name`: o pedido não é o escopo aqui, e a 3.1 revisa esse contrato.

### D3. Cadastro em multipart

- `POST /foods` usa `@ImageUpload({ body: CreateFoodDto, required: true })`
  e `ImageFilePipe({ required: true })`, como o cadastro das instituições.
- No multipart todo campo chega como texto, então o DTO converte com
  `@Type(() => Number)` (`catalogItemId`, `measurementUnitId`, `quantity`).
  `requestType` usa `@IsEnum(FoodRequestType)`; `notes` é opcional, até
  2000 caracteres, e string vazia vira `undefined`.
- Ordem no service, para não deixar arquivo órfão:
  1. o estabelecimento da sessão;
  2. o item do catálogo e a unidade (`400` com o `code` próprio);
  3. as regras de quantidade (D4);
  4. o upload na pasta `foods` (`IMAGE_FOLDER.FOODS`);
  5. o `create`.
- Se o `create` falhar, `removeQuietly(chave)` e o erro sobe.
- Os `code` novos ficam em `foods/foods.constants.ts`: `INVALID_CATALOG_ITEM`,
  `INVALID_MEASUREMENT_UNIT`, `FRACTION_NOT_ALLOWED` e
  `PARTIAL_ONLY_QUANTITY_TOO_LOW`.

### D4. Regras de quantidade

- **Fração (RN03):** se `quantity` não é inteiro e a unidade não aceita
  fração → `FRACTION_NOT_ALLOWED`. O limite de 2 casas já é do DTO.
- **"Somente parcial" (DT21):** o menor pedido possível é 1 (unidade sem
  fração) ou 0,01 (com fração). O pedido parcial precisa ser maior que 0 e
  menor que a quantidade, então o cadastro exige `quantity > passo`:
  - sem fração: quantidade de pelo menos 2;
  - com fração: quantidade de pelo menos 0,02.
  - Fora disso → `PARTIAL_ONLY_QUANTITY_TOO_LOW`.
- As mesmas duas regras ficam numa função pura (`foods/food-quantity.ts`),
  testada sozinha, e o frontend repete a lógica no schema do zod.

### D5. Busca e recorte de disponível

- O SQL do feed ganha `JOIN food_catalog_item ci ON ci.id =
f."catalogItemId"`:
  - `name` → `unaccent(ci.name) ILIKE ...`;
  - `categoryId` → `ci."categoryId" = ...`.
- Entra `e.deleted = false` no SQL e
  `establishment: { deleted: false }` no `availableFoodWhereInput`. O
  comentário que já liga as duas funções continua valendo.
- O `hydrate` e o detalhe incluem `catalogItem: { include: { category } }`
  e `measurementUnit`.

### D6. Select com busca no frontend

- `components/searchable-select.tsx`: o Combobox do shadcn (Popover +
  Command do `cmdk`), genérico em `{ value, label, keywords? }`, com filtro
  próprio que compara sem acento e sem maiúsculas
  (`lib/normalize-text.ts`, a mesma regra do backend).
- O select fica preparado para receber uma ação extra no rodapé, que a 1.5
  vai usar para "Sugerir nova opção".
- O catálogo e as unidades são carregados uma vez por sessão
  (`useQuery` com `staleTime` longo, chaves `['catalog', 'food-items']` e
  `['catalog', 'measurement-units']`). Com 234 itens, o filtro roda no
  navegador.

### D7. Modal "Cadastrar Alimento"

- Layout do frame "Cadastrar Alimento (Modal)" do Pencil: cabeçalho com
  ícone e rodapé fixos, com divisórias, e só o corpo rolando.
- Campos, nesta ordem:
  - foto do alimento, numa linha própria no topo: `ImagePicker` na variante
    `dropzone` (área de largura total, clique ou arrastar e soltar, prévia
    dentro da área);
  - nome do alimento (select com busca) e categoria (somente leitura, do
    item escolhido), lado a lado;
  - descrição;
  - quantidade, unidade (select) e data de vencimento;
  - tipo de solicitação (três cartões com `RadioGroup`, com a dica do
    protótipo);
  - observações.
- O protótipo não marca a descrição como obrigatória nem tem campo de
  imagem; o código segue o RF14 nos dois casos.
- O schema do zod valida a fração e o "Somente parcial" com a unidade
  escolhida (`refine` com `when`, para rodar mesmo com outros campos inválidos), e o envio usa `toFormData`.
- Os erros do servidor vão para o campo certo pelo `code`, como no
  cadastro das instituições: imagem pelo `imageErrorMessage`, fração e
  "Somente parcial" na quantidade, item ou unidade inválidos no select.
- Rótulos do tipo de solicitação num arquivo só,
  `features/foods/food-request-type.ts` (`docs/CONVENCOES.md`).

### D8. Feed, detalhe e pedidos no frontend

- O card do feed mostra a sigla da unidade e o nome do estabelecimento
  (nome fantasia, ou razão social se não houver). O detalhe acrescenta o
  tipo de solicitação, as observações (só se houver) e a data de
  publicação.
- `create-order-dialog` passa a ler `food.measurementUnit.abbreviation`.
  O resto do pedido não muda.

## Risks / Trade-offs

- **[Deploy sobre banco não limpo]** → A migration falha (D1) em vez de
  corromper dados. A limpeza do staging e da produção vira um passo
  explícito no fechamento.
- **[Duas implementações do mesmo filtro, SQL e Prisma]** → Ganham a mesma
  condição nova juntas, e os testes do service cobrem as duas.
- **[Regra de quantidade duplicada no front e no back]** → O back é a
  fonte; o front só antecipa o erro. Os mesmos casos de teste nos dois.
- **[`cmdk` e Popover são dependências novas]** → São JavaScript puro, sem
  binário nativo, e são a base do Combobox oficial do shadcn, que a
  `docs/CONVENCOES.md` já prevê.

## Migration Plan

1. Local: `prisma migrate reset` (apaga o banco local; o seed recria as
   listas e o catálogo).
2. Staging e produção: limpar o banco no Coolify, depois deploy
   (`migrate deploy` + seed + administrador do seed).
3. Rollback: reverter o PR e recriar o banco de novo.

## Open Questions

Nenhuma.
