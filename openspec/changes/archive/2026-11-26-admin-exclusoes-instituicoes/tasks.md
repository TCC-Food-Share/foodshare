## 1. Backend: exclusão permanente

- [x] 1.1 Extrair `deleteVerificationCodes(tx, email)` (identificadores `email-verification-otp-<email>` e `forget-password-otp-<email>`) e usar na tarefa da RN48, na exclusão de administrador (5.1) e na exclusão permanente; specs existentes continuam passando (design D4)
- [x] 1.2 `institution.errors.ts`: `INSTITUTION_NOT_SOFT_DELETED` e `institutionNotSoftDeleted()` → `409` com `code` e `message` (design D2)
- [x] 1.3 `AdminInstitutionsService.remove(actor, kind, id)` na ordem do design D3: instituição `FOR UPDATE` (`404` se não existe, `409` se `deleted = false`); leitura de usuário, endereço, razão social, CNPJ e chaves de imagem (usuário e todos os alimentos); pedidos `ORDER BY id FOR UPDATE`; `deleteMany` de pedidos (estabelecimento: `foodId IN` ou `establishmentId`; entidade: `beneficiaryEntityId`), alimentos, sugestões do `requesterId`; instituição, endereço, códigos de verificação e usuário; auditoria `<prefixo>.delete` com `{ companyName, cnpj, deletedFoods, deletedOrders, deletedSuggestions }` (DT56)
- [x] 1.4 Depois do commit, `removeQuietly` da imagem do responsável e de cada imagem de alimento; nenhuma remoção se a transação falhar (design D3)
- [x] 1.5 `update` (5.2): `beforeUpdate` passa a travar sempre a instituição `FOR UPDATE` e lançar `institutionNotFound()` se ela sumiu, para a restauração concorrente responder `404` em vez de `500` (design D5)
- [x] 1.6 Controller: `@Delete(':kind/:id')` com `@HttpCode(204)`, `ParseKindSegmentPipe`, `ParseIntPipe`, `sessionAdministrator(session)` e respostas documentadas em pt-BR (`204`, `401`, `404`, `409 INSTITUTION_NOT_SOFT_DELETED`) citando RF45, RF46 e DT54

## 2. Backend: testes

- [x] 2.1 Spec do service, estabelecimento: excluído com alimentos (inclusive excluídos) e pedidos de todos os status finais → tudo apagado, inclusive pedido com `establishmentId` do estabelecimento; sugestões `Pendente` e `Aprovada` apagadas e a opção aprovada mantida; códigos de verificação apagados; imagens do usuário e dos alimentos removidas depois do commit; auditoria com razão social, CNPJ e contagens, sem nome, e-mail nem celular
- [x] 2.2 Spec do service, entidade: pedidos `Doado` de estabelecimento ativo apagados; alimento do outro lado com estoque e status intactos; auditoria `beneficiary_entity.delete`
- [x] 2.3 Spec do service, recusas: instituição ativa → `409 INSTITUTION_NOT_SOFT_DELETED` sem apagar nada e sem auditoria; id de outro tipo ou inexistente → `404`; falha da auditoria → nada apagado e nenhuma imagem removida; falha ao remover imagem → exclusão mantida
- [x] 2.4 Teste no banco de teste: depois da exclusão permanente, um novo cadastro com o mesmo CNPJ e o mesmo e-mail pessoal é aceito; exclusão permanente e restauração ao mesmo tempo (`Promise.all`) → um dos dois desfechos da spec, nunca `500`; duas exclusões permanentes ao mesmo tempo → uma `204` e outra `404`
- [x] 2.5 Specs das rotas: `DELETE` sem sessão → `401`; instituição → `403 ROLE_NOT_ALLOWED`; tipo inválido no caminho → `400`; sucesso → `204` sem corpo
- [x] 2.6 `npm run lint`, `npx tsc --noEmit` e `npm test` no backend sem erro

## 3. Frontend: API e componentes compartilhados

