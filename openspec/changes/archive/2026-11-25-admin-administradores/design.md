## Context

Motivação e escopo em `proposal.md`; comportamento em `specs/admin/administradores`, com os ajustes em
`specs/admin/painel` e `specs/auth/confirmacao-email`. O que existe hoje e molda a solução:

- `@AdminController('<recurso>')` monta `/admin/...`, exige `Administrator` e põe a tag "Administração". As listas da
  1.3 usam `createAdminListQueryDto(sortFields)`, `paginateInMemory` (busca sem acento, id exato, ordenação, página) e
  `sessionAdministrator(session)` para a auditoria.
- `AuditService.record(tx, entry)` grava na transação recebida e já tira chaves com `password`, `token`, `otp` etc.
- O cadastro de instituição chama `auth.api.signUpEmail` com `image: imageKey` e `roleId`. Com
  `requireEmailVerification`, `sendOnSignUp` e `autoSignIn: false`, a chamada cria `User` + `Account` (credencial),
  grava `emailVerified = false`, envia o código e não abre sessão. A rota HTTP `/sign-up/email` está desligada, mas
  `disabledPaths` só vale para HTTP.
- `/update-user` e `/change-email` do better-auth estão desligados. O login procura o usuário pelo e-mail (em
  minúsculas) e a credencial pelo `userId`, então trocar `user.email` direto no banco não quebra a senha.
- `ImageStorageService`: `store(IMAGE_FOLDER.USERS, image)` antes da transação, `removeQuietly(key)` depois do commit,
  `toUrl(key)` na resposta. `@ImageUpload({ body, required })` faz o multipart e valida a imagem (RN41).
- Todas as FKs para `User` fora do better-auth têm `onDelete: SetNull` (auditoria, acessos, listas, revisor de
  sugestão), exceto `Suggestion.requesterId`, `Establishment.userId` e `BeneficiaryEntity.userId`, que administrador
  nunca preenche. `Session` e `Account` saem em cascata.
- A tarefa da RN48 já apaga qualquer usuário não confirmado com mais de 24 horas, inclusive administrador, e limpa os
  códigos em `verification` por `email-verification-otp-<email>` e `forget-password-otp-<email>`.
- Frontend: `AdminTable`, `useAdminListParams` (estado na URL), `ImagePicker`, `toFormData`, `passwordField` e
  `passwordsMatch`; `useAuth().user` e `refreshSession()`. O router usa `ADMIN_LIST_PAGES[item.to]` e cai no
  `AdminPlaceholderPage` quando a seção não tem página.

## Goals / Non-Goals

**Goals:**

- RN34 garantida no banco, sem janela entre contar e apagar, inclusive com duas exclusões cruzadas.
- Auditoria de cada escrita na mesma transação; no cadastro, que começa fora dela, desfazer a conta se a auditoria
  falhar.
- Reaproveitar o máximo da 1.3 e da 0.3, sem migration.

**Non-Goals:**

- Componente genérico de diálogo de exclusão para todo o painel: a 5.2–5.5 decidem se extraem.
- Mexer no fluxo de confirmação, no texto do e-mail ou na tarefa da RN48.

## Decisions

### 1. Módulo `admin/administrators`

`AdminAdministratorsModule` (controller + service + DTOs), importado no `AdminModule`, com `AuditModule`, `FilesModule`
e o token do better-auth.

| Rota                                | Corpo                                    | Resposta                       |
| ----------------------------------- | ---------------------------------------- | ------------------------------ |
| `GET /admin/administrators`         | query `page, pageSize, search, sort, order` | `Paginated<AdministratorDto>` |
| `POST /admin/administrators`        | multipart `name, email, password, image` | `201` `AdministratorDto`       |
| `PATCH /admin/administrators/:id`   | multipart parcial `name?, email?, image?`| `200` `AdministratorDto`       |
| `DELETE /admin/administrators/:id`  | —                                        | `204`                          |

`AdministratorDto = { id, name, email, image: string | null, emailVerified: boolean }`. `sort` aceita `id`, `name` e
`email`.

