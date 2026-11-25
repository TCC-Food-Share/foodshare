## 1. Backend: módulo e DTOs

- [x] 1.1 Criar `src/admin/administrators/` (`admin-administrators.module.ts`, `admin-administrators.controller.ts`, `admin-administrators.service.ts`) e importar o módulo no `AdminModule`, com `AuditModule`, `FilesModule` e o token do better-auth disponíveis (design D1)
- [x] 1.2 `administrator.errors.ts`: `EMAIL_ALREADY_REGISTERED`, `CANNOT_DELETE_SELF` e `LAST_ADMINISTRATOR`, todos `409` com `{ code, message }` (design D6)
- [x] 1.3 DTOs com Swagger em pt-BR: `CreateAdministratorDto` (`name` trim, não vazio, até 200; `email` trim + minúsculas, `@IsEmail`, até 200; `password` 8 a 72), `UpdateAdministratorDto` (o mesmo sem senha, tudo opcional), `AdministratorDto` (`id, name, email, image, emailVerified`) e o query DTO por `createAdminListQueryDto(['id', 'name', 'email'])`

## 2. Backend: listagem, cadastro e edição

- [x] 2.1 `list(query)`: usuários com papel `Administrator`, `select` só dos campos do DTO, `toUrl` na imagem, `paginateInMemory` com `searchText = [name, email]` (design D2)
- [x] 2.2 `create(actor, dto, image)` na ordem do design D3: conferência do e-mail → `store(USERS)` → `auth.api.signUpEmail` com `roleId` do `Administrator` e `image` → transação com `audit.record('administrator.create', { name, email })`; erro no `signUpEmail` remove a imagem e responde `409 EMAIL_ALREADY_REGISTERED`; erro na transação apaga usuário, códigos pendentes e imagem
- [x] 2.3 `update(actor, id, dto, image?)` como no design D4: imagem nova antes, transação com `404` para quem não é administrador, conferência de e-mail duplicado (exceto o próprio), update só dos campos enviados, limpeza dos códigos do e-mail antigo quando ele muda, auditoria só com os campos alterados (antes e depois); imagem antiga removida depois do commit, nova removida em erro; `P2002` → `409 EMAIL_ALREADY_REGISTERED`; `emailVerified` e sessões intocados (DT47)
- [x] 2.4 Controller: `GET`, `POST` (`@ImageUpload({ body: CreateAdministratorDto, required: true })`, `201`), `PATCH :id` (`@ImageUpload({ body: UpdateAdministratorDto, required: false })`, `ParseIntPipe`) com `sessionAdministrator(session)`; respostas documentadas (`400`, `401`, `403`, `404`, `409` com as `code`)

## 3. Backend: exclusão (RN34, DT46)

- [x] 3.1 `remove(actor, id)` como no design D5: `id === actor.id` → `409 CANNOT_DELETE_SELF` antes da transação; na transação, `SELECT … FOR UPDATE OF u` de todos os administradores por id crescente; alvo ausente → `404`; zero confirmados além do alvo → `409 LAST_ADMINISTRATOR`; apagar códigos em `verification` do e-mail do alvo, `user.delete` e `audit.record('administrator.delete', { name, email })`; imagem removida depois do commit
- [x] 3.2 Controller: `DELETE :id` (`204`), com `ParseIntPipe` e respostas documentadas

## 4. Backend: testes

- [x] 4.1 Spec do service, listagem: só administradores no `data` e no `total`; busca sem acento por nome, por trecho do e-mail e por id; ordenação por e-mail decrescente; `emailVerified` na linha
- [x] 4.2 Spec do service, cadastro: sucesso cria conta não confirmada com papel `Administrator`, sem celular, imagem gravada e auditoria sem senha; e-mail de instituição (e de conta excluída logicamente) → `409` sem gravar imagem; falha da auditoria apaga conta e imagem
- [x] 4.3 Spec do service, edição: parcial só do nome; troca de e-mail mantém `emailVerified` e sessões e grava em minúsculas; e-mail de outro usuário → `409`; troca de imagem remove a anterior só depois do commit; id de instituição → `404`; auditoria com antes e depois
- [x] 4.4 Spec do service, exclusão: apaga usuário, sessões, contas e códigos; auditoria, categoria criada por ele e `access_log` ficam com o vínculo nulo; `CANNOT_DELETE_SELF` e `LAST_ADMINISTRATOR` sem auditoria; não confirmado excluído libera o e-mail; `404` para id de instituição e inexistente
- [x] 4.5 Teste de concorrência no banco de teste: dois administradores confirmados se excluindo ao mesmo tempo (`Promise.all`) → um `204`/sucesso e um `LAST_ADMINISTRATOR`, sobra um administrador
- [x] 4.6 Specs das rotas: `401` sem sessão, `403 ROLE_NOT_ALLOWED` para instituição, `400` sem imagem, com senha curta, com campo a mais e com `sort=password`, `pageSize=30` → `400`
- [x] 4.7 `npm run lint`, `npx tsc --noEmit` e `npm test` no backend sem erro