- [x] 3.1 `institutions-api.ts`: `remove(kind, id)` com `api.delete` e `INSTITUTION_ERROR_MESSAGES` por `code` (`INSTITUTION_NOT_SOFT_DELETED`) (design D6)
- [x] 3.2 Extrair da edição o trecho de impacto (queries `impact` e `cancellationReasonOptions`, texto por tipo) e o select de motivo para um componente compartilhado; a edição passa a usá-lo sem mudar o comportamento da 5.2
- [x] 3.3 `SoftDeleteInstitutionDialog`: impacto, motivo obrigatório para habilitar a confirmação, chamada a `update` com `{ deleted: true, cancellationReasonId }`; sucesso → toast, invalida `INSTITUTIONS_QUERY_KEY` e fecha; erro → mensagem no diálogo (design D1, D6)
- [x] 3.4 `DeleteInstitutionPermanentlyDialog`: padrão visual do diálogo de administrador; nome público, alerta de irreversível, contagens do `activity` do perfil (alimentos só no estabelecimento; pedidos), campo de confirmação que só libera o botão com `EXCLUIR` exato (DT55); sucesso → toast, `removeQueries` do perfil e invalida a listagem; `409` → mensagem no diálogo, que continua aberto

## 4. Frontend: listagem e perfil

- [x] 4.1 `admin-institutions-page.tsx`: terceira ação na linha (`Trash2Icon`), "Excluir" na ativa e "Excluir permanentemente" na excluída, com rótulo acessível com o nome; estado do diálogo na página; parâmetros da URL mantidos depois da exclusão
- [x] 4.2 `admin-institution-profile-page.tsx`: ao lado de "Editar", botão destrutivo "Excluir" ou "Excluir permanentemente" conforme `deleted`; depois da exclusão permanente, navega para `/admin/instituicoes`; depois da exclusão lógica, o perfil mostra a instituição excluída
- [x] 4.3 Perfil com `404`: "Instituição não encontrada" com link para a listagem, no lugar do erro genérico
- [x] 4.4 `npm run lint` e `npx tsc -b` no frontend sem erro

## 5. Documentação

- [x] 5.1 `docs/REQUISITOS.md`: acrescentar a DT54 (exclusão permanente só depois da lógica, `409 INSTITUTION_NOT_SOFT_DELETED`), a DT55 (digitar "EXCLUIR", conferido só na tela) e a DT56 (auditoria com razão social, CNPJ e contagens, sem dado pessoal); citar DT49 no RF42 e no RF43 e DT54–DT56 no RF45 e no RF46
- [x] 5.2 `docs/MODELO-DE-DADOS.md`, "Exclusões permanentes": incluir as sugestões da conta (`Suggestion.requesterId`) e os códigos em `verification` nas ordens de estabelecimento e de entidade, e registrar que a exclusão permanente de instituição exige `deleted = true` (DT54)
- [x] 5.3 Conferir que o `.env.example` não precisa de variável nova (nenhuma prevista)

## 6. Verificação ponta a ponta e fechamento

- [x] 6.1 Pela API (Scalar ou curl): `DELETE` numa ativa → `409`; excluir logicamente pelo `PATCH` e depois `DELETE` → `204`; no banco, nenhuma linha restante da instituição, do usuário, do endereço, dos alimentos, dos pedidos, das sugestões e dos códigos; `audit_log` com a linha `*.delete` sem dado pessoal; objetos removidos do MinIO; novo cadastro com o mesmo CNPJ e e-mail aceito
- [x] 6.2 No navegador (dev): "Excluir" pela linha e pelo perfil, com impacto e motivo; "Excluir permanentemente" pela linha (filtro mantido) e pelo perfil (volta à listagem), com contagens e botão travado até "EXCLUIR"; perfil apagado mostra "não encontrada"; tela a 400 px sem rolagem horizontal, tema claro e escuro, sem erro no console além do `401` esperado do `/me`
- [x] 6.3 Marcar ✅ o item 5.3 em `docs/PLANO-IMPLEMENTACAO.md`