DTOs: `name` `@IsString @IsNotEmpty @MaxLength(200)` com trim; `email` `@IsEmail @MaxLength(200)` com trim e
`toLowerCase` (o better-auth grava em minúsculas; sem isso a unicidade e o login divergem); `password`
`@MinLength(8) @MaxLength(72)`, igual ao cadastro de instituição. O `Update` é o `Create` sem senha, com tudo
`@IsOptional`. Nome e e-mail não passam pelo `@NoProhibitedContent()`: a DT24 não inclui nome de pessoa.

### 2. Listagem em memória

Busca todos os usuários do papel `Administrator` (`select` só dos campos do DTO) e entrega ao `paginateInMemory`, com
`searchText = [name, email]`. Alternativa: `$queryRaw` com `immutable_unaccent` e `LIMIT`. Não compensa: o número de
administradores é pequeno, e o helper já faz id exato, sem acento, ordenação e página do jeito que a spec pede.

### 3. Cadastro: `signUpEmail` + auditoria com compensação

1. Confere, sem transação, se o e-mail (em minúsculas) já existe em `user` → `409 EMAIL_ALREADY_REGISTERED`. Assim
   o caso comum não chega a gravar a imagem.
2. `store(USERS, image)`.
3. `auth.api.signUpEmail({ body: { name, email, password, image: key, roleId } })`. Erro (e-mail criado no meio do
   caminho) → `removeQuietly(key)` e `409 EMAIL_ALREADY_REGISTERED`.
4. `$transaction`: `audit.record(administrator.create, { name, email })` e leitura do usuário criado.
5. Falha no passo 4 → apaga o usuário e os códigos pendentes dele, `removeQuietly(key)`, e repassa o erro.

Alternativa considerada: criar `User` + `Account` dentro da transação pelo `internalAdapter` (como o seed) e depois
enviar o código. Daria atomicidade real, mas o envio dependeria de chamar `sendVerificationEmail` fora da rota (e do
limite de 10 minutos dela), duplicando o que o `signUpEmail` já faz. O plano pede `signUpEmail`; a compensação segue o
padrão do cadastro de instituição. Custo aceito: se a auditoria falhar, o código já saiu para uma conta que deixa de
existir.

### 4. Edição em transação, imagem pelo padrão da 0.3

- Se veio imagem, `store` antes.
- `$transaction`: lê o alvo com `role.name = Administrator` (senão `404`); se o e-mail mudou, confere duplicado em
  `user` (exceto o próprio) → `409`; `user.update` só com os campos enviados; se o e-mail mudou, apaga os códigos em
  `verification` do e-mail antigo; `audit.record(administrator.update, { before, after })` só com os campos que
  mudaram.
- Depois do commit, `removeQuietly(imagem antiga)`. Em erro, `removeQuietly(imagem nova)`. `P2002` em `email` vira
  `409 EMAIL_ALREADY_REGISTERED` (corrida entre a conferência e o update).
- `emailVerified` não é tocado (DT47), e as sessões continuam: elas apontam para o `userId`, e o `/me` lê o usuário
  a cada requisição (sem `cookieCache`).

### 5. Exclusão com trava de todos os administradores (RN34, DT46)

```
if (id === actor.id) → 409 CANNOT_DELETE_SELF
$transaction:
  SELECT u.id, u."emailVerified", u.email, u.image FROM "user" u
    JOIN role r ON r.id = u."roleId"
   WHERE r.name = 'Administrator' ORDER BY u.id FOR UPDATE OF u
  alvo não está no resultado → 404
  confirmados sem o alvo = 0 → 409 LAST_ADMINISTRATOR
  verification.deleteMany(códigos do e-mail do alvo)
  user.delete(alvo)            // Session e Account em cascata; FKs SetNull
  audit.record(administrator.delete, { name, email })
depois do commit: removeQuietly(alvo.image)
```

