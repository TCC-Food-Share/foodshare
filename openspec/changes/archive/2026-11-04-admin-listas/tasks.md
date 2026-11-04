## 1. Backend: peças comuns

- [x] 1.1 `admin/lists/common/`: `AdminListQueryDto` (com `sort` validado
      por lista), `paginateInMemory` e os `code` de erro (design D1, D2), com
      teste unitário da busca por id e por trecho sem acento, da ordenação
      e da paginação.
- [x] 1.2 Função de tradução de `P2002`/`P2003` para `409` com `code`
      (design D3, D4) e o teste dela.

## 2. Backend: as cinco listas

- [x] 2.1 Categorias: service e controller (`/admin/categories`), com
      contagem de itens do catálogo, unicidade, exclusão bloqueada e
      auditoria.
- [x] 2.2 Catálogo: `/admin/food-items`, com categoria obrigatória e
      existente, busca também pelo nome da categoria e exclusão bloqueada
      com alimentos.
- [x] 2.3 Unidades: `/admin/measurement-units`, com nome e sigla únicos e
      a regra de fração em uso (`FRACTION_IN_USE`, design D4).
- [x] 2.4 Motivos: `/admin/cancellation-reasons`, com os de sistema
      marcados na listagem e protegidos na edição e na exclusão; criação
      sempre comum.
- [x] 2.5 Termos proibidos: `/admin/prohibited-terms`, com o termo
      normalizado e exclusão livre.
- [x] 2.6 Registrar os controllers no `AdminModule` e documentar `400`,
      `401`, `403`, `404` e `409` (com os `code`) no Scalar.
- [x] 2.7 Testes dos services: cadastro com administrador criador,
      duplicata com acento, sigla repetida, edição mantendo o nome, opção em
      uso, motivo de sistema, fração em uso, termo normalizado e auditoria
      gravada só nas escritas que passam.
- [x] 2.8 Rodar `npm test`, `npm run lint:check` e `npm run build` no
      backend.

## 3. Frontend: tabela e peças comuns

- [x] 3.1 `components/admin-table.tsx` com busca, ordenação por cabeçalho,
      estado vazio, rodapé "Mostrando X de Y" e paginação (design D6), e o
      hook de parâmetros na URL.
- [x] 3.2 `features/admin/lists/list-api.ts` (fábrica por recurso, tipos e
      mapa de `code` para mensagem) e o `ConfirmDeleteDialog`.

## 4. Frontend: as cinco telas

- [x] 4.1 Categorias: página com o layout do protótipo e diálogo de nome.
- [x] 4.2 Catálogo: colunas nome e categoria; diálogo com nome e
      `SearchableSelect` de categoria.
- [x] 4.3 Unidades: colunas nome, sigla e fração; diálogo com os três
      campos.
- [x] 4.4 Motivos: selo "Sistema" sem ações nos motivos de sistema;
      diálogo de nome.
- [x] 4.5 Termos proibidos: coluna termo; diálogo com o termo.
- [x] 4.6 `router.tsx`: as cinco rotas das listas apontam para as páginas
      novas; as outras seguem com o placeholder.
- [x] 4.7 Rodar `npm run lint:check` e `npm run build` no frontend.

## 5. Verificação e fechamento

- [x] 5.1 No navegador, como administrador: criar, editar e excluir uma
      categoria, e tentar excluir "Laticínios" (bloqueado).
- [x] 5.2 Repetir "PAO FRANCES" no catálogo e a sigla "KG" nas unidades:
      erro no campo certo do diálogo.
- [x] 5.3 Conferir que os motivos de sistema aparecem com o selo "Sistema" e
      sem ações; criar e excluir um termo proibido.
- [x] 5.4 Buscar e ordenar em cada uma das cinco telas.
- [x] 5.5 Desmarcar a fração de "Quilograma" com um alimento de 2,5 kg
      cadastrado: erro `FRACTION_IN_USE` no diálogo.
- [x] 5.6 Conferir no banco que cada escrita aceita gerou a linha certa em
      `audit_log` e que as recusadas não geraram.
- [x] 5.7 Como estabelecimento, conferir que uma categoria e um item criados
      pelo painel aparecem no modal de cadastro de alimento.
- [x] 5.8 Registrar a DT22 em `docs/REQUISITOS.md` e marcar ✅ o item 1.3
      em `docs/PLANO-IMPLEMENTACAO.md`.

## 6. Paginação de todas as listagens (DT23, pedida na revisão)

- [x] 6.1 Backend: `common/pagination.ts` e `pageSize` restrito a 10, 20, 50
      ou 100 (padrão 10) em alimentos, pedidos e listas do painel, com testes.
- [x] 6.2 Frontend: `PageSizeSelect` e `lib/pagination.ts` no feed, nos pedidos
      e na tabela administrativa; contador das abas de pedidos ajustado.
- [x] 6.3 Registrar a DT23 em `docs/REQUISITOS.md`, a regra em
      `docs/CONVENCOES.md` e conferir no navegador o feed e os pedidos.
