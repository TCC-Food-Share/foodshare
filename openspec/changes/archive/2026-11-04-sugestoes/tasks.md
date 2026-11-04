## 1. Backend: envio de sugestão

- [x] 1.1 Criar módulo `suggestions/` com `CreateSuggestionDto` (`type` por enum; `text` com trim, obrigatório, até 200 e `@NoProhibitedContent()`) e `SuggestionResponseDto`.
- [x] 1.2 Criar `suggestions.constants.ts` com os códigos de erro.
- [x] 1.3 Implementar `SuggestionsService.create`: recusa com `SUGGESTION_OPTION_EXISTS` (inclusive sigla de unidade) e `SUGGESTION_ALREADY_PENDING`, sem diferenciar maiúsculas nem acentos, e grava `requesterId`.
- [x] 1.4 Criar `POST /suggestions` com `@RequireRoles(...INSTITUTION_ROLES)`, documentação em pt-BR e registro no `AppModule`.
- [x] 1.5 Testar o service: sugestão válida, opção existente, sigla, pendente igual, mesmo texto em outro tipo, reenvio depois de recusada.

## 2. Backend: decisão do administrador

- [x] 2.1 Extrair `createInTransaction(tx, admin, dto)` nos services de categoria, item do catálogo, unidade e motivo, sem mudar o `create`, e exportá-los no `AdminListsModule`. Rodar `admin-lists.services.spec.ts` sem alterá-lo.
- [x] 2.2 Criar DTOs em `admin/suggestions/`: query com `type` e `status`, `ApproveSuggestionDto`, resposta e página.
- [x] 2.3 Implementar a listagem: filtros, busca, ordenação e nome da instituição (`tradeName ?? companyName`).
- [x] 2.4 Implementar a aprovação em uma transação: transição condicional, validação pelo `Save*Dto` do tipo, `createInTransaction` e auditoria `suggestion.approve`.
- [x] 2.5 Implementar a recusa com transição condicional e auditoria `suggestion.reject`.
- [x] 2.6 Criar o controller com `@AdminController('suggestions')`, documentação em pt-BR e registro no módulo administrativo.
- [x] 2.7 Testar: aprovação de cada tipo, texto ajustado com original preservado, categoria ausente ou inexistente, sigla ausente, texto acima do limite, `DUPLICATE_NAME` e `DUPLICATE_ABBREVIATION` mantendo `Pendente`, `SUGGESTION_ALREADY_REVIEWED`, `404`, linhas de auditoria e ausência delas na falha.
- [x] 2.8 Conferir por chamada à API, contra o banco real, duas aprovações simultâneas da mesma sugestão: uma opção criada e um `409`.

## 3. Frontend: sugerir nova opção

- [x] 3.1 Criar `features/suggestions/`: `suggestion-labels.ts`, API e `SuggestOptionDialog` (Tipo e Texto, mensagens por `code` no campo de texto, `stopPropagation` no `submit`, toast de sucesso).
- [x] 3.2 Acrescentar `onSuggest` ao `SearchableSelect`, com busca controlada e ação no rodapé do popover.
- [x] 3.3 Trocar o `Select` de unidade do modal de alimento por `SearchableSelect`, buscando por nome e sigla e mantendo a revalidação da quantidade.
- [x] 3.4 Ligar `onSuggest` nos selects de alimento e de unidade do modal, com um único diálogo.

## 4. Frontend: tela do painel

- [x] 4.1 Acrescentar `toolbar` ao `AdminTable` e `filterKeys` ao `useAdminListParams`, sem mudar as páginas atuais.
- [x] 4.2 Criar `AdminSuggestionsPage` com filtros (status `Pendente` por padrão, opção "Todos"), colunas e ações só em linha pendente, e registrá-la em `ADMIN_LIST_PAGES`.
- [x] 4.3 Criar o diálogo de aprovação com campos por tipo, erros no campo certo e invalidação de `['admin']` e `['catalog']`.
- [x] 4.4 Criar a confirmação de recusa, tratando `SUGGESTION_ALREADY_REVIEWED` com aviso e atualização da lista.
- [x] 4.5 Rodar `tsc` e `eslint` no frontend, e `jest`, `lint:check` e `tsc` no backend.

## 5. Documentação

- [x] 5.1 Registrar a DT25 em `docs/REQUISITOS.md`: sigla e fração informadas na aprovação, diálogo com select de tipo e recusa de sugestão repetida.

## 6. Verificação ponta a ponta

- [x] 6.1 No navegador, como estabelecimento, sugerir no meio do modal de alimento pelo select de alimento e pelo de unidade: conferir tipo e texto preenchidos, modal intacto depois de enviar e de cancelar, e Esc fechando só o diálogo.
- [x] 6.2 Conferir no diálogo as recusas por opção existente, sugestão pendente e conteúdo proibido.
- [x] 6.3 Conferir no modal a busca de unidade e o erro de quantidade fracionada em unidade sem fração.
- [x] 6.4 Como administrador, filtrar por tipo e status, aprovar um item do catálogo e uma unidade, recusar outra sugestão, e conferir linhas decididas sem ações e o erro de nome duplicado no diálogo.
- [x] 6.5 Como estabelecimento, conferir que o item e a unidade aprovados aparecem nos selects do modal.
- [x] 6.6 Conferir no banco `audit_log` das decisões, a 400 px de largura as telas novas, e o console sem erros além do `401` esperado de `/me`.
- [x] 6.7 Marcar ✅ o item 1.5 em `docs/PLANO-IMPLEMENTACAO.md`.
