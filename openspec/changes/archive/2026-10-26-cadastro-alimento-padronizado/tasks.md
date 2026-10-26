## 1. Schema e migration (backend)

- [x] 1.1 `schema.prisma`: enum `FoodRequestType`; em `Food`, sair `name`,
      `categoryId` e `quantityUnit` e entrar `catalogItemId`,
      `measurementUnitId`, `requestType` e `notes` (`VarChar(2000)`,
      opcional), com `image` obrigatória e os índices `(statusId, deleted)` e
      `(establishmentId, statusId)`; relações `foods` em `FoodCatalogItem` e
      `MeasurementUnit`; sair `Category.foods` (design D1).
- [x] 1.2 Gerar a migration (`prisma migrate dev --name
cadastro_alimento_padronizado`), conferir que ela falha com `food`
      preenchida e passa com `food` vazia, e rodar `prisma migrate reset`
      no banco local (pedir confirmação antes, porque apaga os dados locais).

## 2. Backend: cadastro

- [x] 2.1 `files.constants.ts`: `IMAGE_FOLDER.FOODS = 'foods'`.
- [x] 2.2 `foods.constants.ts`: os quatro `code` novos (design D3).
- [x] 2.3 `foods/food-quantity.ts` com as regras de fração e de "Somente
      parcial" (design D4) e o teste unitário dos limites (1 e 2 em "un";
      0,01 e 0,02 em "kg"; 2,5 em "un").
- [x] 2.4 `CreateFoodDto` em multipart (`@Type(() => Number)`,
      `@IsEnum(FoodRequestType)`, `notes` opcional) e `@ImageUpload()` com
      imagem obrigatória no `POST /foods`, com a documentação do Scalar
      (design D3).
- [x] 2.5 `FoodsService.create`: validações na ordem do design D3, upload
      na pasta `foods`, `removeQuietly` se o `create` falhar.

## 3. Backend: respostas, feed e detalhe

- [x] 3.1 `FoodResponseDto` com o contrato do design D2 e `toResponse`
      com `toUrl`, `catalogItem` e `measurementUnit`.
- [x] 3.2 Busca do feed com `JOIN food_catalog_item`, filtro de categoria
      pelo item e `e.deleted = false`; `availableFoodWhereInput` com o mesmo
      recorte (design D5).
- [x] 3.3 Pedidos: `food.name` e `food.quantityUnit` vindos do catálogo e
      da sigla da unidade; no detalhe, imagem por `toUrl` e categoria do
      item (design D2).
- [x] 3.4 Atualizar `foods.service.spec.ts` e os testes de pedidos:
      cadastro válido, item ou unidade inexistentes, fração, "Somente
      parcial", falha depois do upload, busca por nome do catálogo, filtro
      de categoria e estabelecimento excluído.
- [x] 3.5 Rodar `npm test`, `npm run lint:check` e `npm run build` no
      backend.

## 4. Frontend: select com busca

- [x] 4.1 Instalar `@radix-ui/react-popover` e `cmdk` e criar os
      componentes `popover` e `command` do shadcn.
- [x] 4.2 `lib/normalize-text.ts` e `components/searchable-select.tsx`
      (design D6).
- [x] 4.3 `features/catalog/catalog-api.ts` com as consultas do catálogo e
      das unidades e os hooks com `staleTime` longo.

## 5. Frontend: modal, feed e detalhe

- [x] 5.1 `features/foods/food-request-type.ts` com os rótulos em pt-BR.
- [x] 5.2 `create-food-schema.ts`: campos novos e validação de fração e de
      "Somente parcial" pela unidade escolhida (design D7).
- [x] 5.3 `create-food-dialog.tsx`: select de alimento com categoria
      somente leitura, select de unidade, cartões de tipo, observações,
      `ImagePicker` e envio em `FormData`, com os erros do servidor no
      campo certo.
- [x] 5.4 `foods-api.ts` com os tipos novos; `food-card.tsx` e
      `food-detail-page.tsx` com unidade, tipo, observações, data de
      publicação e nome do estabelecimento (design D8).
- [x] 5.5 `create-order-dialog.tsx` e os tipos de pedido lendo a unidade
      nova.
- [x] 5.6 Rodar `npm run lint:check` e `npm run build` no frontend.

## 6. Verificação e fechamento

- [x] 6.1 No navegador, como estabelecimento: cadastrar "Pão francês"
      (10 un, "Total ou parcial") com imagem; conferir que aparece na hora no
      feed com nome, categoria, unidade e imagem, e que a busca "pao" o
      encontra.
- [x] 6.2 No navegador: 2,5 em "Unidade" mostra o erro antes de enviar;
      "Somente parcial" com 1 un mostra o erro; uma imagem acima de 5 MB
      mostra o erro no campo de imagem.
- [x] 6.3 Como entidade: o detalhe mostra tipo de solicitação,
      observações, unidade e data de publicação; o modal "Solicitar doação"
      continua funcionando com a unidade nova. Console sem erros.
- [x] 6.4 Registrar a DT21 ("Somente parcial" exige pedido parcial
      possível) em `docs/REQUISITOS.md` e atualizar
      `docs/MODELO-DE-DADOS.md` (`Food` aplicado; `Category.foods` saiu).
- [x] 6.5 Anotar no PR que staging e produção precisam do banco limpo antes
      do deploy, e marcar ✅ o item 2.1 em `docs/PLANO-IMPLEMENTACAO.md`.