Travar **todas** as linhas de administrador, sempre na mesma ordem, serializa exclusões concorrentes sem deadlock. Em
`READ COMMITTED`, a segunda transação espera; quando a primeira faz commit, o `FOR UPDATE` dela relê e já não vê a
linha apagada, então a contagem sai certa. No caso de 1 e 7 se excluindo ao mesmo tempo: a primeira apaga o outro; a
segunda acorda sem a própria linha, conta zero confirmados além do alvo e responde `LAST_ADMINISTRATOR`.

A contagem é de confirmados porque o não confirmado não entra e some em 24 horas (RN48). Com a DT46, quem exclui é
sempre um confirmado com sessão, então na prática só a corrida acima chega ao `409`.

Alternativas: `pg_advisory_xact_lock` com uma chave fixa (funciona, mas cria uma convenção nova só para isso) ou
contar sem trava (abre a janela que a RN34 proíbe).

O administrador excluído com o painel aberto recebe `401` na próxima requisição, porque a sessão saiu em cascata, e o
`queryClient` já faz o logout local.

### 6. Erros

`admin/administrators/administrator.errors.ts` com `EMAIL_ALREADY_REGISTERED`, `CANNOT_DELETE_SELF` e
`LAST_ADMINISTRATOR`, todos `409` com `{ code, message }` (`docs/CONVENCOES.md`). `404` sem `code`, como nas listas.

### 7. Frontend

- `features/admin/administrators/`:
  - `administrators-api.ts`: `list(params)`, `create(values, image)` e `update(id, changes, image?)` via
    `toFormData`, `remove(id)`; mensagens por `code`.
  - `admin-administrators-page.tsx`: `AdminTable` + `useAdminListParams`; colunas ID, imagem (`UserAvatar`), nome com
    o selo "Aguardando confirmação" quando `!emailVerified`, e-mail; ações por linha, sem "Excluir" quando
    `row.id === user.id`. Registrada em `ADMIN_LIST_PAGES['/admin/administradores']`, o que tira o placeholder.
  - `administrator-form-dialog.tsx`: um diálogo para cadastro e edição, com React Hook Form + zod
    (`passwordField` e `passwordsMatch` no cadastro), `ImagePicker` obrigatório no cadastro, `mode: 'onChange'`. A
    edição calcula o diff com os valores iniciais e desabilita "Salvar" sem mudança.
  - `delete-administrator-dialog.tsx`: confirmação com o aviso de ação permanente; mapeia `LAST_ADMINISTRATOR` e
    `CANNOT_DELETE_SELF`.
- Depois de cada escrita, invalida a query da listagem. Se o editado é o próprio usuário, chama `refreshSession()`
  para o menu mostrar o nome e o e-mail novos.
- Toasts no padrão do projeto. O do cadastro fica mais tempo na tela, porque traz o aviso do código e das 24 horas.
- O diálogo não tem `Select` nem etapas; o botão de submit fica fixo com `type="submit"`.

## Risks / Trade-offs

- [Auditoria do cadastro falha depois do `signUpEmail`] → compensação apaga conta, códigos e imagem; o e-mail com o
  código já saiu e fica inútil. Caso raro, aceito (Decisão 3).
- [Troca de e-mail sem confirmação pode prender a conta num e-mail errado] → o próprio administrador ou outro corrige
  pelo painel; a recuperação de senha passa a ir para o novo e-mail. Registrado como DT47.
- [Trava de todas as linhas de administrador] → só a exclusão trava; listagem e edição não esperam. Volume pequeno.
- [Corrida com a tarefa da RN48 apagando o mesmo administrador não confirmado] → a tarefa trava a linha com
  `FOR UPDATE`; a exclusão pelo painel também. Quem chegar depois não acha a linha: a tarefa pula, e o painel
  responde `404`.
- [E-mail com maiúsculas vindo de conta antiga] → todo e-mail gravado pelo better-auth já está em minúsculas; a
  conferência de duplicado compara em minúsculas.

## Migration Plan

Sem migration nem variável nova. Deploy normal no staging; o administrador do seed cadastra os demais pelo painel.
Rollback: reverter o merge (as contas criadas continuam válidas, só sem tela).
