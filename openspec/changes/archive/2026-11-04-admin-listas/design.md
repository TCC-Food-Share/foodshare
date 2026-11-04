## Context

- As cinco listas existem desde a 1.1, com índices únicos normalizados
  (`lower(immutable_unaccent(...))`) e o `administratorId` opcional.
- `@AdminController('<recurso>')` já monta `admin/<recurso>`, exige o papel
  `Administrator` e põe a tag "Administração" no Scalar. O
  `AuditService.record(tx, entry)` grava a auditoria dentro de uma
  transação recebida.
- `normalizeText()` (backend e frontend) e `SYSTEM_CANCELLATION_REASON`
  existem desde a 1.1. As rotas públicas `/catalog/...` filtram em memória.
- No frontend, as dez seções do painel usam `AdminPlaceholderPage`; já
  existem `SearchableSelect`, `PaginationBar`, `Dialog` e `Table` do
  shadcn.
- O protótipo tem as telas "Admin Categorias" e "Admin Motivos de
  Cancelamento":
  - cabeçalho com título, descrição e botão "+ Nova …";
  - campo de busca e botão "Ordenar";
  - tabela com ID, nome e ações (editar, excluir);
  - rodapé "Mostrando X de Y" com paginação.

  Não há protótipo dos diálogos de cadastro e edição nem das outras três
  listas.

## Goals / Non-Goals

**Goals:**

- As cinco listas gerenciáveis com as mesmas regras e o mesmo visual.
- Uma tabela administrativa genérica que a fase 5 reaproveite sem mudar.
- Erros de negócio com `code`, para o diálogo mostrar no campo certo.

**Non-Goals:**

- Tela de auditoria, sugestões e validação de termos proibidos.

## Decisions

### D1. Um service e um controller por lista, com peças comuns

- `backend/src/admin/lists/` tem um controller e um service por lista e
  uma pasta `common/` com:
  - `AdminListQueryDto` (`page`, `pageSize`, `search`, `sort`, `order`);
  - `paginateInMemory(items, query, { searchFields, sortFields })`:
    busca por identificador exato se o termo for numérico e por trecho
    normalizado nos campos de texto, ordenação com `localeCompare`
    (`pt-BR`) ou numérica, e corte da página;
  - os `code` de erro (`DUPLICATE_NAME`, `DUPLICATE_ABBREVIATION`,
    `OPTION_IN_USE`, `SYSTEM_REASON_PROTECTED`, `FRACTION_IN_USE`).
- Cada service declara os campos ordenáveis. O DTO valida `sort` contra a
  lista daquela rota, e um valor fora dela dá `400`.
- _Alternativa:_ um CRUD genérico com o nome do model como parâmetro.
  Rejeitada: cada lista tem regras diferentes (categoria no catálogo,
  sigla e fração na unidade, sistema nos motivos, normalização no termo),
  e o genérico viraria uma pilha de condicionais.

### D2. Listagem em memória

As listas são pequenas (o catálogo, a maior, tem 234 itens), então a
listagem faz um `findMany` com `_count` do uso, filtra, ordena e pagina em
memória, como as rotas `/catalog` da 1.1. O total vem depois da busca.
A resposta segue o padrão paginado do projeto.

Contagem de uso por lista:

| Lista            | `usageCount`                       |
| ---------------- | ---------------------------------- |
| Categoria        | itens do catálogo                  |
| Item do catálogo | alimentos (inclusive os excluídos) |
| Unidade          | alimentos (inclusive os excluídos) |
| Motivo           | pedidos                            |
| Termo proibido   | sempre 0                           |

### D3. Unicidade: checagem antes e índice como garantia

- Antes de gravar, o service procura outro registro com o mesmo nome (ou
  sigla) normalizado e responde `409` com o `code` certo.
- Se duas escritas simultâneas passarem pela checagem, o índice único da
  1.1 recusa a segunda. O `P2002` vira `409 DUPLICATE_NAME` (ou
  `DUPLICATE_ABBREVIATION` quando o alvo do erro citar `abbreviation`).
- O termo proibido passa por `normalizeText()` antes da checagem e da
  gravação.

### D4. Exclusão e edição com as regras na transação

- Toda escrita roda em `prisma.$transaction`:
  1. lê o registro (`404` se não existir);
  2. aplica a regra:
     - em uso → `OPTION_IN_USE`;
     - motivo de sistema → `SYSTEM_REASON_PROTECTED`;
     - fração desmarcada com alimento fracionado → `FRACTION_IN_USE`;
  3. grava;
  4. chama `AuditService.record` com o mesmo `tx`.
- Fração em uso: `SELECT count(*) FROM food WHERE "measurementUnitId" = $1
AND deleted = false AND quantity <> trunc(quantity)`, em `$queryRaw`,
  só quando a edição muda `allowsFraction` de `true` para `false`.