## 5. Frontend: API e página

- [x] 5.1 `features/admin/administrators/administrators-api.ts`: tipos, `list(params)`, `create(values, image)` e `update(id, changes, image?)` com `toFormData`, `remove(id)`; mapa de mensagens por `code` (`EMAIL_ALREADY_REGISTERED`, `LAST_ADMINISTRATOR`, `CANNOT_DELETE_SELF`)
- [x] 5.2 `admin-administrators-page.tsx`: título, descrição curta, botão "Novo administrador" e `AdminTable` com `useAdminListParams`; colunas ID, imagem (`UserAvatar`), nome com o selo "Aguardando confirmação" quando `!emailVerified`, e-mail; ações Editar e Excluir, sem Excluir na linha do próprio usuário (DT46)
- [x] 5.3 Registrar a página em `ADMIN_LIST_PAGES['/admin/administradores']`, tirando o placeholder da seção

## 6. Frontend: diálogos

- [x] 6.1 `administrator-form-dialog.tsx` (cadastro e edição): RHF + zod com `mode: 'onChange'`; cadastro com nome, e-mail, `passwordField`, confirmação (`passwordsMatch`, erro no campo de confirmação) e `ImagePicker` obrigatório; edição já preenchida, sem senha, enviando só o diff e com "Salvar" desabilitado sem mudança; botão de submit fixo com `type="submit"`
- [x] 6.2 Erros do servidor no diálogo: `EMAIL_ALREADY_REGISTERED` no campo de e-mail, erro de imagem no campo de imagem, outros num toast com o diálogo aberto
- [x] 6.3 Sucesso do cadastro: fecha o diálogo, invalida a listagem e mostra o toast com o aviso de que o código foi enviado ao e-mail, de que o acesso só vale depois da confirmação e de que o cadastro é apagado sem confirmação em 24 horas; sucesso da edição: toast "Administrador atualizado." e, se for o próprio usuário, `refreshSession()`
- [x] 6.4 `delete-administrator-dialog.tsx`: confirmação com nome e e-mail do alvo e o aviso de exclusão permanente, sem desfazer; `LAST_ADMINISTRATOR` e `CANNOT_DELETE_SELF` com mensagem própria no diálogo; sucesso invalida a listagem e mostra toast
- [x] 6.5 `npm run lint` e `npx tsc -b` no frontend sem erro

## 7. Documentação

- [x] 7.1 `docs/REQUISITOS.md`: acrescentar a DT46 (administrador não exclui a própria conta; `CANNOT_DELETE_SELF`; RN34 vira `LAST_ADMINISTRATOR` nas exclusões cruzadas), a DT47 (troca de e-mail pelo painel vale na hora, sem nova confirmação) e a DT48 (selo "Aguardando confirmação" na listagem); citar a DT47 no RF30, a DT46 no RF31 e a DT48 no RF32
- [x] 7.2 Conferir que o `.env.example` não precisa de variável nova (nenhuma prevista)

## 8. Verificação ponta a ponta e fechamento

- [x] 8.1 Pela API (curl com `--form-string` nos campos de texto, ou Scalar): cadastro com imagem → `201` e e-mail com código no Resend/log; mesmo e-mail de novo → `409`; login antes de confirmar → `403 EMAIL_NOT_VERIFIED`; confirmação pelo código e login → entra em `/admin`; senha e código ausentes em `audit_log` e em `access_log`
- [x] 8.2 Edição: trocar o e-mail do novo administrador e logar com o novo sem código; e-mail antigo recusado; troca de imagem remove o objeto antigo do MinIO
- [x] 8.3 Exclusão: excluir o novo administrador com ele logado em outra janela → a outra janela cai no login na próxima requisição; imagem some do MinIO; auditoria e categoria criada por ele continuam com `administratorId` nulo; `DELETE` do próprio id → `409 CANNOT_DELETE_SELF`
- [x] 8.4 No navegador (dev): seção "Administradores" com a tabela, busca, ordenação e itens por página; selo "Aguardando confirmação"; própria linha sem "Excluir"; cadastro com senhas diferentes bloqueado; e-mail repetido no campo; editar o próprio nome atualiza o menu sem recarregar; tela a 400 px sem rolagem horizontal, tema claro e escuro, sem erro no console além do `401` esperado do `/me`
- [x] 8.5 Marcar ✅ o item 5.1 em `docs/PLANO-IMPLEMENTACAO.md`
