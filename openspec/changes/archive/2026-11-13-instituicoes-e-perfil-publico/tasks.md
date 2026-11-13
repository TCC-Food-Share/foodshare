## 1. Backend: DTOs públicos e de query

- [x] 1.1 Criar `common/institution-public.dto.ts` com `InstitutionListItemDto` (`id`, `name`, `image`, `city`, `state`), `InstitutionPublicProfileDto` (os mesmos + `description`) e `PaginatedInstitutionsResponseDto` (`data`, `total`, `page`, `pageSize`), com `@ApiProperty` em pt-BR e `example` em inglês (design D2)
- [x] 1.2 Criar `common/list-institutions-query.dto.ts` (`ListInstitutionsQueryDto`): `page`, `pageSize` (`PAGE_SIZES`), `search` e `city` (aparados, vazio vira ausente, até 200 caracteres) e `state` (maiúsculas, 2 letras), no padrão do `ListFoodsQueryDto` (design D3)
- [x] 1.3 Teste de validação do `ListInstitutionsQueryDto`: `pageSize` 15 recusa; `search` com 201 caracteres recusa; `search` só com espaços vira ausente; `state` "sp" vira "SP"; `state` "SPX" recusa

## 2. Backend: listagem e perfil público

- [x] 2.1 Em `establishments.service.ts`, criar o `where` público (`deleted: false`, `user.emailVerified: true`), o `select` público e o `toPublic()` campo a campo, com `name = tradeName ?? companyName` e `image` pelo `toUrl` (design D2)
- [x] 2.2 Em `establishments.service.ts`, `listPublic(query)`: SQL cru com `unaccent` para os ids da página e o `count(*)` (busca em nome fantasia, razão social e descrição; CNPJ só por dígitos quando o texto tem só dígitos e `./-`; `city`; `state`), ordem `lower(unaccent(COALESCE(NULLIF(tradeName,''), companyName))), id`, e hidratação com o `select` público na ordem dos ids (design D3)
- [x] 2.3 Em `establishments.service.ts`, `findPublic(id)`: `findFirst` com o `where` público e o `select` público; ausente → `NotFoundException`
- [x] 2.4 Em `establishments.controller.ts`: `GET /` (`listPublic`) e `GET /:id` (`ParseIntPipe`, `findPublic`), ambos com `@RequireRoles(ROLE.BENEFICIARY_ENTITY)`, declarados depois do `GET me`, com `@ApiOperation`/`@ApiOkResponse`/`@ApiBadRequestResponse`/`@ApiForbiddenResponse`/`@ApiNotFoundResponse` em pt-BR citando RF10/RF13 e RN36
- [x] 2.5 Repetir 2.1–2.4 em `beneficiary-entities/`, com `@RequireRoles(ROLE.ESTABLISHMENT)` e citando RF10/RF12
- [x] 2.6 Testes de service (nos dois `*.service.spec.ts`):
  - conjunto **exato** de chaves de cada item da listagem e do perfil (sem CNPJ, razão social, contato, endereço, responsável, `createdAt`, `deleted`);
  - `name` cai na razão social sem nome fantasia;
  - o `where` público exclui `deleted` e `emailVerified: false`, na listagem e no perfil (perfil → `NotFoundException`);
  - busca por CNPJ só com texto de dígitos e pontuação; "Padaria 2" não compara CNPJ;
  - paginação devolve `total`, `page` e `pageSize`
- [x] 2.7 Teste de controller ou e2e do guard: estabelecimento em `GET /establishments` e `GET /establishments/:id` → `403 ROLE_NOT_ALLOWED`; entidade nas rotas de entidade → `403`; `GET /establishments/abc` → `400`; `GET /establishments/me` continua devolvendo o próprio cadastro

## 3. Backend: filtros novos no feed e nos pedidos

- [x] 3.1 `ListFoodsQueryDto`: `establishmentId` opcional (`@Type(() => Number)`, `@IsInt()`, `@Min(1)`), com `@ApiPropertyOptional` em pt-BR citando o perfil público (RF13)
- [x] 3.2 `FoodsService.buildAvailableAndFilteredWhere`: somar `f."establishmentId" = ${id}` quando informado; atualizar a `description` do `@ApiOperation` do `GET /foods` (design D4)
- [x] 3.3 Testes do feed: `establishmentId` traz só os alimentos disponíveis desse estabelecimento (sem vencido, `Inativo` ou zerado); estabelecimento excluído → lista vazia; `establishmentId` "abc" ou 0 → `400`
- [x] 3.4 `ListOrdersQueryDto`: `beneficiaryEntityId` opcional (`@Type(() => Number)`, `@IsInt()`, `@Min(1)`), com `@ApiPropertyOptional` em pt-BR
- [x] 3.5 `OrdersService.list`: somar `beneficiaryEntityId` ao `where` junto do recorte do dono, sem substituí-lo (design D5); atualizar a `description` do `@ApiOperation` do `GET /orders`
- [x] 3.6 Testes dos pedidos: estabelecimento com o filtro vê só os pedidos dele com a entidade; combinação com `status`; entidade com o id de outra entidade → vazio; pedido `deleted` fora; `beneficiaryEntityId` inválido → `400`
- [x] 3.7 `npm run lint` e `npm test` no backend sem erro (sem `npm run build` com o `start:dev` ligado)

## 4. Frontend: API, rotas e menu

