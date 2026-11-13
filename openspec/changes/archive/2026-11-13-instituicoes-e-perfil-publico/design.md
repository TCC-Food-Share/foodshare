## Context

Motivação e escopo em `proposal.md`. O que existe hoje e molda a solução:

- `EstablishmentsController` e `BeneficiaryEntitiesController` têm `POST /` (cadastro anônimo) e `GET`/`PATCH /me`
  (próprio cadastro, `@RequireRoles(...INSTITUTION_ROLES)`). A imagem fica em `User.image` e sai pelo
  `ImageStorageService.toUrl`. Nome fantasia é opcional (`tradeName` nulo, DT40).
- O feed (`GET /foods`, `FoodsService.list`) resolve a página por SQL cru (por causa do `unaccent`) e hidrata pelo
  Prisma. O recorte "disponível" está em `buildAvailableAndFilteredWhere` (SQL) e `availableFoodWhereInput`
  (Prisma). A resposta do alimento já traz do estabelecimento só `id`, razão social, nome fantasia, cidade e UF.
- `GET /orders` (`OrdersService.list`) resolve o dono pela sessão (`establishmentId` ou `beneficiaryEntityId`) e
  aceita `status`, `search` e paginação. O frontend conta as abas com `useOrderCounts` (uma consulta por status com
  `total`).
- `RoleRoute` redireciona papel errado para `homePathFor(role)`. `UserAvatar` já tem fallback de iniciais.
- `FoodCard` é um `<Link>` inteiro para o detalhe.

## Goals / Non-Goals

**Goals:**

- Quatro rotas novas sob os controllers existentes, sem módulo novo no backend.
- Um único ponto que define "instituição pública" (não excluída + e-mail confirmado) e um único mapeamento para o DTO
  público, para nenhum campo privado escapar por descuido.
- Reaproveitar o feed e a listagem de pedidos em vez de criar rotas paralelas para as seções do perfil.

**Non-Goals:**

- Nenhuma migration nem índice novo: o volume de instituições de uma cidade pequena não justifica índice para busca
  por `ILIKE`.
- Nada de contato, endereço ou WhatsApp no perfil (RN36).
- A visão do administrador sobre instituições (5.2).

## Decisions

### 1. Rotas nos controllers existentes, por tipo

`GET /establishments` e `GET /establishments/:id` com `@RequireRoles(ROLE.BENEFICIARY_ENTITY)`;
`GET /beneficiary-entities` e `GET /beneficiary-entities/:id` com `@RequireRoles(ROLE.ESTABLISHMENT)`. O papel
errado (inclusive o administrador) cai no `403 ROLE_NOT_ALLOWED` do guard que já existe.

- `:id` usa `ParseIntPipe` (`400` para "abc"). `GET me` é declarado antes de `GET :id`, e o `ParseIntPipe` ainda
  impede que "me" chegue ao handler do perfil.
- **Alternativa descartada:** um módulo `institutions/` com `GET /institutions?type=`. Esconderia o recorte de papel
  num parâmetro e duplicaria acesso a dados que já estão nos dois services.

### 2. Recorte público e DTO público centralizados

Em cada service, um `where` público único, usado pela listagem e pelo perfil:

```ts
{ deleted: false, user: { emailVerified: true } }
```

E um `toPublic(inst)` que monta o DTO **campo a campo** (nunca espalhando o objeto do Prisma):
`{ id, name: tradeName ?? companyName, image: toUrl(user.image), city, state }` e, no perfil, `description`.
Os DTOs ficam em `common/` (`institution-public.dto.ts`: `InstitutionListItemDto`, `InstitutionPublicProfileDto`,
`PaginatedInstitutionsResponseDto`), porque o formato é o mesmo para os dois tipos. O `name` sai já resolvido, para a
razão social não ir junto "por precaução".

- **Por que `select` explícito:** a consulta usa `select` só com `id`, `tradeName`, `companyName`, `description`,
  `user.image`, `address.city` e `address.state`. Mesmo um erro no mapeamento não teria o CNPJ ou o contato à mão.

### 3. Listagem por SQL cru + hidratação, como no feed

`unaccent` não existe no Prisma Client. A listagem segue o padrão do `FoodsService.list`: SQL cru devolve os ids da
página e o `count(*)`, e o Prisma hidrata com o `select` público, reordenando pelos ids.

- `search` (aparado): `unaccent(tradeName)`, `unaccent(companyName)` e `unaccent(description)` com `ILIKE`. Se o
  texto casa `^[\d./-]+$` e tem ao menos um dígito, soma
  `regexp_replace(cnpj, '\D', '', 'g') LIKE '%' || <dígitos> || '%'`. Texto com letra não compara CNPJ.
- `city`: `unaccent(a.city) ILIKE`; `state`: igualdade, normalizada para maiúsculas, validada por `@Matches` como no
  feed.
- Ordem: `lower(unaccent(COALESCE(NULLIF(tradeName, ''), companyName))), id`.
- O DTO de query (`ListInstitutionsQueryDto`, em `common/`) reaproveita `PAGE_SIZES` e o `trimToUndefined`.
- **Alternativa descartada:** um único campo que também casa cidade e UF. O protótipo tem cidade e UF separados, como
  o feed; o RF10 fica atendido pelos três parâmetros juntos.