- Se a FK recusar a exclusão (`P2003`) por uma escrita concorrente, a
  resposta também é `OPTION_IN_USE`.
- Ações de auditoria:
  - recursos: `category`, `food_catalog_item`, `measurement_unit`,
    `cancellation_reason` e `prohibited_term`;
  - verbos: `.create`, `.update` e `.delete`;
  - `details`: `{ created }`, `{ before, after }` ou `{ deleted }`;
  - o administrador vem da sessão (`id`, `name`, `email`).

### D5. Rotas

`@AdminController(...)` com `GET /`, `POST /`, `PATCH /:id` e
`DELETE /:id` em:

| Recurso                | Campos                                   |
| ---------------------- | ---------------------------------------- |
| `categories`           | `name`                                   |
| `food-items`           | `name`, `categoryId`                     |
| `measurement-units`    | `name`, `abbreviation`, `allowsFraction` |
| `cancellation-reasons` | `name`                                   |
| `prohibited-terms`     | `term`                                   |

- Respostas:
  - `POST`: `201` com o registro;
  - `PATCH`: `200` com o registro;
  - `DELETE`: `204`.
- Os nomes são aparados (`trim`) e têm os mesmos tamanhos máximos do
  schema.

### D6. Tabela administrativa genérica

`frontend/src/components/admin-table.tsx` recebe:

- `columns`: `key`, `header`, `sortable`, `render` e `className`;
- `query`: o resultado paginado e os estados de carregando e de erro;
- os parâmetros atuais e o `onChange`;
- `rowActions`, um render por linha.

Ela desenha o campo de busca (com espera de 300 ms antes de buscar), os
cabeçalhos clicáveis com o indicador de ordem, a tabela, o estado vazio e
o rodapé "Mostrando X de Y" com o `PaginationBar`.

- Os parâmetros ficam na URL (`?search=&sort=&order=&page=`). Recarregar
  a página ou voltar mantém a busca.
- O botão "Ordenar" do protótipo vira o clique no cabeçalho, mais direto
  e com o mesmo efeito.

- Itens por página: um select no rodapé com 10 (padrão), 20, 50 e 100,
  pedido na revisão da tela e estendido a todas as listagens (DT23). O
  `pageSize` fica na URL junto dos outros parâmetros. Os valores ficam em
  `common/pagination.ts` e `lib/pagination.ts`, e o select em
  `components/page-size-select.tsx`, usado também no feed e nos pedidos.

### D7. Telas, diálogos e cache

- `features/admin/lists/` tem:
  - `list-api.ts`: uma fábrica de chamadas por recurso;
  - uma página por lista: cabeçalho do protótipo e colunas próprias;
  - um diálogo de formulário por lista (react-hook-form + zod);
  - um `ConfirmDeleteDialog` genérico.
- Campos dos diálogos:
  - catálogo: nome e categoria, com o `SearchableSelect`;
  - unidade: nome, sigla e "Aceita quantidade fracionada" (`Select`
    Sim/Não, sem dependência nova);
  - motivo e termo: um campo de texto.
- Erros por `code`:
  - `DUPLICATE_NAME` vai para o nome (ou para o termo);
  - `DUPLICATE_ABBREVIATION` vai para a sigla;
  - `FRACTION_IN_USE` vai para o campo de fração;
  - `OPTION_IN_USE` e `SYSTEM_REASON_PROTECTED` viram um aviso no diálogo
    de exclusão.
- Na tabela, a ação de excluir fica desabilitada com dica quando
  `usageCount > 0`. Os motivos de sistema mostram um selo "Sistema" e não
  têm ações.
- Depois de cada escrita, `invalidateQueries` em
  `['admin', '<recurso>']` e em `['catalog']`, porque os selects das
  instituições usam as mesmas listas.
- O `router.tsx` troca o placeholder pelas páginas novas nas cinco rotas
  das listas. As outras cinco seções continuam com o placeholder.

## Risks / Trade-offs

- **[`P2002` com driver adapter pode não trazer o alvo do índice]** → A
  checagem prévia (D3) já dá o `code` certo no caso normal. O índice só
  cobre a corrida, e aí `DUPLICATE_NAME` genérico é aceitável. Conferir no
  apply com um teste manual.
- **[Listagem em memória não escala]** → As listas são curadas e pequenas.
  Se alguma passar de alguns milhares de itens, a função comum troca por
  SQL sem mudar o contrato.
- **[Renomear uma opção muda o nome em alimentos e pedidos antigos]** → É
  o efeito esperado da padronização (o alimento aponta para a opção). A
  auditoria guarda o nome anterior.

## Migration Plan

Sem migration. Deploy normal.

## Open Questions

Nenhuma.