- [x] 4.1 Criar `features/institutions/institutions-api.ts` (tipos `InstitutionListItem`, `InstitutionPublicProfile`, `PaginatedInstitutions`; `listInstitutions(kind, params)` e `getInstitution(kind, id)`) e `institution-kind.ts` (por tipo: rota da API, caminho da tela, título, singular/plural do contador) (design D6)
- [x] 4.2 `foods-api.ts`: `establishmentId` opcional nos parâmetros do feed; `orders-api.ts` e `use-order-counts.ts`: `beneficiaryEntityId` opcional, incluído na `queryKey`, e contagem "Todos" (consulta sem `status`)
- [x] 4.3 `app/router.tsx`: `/estabelecimentos` e `/estabelecimentos/:id` sob `RoleRoute roles={['beneficiary']}`; `/entidades` e `/entidades/:id` sob `RoleRoute roles={['establishment']}`
- [x] 4.4 `components/layout/nav-items.ts`: "Estabelecimentos" (entidade) e "Entidades" (estabelecimento), entre os pedidos e o perfil (DT43)

## 5. Frontend: tela de listagem

- [x] 5.1 `institutions-page.tsx`: título do tipo, busca ("Buscar por nome, CNPJ ou descrição"), cidade e UF com debounce e estado na URL (reaproveitando o `SearchInput` de `components/`, que já tem o debounce, e o select de UF no padrão do feed), contador no singular/plural, `PaginationBar` e `PageSizeSelect`
- [x] 5.2 `institution-card.tsx`: `UserAvatar` com fallback, nome e cidade/UF, como `<Link>` para o perfil
- [x] 5.3 Estados de carregamento (skeleton), vazio com "Limpar filtros" e erro, e layout em uma coluna a 400 px

## 6. Frontend: perfis públicos

- [x] 6.1 `profile-parts.tsx`: cabeçalho (avatar, nome, cidade/UF) e seção "Sobre"; estado de erro ("Instituição não encontrada" + link para a listagem do tipo), mostrado quando o perfil responde `404`
- [x] 6.2 `establishment-profile-page.tsx`: cabeçalho, "Sobre" e "Alimentos disponíveis" com contador, grade de `FoodCard` por `GET /foods?establishmentId=`, paginação e estado vazio ("Nenhum alimento disponível no momento")
- [x] 6.3 `entity-profile-page.tsx`: cabeçalho, "Sobre" e "Histórico de pedidos" ("Pedidos entre você e esta entidade") com abas Todos + os cinco status e contagens, tabela (alimento, data, quantidade com unidade, `OrderStatusBadge`, "Ver" → `/pedidos/:id`), paginação e estado vazio ("Nenhum pedido entre vocês ainda"); aba e página na URL
- [x] 6.4 Nenhuma das telas mostra contato, endereço, CNPJ, WhatsApp ou data de cadastro (protótipo divergente, registrado na proposta)

## 7. Frontend: links para o perfil (DT43)

- [x] 7.1 `food-card.tsx`: trocar o `<Link>` inteiro pelo padrão "link esticado" (nome do alimento com `::after` cobrindo o card); nome do estabelecimento como `<Link>` `relative z-10` para `/estabelecimentos/:id` só quando o papel é `beneficiary`, texto nos demais casos (design D6)
- [x] 7.2 `food-detail-page.tsx`: nome do estabelecimento como `<Link>` para o perfil só para a entidade
- [x] 7.3 `order-detail-cards.tsx`: nome da outra parte como `<Link>` para o perfil do tipo dela (`/entidades/:id` para o estabelecimento, `/estabelecimentos/:id` para a entidade); a própria instituição sem link
- [x] 7.4 `npm run lint` e `npx tsc -b` no frontend sem erro

## 8. Documentação

- [x] 8.1 `docs/REQUISITOS.md`: acrescentar DT41 (listagem e perfil só de instituições não excluídas e com e-mail confirmado; perfil fora disso → `404`), DT42 (alimentos do perfil público seguem o recorte do feed) e DT43 (links para o perfil no card do feed e no detalhe do alimento, só para a entidade, e no detalhe do pedido; rótulos do menu pelo tipo oposto), e citá-las na observação do RF10, RF12 e RF13. A coluna "Situação" não muda

## 9. Verificação ponta a ponta e fechamento

- [x] 9.1 Pela API (curl ou Scalar), com uma entidade e um estabelecimento: conferir o **JSON** de `GET /establishments`, `GET /establishments/:id`, `GET /beneficiary-entities` e `GET /beneficiary-entities/:id` — só as chaves da spec, sem contato, endereço, CNPJ ou dado pessoal, mesmo havendo pedido `Em andamento` entre as duas; papel errado → `403`; instituição excluída ou não confirmada fora da listagem e com `404` no perfil
- [x] 9.2 No navegador (dev), como entidade:
  - menu "Estabelecimentos" → busca por nome sem acento, por CNPJ com e sem pontuação, cidade e UF; contador e paginação; recarregar mantém a busca;
  - perfil do estabelecimento com os alimentos disponíveis (sem o vencido) → card abre o detalhe;
  - nome do estabelecimento no card do feed e no detalhe do alimento abre o perfil; o resto do card ainda abre o detalhe, também por teclado
- [x] 9.3 No navegador (dev), como estabelecimento:
  - menu "Entidades" → listagem e perfil da entidade com o histórico (abas, contagens, "Ver" abre o pedido);
  - nome da entidade no detalhe do pedido abre o perfil; no feed, o nome do estabelecimento aparece sem link;
  - endereço `/estabelecimentos` redireciona para a tela inicial
- [x] 9.4 Perfil de instituição excluída mostra "Instituição não encontrada"; telas a 400 px sem rolagem horizontal, tema claro e escuro; nenhum erro no console além do `401` esperado do `/me` nas telas públicas
- [x] 9.5 Marcar ✅ o item 4.3 em `docs/PLANO-IMPLEMENTACAO.md`