### 4. Alimentos do perfil = feed com `establishmentId`

`ListFoodsQueryDto` ganha `establishmentId` (`@Type(() => Number) @IsInt() @Min(1)`), e
`buildAvailableAndFilteredWhere` soma `f."establishmentId" = ${id}`. O recorte "disponível" vem de graça (DT42),
inclusive o `e.deleted = false`. O perfil público do estabelecimento faz duas consultas independentes: o perfil e
`GET /foods?establishmentId=`.

- O feed não filtra `emailVerified`, mas conta não confirmada não loga, então não tem alimento. Não é preciso mexer.
- **Alternativa descartada:** `GET /establishments/:id/foods`. Duplicaria o recorte e o DTO do feed.

### 5. Pedidos do perfil = `GET /orders` com `beneficiaryEntityId`

`ListOrdersQueryDto` ganha `beneficiaryEntityId`. No `list()`, o filtro entra no `where` **depois** do recorte do
dono, como mais uma condição (`AND`). Para a entidade, isso só pode estreitar o resultado (o próprio id ou vazio), sem
erro, então não há ramo especial por papel. A busca (`searchOrderIds`) não muda, porque o resultado dela já é cruzado
com o mesmo `where`.

- `useOrderCounts` e `listOrders` passam a aceitar o filtro (parâmetro opcional), e a chave do TanStack Query inclui
  o `beneficiaryEntityId`. A contagem da aba "Todos" é o `total` da consulta sem `status`.
- **Alternativa descartada:** devolver os pedidos dentro do perfil. O perfil público tem que ser igual para quem
  pede, e os pedidos dependem de quem pede; misturar os dois num DTO só abriria espaço para vazamento.

### 6. Frontend

- Feature `features/institutions/`: `institutions-api.ts` (tipos e chamadas das quatro rotas), `institution-kind.ts`
  (mapa por papel: rota da API, caminho da tela, rótulos "Estabelecimentos"/"Entidades" e singular/plural do
  contador), `institutions-page.tsx`, `institution-card.tsx`, `establishment-profile-page.tsx`,
  `entity-profile-page.tsx`, `profile-parts.tsx` (cabeçalho, "Sobre", seção, esqueleto e o estado "Instituição não encontrada").
- Rotas: `/estabelecimentos` e `/estabelecimentos/:id` sob `RoleRoute roles={['beneficiary']}`; `/entidades` e
  `/entidades/:id` sob `RoleRoute roles={['establishment']}`. `navItemsFor` insere o item entre os pedidos e o perfil.
- Filtros da listagem: o `SearchInput` de `components/` (já tem o debounce) para busca e cidade, o select
  de UF no padrão do feed, `PaginationBar` e `PageSizeSelect`.
- Erro `404` do perfil vira o estado "Instituição não encontrada" (sem toast); outros erros seguem o padrão de erro
  das telas existentes.
- **`FoodCard` com link interno:** um `<a>` dentro de outro é HTML inválido. O card deixa de ser um `<Link>` inteiro e
  passa ao padrão "link esticado": o nome do alimento é o `<Link>` do detalhe, com um `::after` absoluto cobrindo o
  card, e o nome do estabelecimento é um `<Link>` com `relative z-10`, por cima. Para o estabelecimento logado, o nome
  fica como texto. O card continua todo clicável e acessível pelo teclado.
- Detalhe do pedido: o nome da outra parte em `order-detail-cards.tsx` vira `<Link>` para o perfil do tipo dela.
  Detalhe do alimento: o nome do estabelecimento vira `<Link>` quando `role === 'beneficiary'`.
- O helper `establishmentDisplayName` do feed continua para os alimentos; as telas novas usam o `name` que a API já
  resolve.

## Risks / Trade-offs

- [Campo privado vazar numa resposta futura] → `select` explícito, DTO montado campo a campo, e teste de service que
  confere o **conjunto exato de chaves** de cada item e do perfil (não só que o CNPJ não está lá).
- [Busca com `ILIKE '%…%'` sem índice] → aceitável para o volume esperado; se pesar, um índice trigram fica para a
  revisão de performance, sem mudar a spec.
- [Link para perfil de instituição excluída no detalhe do pedido] → o link fica, e o perfil mostra "Instituição não
  encontrada". Esconder exigiria expor o marcador de exclusão da outra parte no detalhe do pedido, o que a RN36 não
  pede.
- [Refazer o `FoodCard` quebra o clique no feed e em "Meus alimentos"] → verificação no navegador do feed, do perfil
  e do teclado (Tab/Enter) antes de concluir.
- [Seis consultas de contagem no histórico de pedidos] → mesmo padrão das abas de `/pedidos`, com `pageSize` mínimo;
  aceitável no volume entre duas instituições.

## Migration Plan

Sem migration nem variável de ambiente. Deploy normal no staging pelo merge em `develop`. Rollback: reverter o merge;
nenhuma rota existente muda de contrato.
