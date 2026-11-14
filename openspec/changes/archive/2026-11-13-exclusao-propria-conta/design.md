## Context

Motivação e escopo em `proposal.md`; comportamento em `specs/estabelecimentos/exclusao-conta` e
`specs/entidades-beneficiarias/exclusao-conta`. O que existe hoje e molda a solução:

- `EstablishmentsController` e `BeneficiaryEntitiesController` têm `GET`/`PATCH /me` com
  `@RequireRoles(...INSTITUTION_ROLES)`; o tipo errado cai no `404` do service ("Nenhum … vinculado"). `GET /:id`
  (perfil público, 4.3) vem depois de `me` no controller.
- `deleted` já existe em `user`, `establishment`, `beneficiary_entity`, `food` e `order`. O hook
  `rejectDeletedUserOnSignIn` recusa o login de `user.deleted = true` com a resposta de credencial inválida (RN32).
  Feed, listagem de instituições e perfil público já filtram instituição excluída (RN35).
- O motivo "Conta encerrada pela instituição" é semeado com `isSystem = true` e tem o nome em
  `SYSTEM_CANCELLATION_REASON.ACCOUNT_CLOSED`. `assertSelectableReason` recusa motivo de sistema: a exclusão não passa
  por ele.
- Toda transição de pedido trava o alimento primeiro (`lockFood`, `SELECT … FOR UPDATE`) e faz o `updateMany`
  condicionado ao status de origem. `returnReservedQuantity` já aplica RN09 + DT32 e ignora alimento excluído (DT27).
  `rejectAllPendingOrders` rejeita os pendentes de um alimento.
- O cadastro de pedido (`OrdersService.create`) lê a entidade fora da transação e trava só o alimento;
  `findAvailableById` já exige estabelecimento não excluído. O cadastro de alimento lê o estabelecimento fora da
  transação.
- O better-auth guarda sessões só na tabela `session` (sem `cookieCache` nem `secondaryStorage`). A rota HTTP
  `/verify-password` está em `disabledPaths`, mas `disabledPaths` só vale no roteador HTTP (`onRequest`), não nas
  chamadas `auth.api.*` feitas pelo servidor.
- No frontend, `queryClient` chama `onUnauthorized` (logout local) em qualquer `401`. `AuthProvider.signOut` chama
  `/sign-out` e depois `reset()`. A pasta `components/ui` tem `Dialog`, sem `AlertDialog`.

## Goals / Non-Goals

**Goals:**

- Uma única implementação dos efeitos da RN28 e da RN29, parametrizada por motivo e `cancelledBy`, que a 5.3 chama
  com o motivo escolhido pelo administrador e `ADMINISTRATOR`.
- Transação única e serializada com aceite, rejeição, cancelamento, recebimento, edição de alimento e cadastro de
  pedido e de alimento, seguindo `docs/CONVENCOES.md`.
- Nenhuma migration.

**Non-Goals:**

- Auditoria: a autoexclusão não é operação de administrador (RN46). A 5.3 grava a dela.
- Reativação de conta e liberação de CNPJ, e-mails e celulares.
- Mexer na imagem do MinIO ou no registro de `account` do better-auth.

## Decisions

### 1. Rotas `/me` nos controllers existentes

- `GET /establishments/me/deletion-impact` e `GET /beneficiary-entities/me/deletion-impact` →
  `{ pendingOrders, inProgressOrders }`.
- `DELETE /establishments/me` e `DELETE /beneficiary-entities/me`, corpo `{ password }`, resposta `204`.

As duas com `@RequireRoles(...INSTITUTION_ROLES)`, como o `GET`/`PATCH /me`: o administrador recebe o `403` do guard,
e o tipo errado o `404` do service. `me/deletion-impact` é declarado antes de `:id` (que usa `ParseIntPipe`), para
"me" não cair no perfil público.

A senha vai no corpo do `DELETE`. Alternativa considerada: `POST /me/deletion`. Ficou o `DELETE` porque é o verbo do
recurso e o `request()` do frontend já serializa `body` em qualquer método; o Traefik do Coolify repassa o corpo.
Query string ficou fora: o `access_log` grava o caminho, e a senha não pode ir para log nem para URL.

DTO `DeleteAccountDto { password: string }` com `@IsString() @IsNotEmpty() @MaxLength(128)`; o `whitelist` +
`forbidNonWhitelisted` do pipe global já recusa campo a mais com `400`.

### 2. Senha conferida com o hasher do better-auth

`AccountDeletionService.verifyPassword(userId, password)`: lê a `account` com `providerId = 'credential'` do usuário e
chama `(await auth.$context).password.verify({ hash: account.password, password })`. Falso, ou conta sem senha,
lança `BadRequestException` com `code: INVALID_PASSWORD`.

Alternativa: `auth.api.verifyPassword({ body: { password }, headers })`. Funciona (a rota HTTP continua desligada),
mas exige repassar os headers da requisição ao service e devolve um `APIError` que teria de ser traduzido. O
`$context.password.verify` usa o mesmo hasher configurado, não depende da requisição e fica fácil de simular no teste.

A verificação roda **antes** da transação: hash de senha é lento e não deve segurar trava de linha.

`400` e não `401`: o `401` dispara o logout global do `queryClient`, e a DT45 diz que a senha errada não derruba a
sessão.

### 3. Módulo `account-deletion` compartilhado

`backend/src/account-deletion/` com `AccountDeletionService`, importado por `EstablishmentsModule` e
`BeneficiaryEntitiesModule`:

- `establishmentImpact(userId)` / `beneficiaryEntityImpact(userId)`: resolve a instituição pelo usuário e faz dois
  `count` por status, com `deleted = false`.
- `closeEstablishment(tx, establishmentId, { cancellationReasonId, cancelledBy })` e
  `closeBeneficiaryEntity(tx, beneficiaryEntityId, { cancellationReasonId, cancelledBy })`: só os efeitos, recebendo
  a transação. A autoexclusão passa o id do motivo `ACCOUNT_CLOSED` e a parte (DT44); a 5.3 passa o motivo escolhido
  e `ADMINISTRATOR`.
- `deleteOwnEstablishment(userId, password)` / `deleteOwnBeneficiaryEntity(userId, password)`: resolve a instituição
  pelo `userId`, confere a senha, abre a transação, chama o `close*`, marca o usuário e apaga as sessões.

Os controllers de `establishments` e `beneficiary-entities` chamam o `AccountDeletionService` direto; os services
de instituição não mudam. As travas ficam em `account-deletion/institution-locks.ts`, usadas também pelo cadastro de
pedido e de alimento. Alternativa: pôr a lógica em cada service de instituição. Foi descartada porque a 5.3
precisaria importar os dois services no módulo do admin, e os efeitos sobre pedido ficariam longe de `orders`/`foods`.

### 4. Ordem das travas e dos efeitos

Ordem de trava única para tudo que mexe nisso: **instituição → alimentos (por id crescente) → pedidos**. Os fluxos de
pedido existentes já travam alimento antes de pedido e nunca dois alimentos, então não há ciclo.

**Estabelecimento (RN28)**, dentro da transação:

1. `SELECT id, deleted FROM establishment WHERE id = $1 FOR UPDATE`. Se `deleted`, retorna sem fazer nada (segunda
   exclusão concorrente: `204` idempotente).
2. `SELECT id FROM food WHERE "establishmentId" = $1 AND deleted = false ORDER BY id FOR UPDATE`. Com todos os
   alimentos travados, nenhum aceite, cancelamento, recebimento, edição ou cadastro de pedido roda no meio.
3. `order.updateMany` `Pendente` → `Rejeitado` (`establishmentId`, `deleted = false`).
4. `order.updateMany` `Em andamento` → `Cancelado`, com `cancellationReasonId` e `cancelledBy`. Sem
   `returnReservedQuantity`: o alimento é excluído no passo seguinte (DT27).
5. `food.updateMany({ establishmentId, deleted: false }, { deleted: true })`.
6. `establishment.update({ deleted: true })`.

**Entidade (RN29)**, dentro da transação:

1. `SELECT id, deleted FROM beneficiary_entity WHERE id = $1 FOR UPDATE`. Se `deleted`, retorna (idempotente).
2. Lê os `foodId` distintos dos pedidos `Pendente` e `Em andamento` da entidade e trava esses alimentos por id
   crescente. Nenhum pedido em aberto novo aparece depois dessa leitura, porque o cadastro de pedido passa a travar a
   entidade (decisão 5).
3. Relê, já com as travas, os pedidos em aberto da entidade (aceite ou cancelamento podem ter mudado algum enquanto
   esperava).
4. `order.updateMany` `Pendente` → `Cancelado`, com motivo e `cancelledBy`.
5. Para cada pedido `Em andamento`: `updateMany` condicionado ao status → `Cancelado`, depois
   `returnReservedQuantity(tx, foodId, quantity)`, um por um, para a DT32 recalcular os pedidos totais a cada
   devolução.
6. `order.updateMany` `deleted = true` para os pedidos da entidade que **não** são (`Doado` ou `Cancelado`) com
   estabelecimento não excluído: `NOT: { statusId: { in: [doado, cancelado] }, establishment: { deleted: false } }`.
   Roda depois dos cancelamentos, então os recém-cancelados de estabelecimentos ativos ficam visíveis.
7. `beneficiaryEntity.update({ deleted: true })`.

**Os dois**, ainda na transação: `user.update({ deleted: true })` e `session.deleteMany({ where: { userId } })`. Sem
`cookieCache`, apagar a linha basta para o próximo `getSession` falhar em todas as abas e dispositivos.

O id do motivo de sistema é lido pelo nome (`SYSTEM_CANCELLATION_REASON.ACCOUNT_CLOSED`) com `findUniqueOrThrow` e
`isSystem = true`: seed faltando vira `500`, não pedido sem motivo.

### 5. Cadastros conferem a instituição com trava

- `OrdersService.create`: dentro da transação, **antes** do `lockFood`,
  `SELECT id FROM beneficiary_entity WHERE id = $1 AND deleted = false FOR SHARE`; sem linha → `404 Beneficiary
entity not found.`. O `FOR SHARE` conflita com o `FOR UPDATE` da exclusão e não bloqueia dois pedidos da mesma
  entidade entre si.
- Cadastro de alimento (`FoodsService.create`): o mesmo com `establishment … FOR SHARE` dentro da transação.

Com isso a exclusão da entidade não perde pedido criado em outra aba, e a do estabelecimento não deixa alimento vivo.
O pedido em alimento de estabelecimento sendo excluído já é coberto pela trava do alimento + `findAvailableById`.

### 6. Frontend

- `profile-api.ts`: `getDeletionImpact(role)` e `deleteMyAccount(role, password)`, com o prefixo por papel que o
  arquivo já usa (`/establishments/me` ou `/beneficiary-entities/me`).
- `DangerZone` no fim da `ProfilePage` (no modo de visualização e no de edição), com `Card` de borda
  `destructive` e o botão "Excluir conta".
- `DeleteAccountDialog` (shadcn `Dialog`): `useQuery` do impacto ao abrir (`enabled: open`, sem cache entre
  aberturas); texto do impacto por papel; form com RHF + zod (`confirmation` literal `"EXCLUIR"`, `password` não
  vazio), `mode: 'onChange'` (memória do projeto sobre validação por tecla), botão de confirmar `variant="destructive"`
  desabilitado até o form ser válido e durante o envio. O diálogo não fecha durante o envio.
- Erro `INVALID_PASSWORD` → `form.setError('password', { message: 'Senha incorreta.' })`. Outros erros → toast
  genérico, diálogo aberto.
- Sucesso → `AuthProvider.endSession()` (novo: `queryClient.clear()` + `reset()`, sem chamar `/sign-out`, porque a
  sessão já não existe no servidor), `navigate('/login', { replace: true })` e `toast.success('Sua conta foi
excluída.')`.

Alternativa para o fim: chamar o `signOut` existente. Ele faria uma requisição sem sessão e dependeria do `finally`
para limpar o estado; o `endSession` deixa explícito que o servidor já encerrou tudo.

## Risks / Trade-offs

- [Senha certa, mas a transação falha depois] → nada é gravado; a tela mostra erro genérico e a conta segue ativa.
  Tentar de novo é seguro.
- [Força bruta da senha pela rota de exclusão] → a rota exige sessão válida e está no limite global de 100
  requisições por minuto (DT20). Quem tem a sessão já age como a instituição; a senha protege contra a sessão
  esquecida aberta, não contra ataque dirigido. Aceito para o TCC.
- [Estabelecimento com muitos alimentos trava muitas linhas] → o volume por estabelecimento é de dezenas; a trava
  dura uma transação curta. Aceito.
- [Pedido de outra entidade, `Pendente` do tipo total, muda de quantidade sem aviso] → é a DT32, a mesma do
  cancelamento comum; o detalhe já mostra "Quantidade atualizada…".
- [Link para o perfil público da outra parte no detalhe do pedido leva a "Instituição não encontrada"] → já é o
  comportamento da 4.3 para perfil indisponível. Fica como está (proposal, "Fora desta change").
- [CNPJ, e-mails e celulares continuam presos à conta excluída (RN26 vale para todas)] → o diálogo avisa. Liberar
  exigiria regra nova.
- [O `FOR SHARE` novo no cadastro de pedido e de alimento muda um fluxo que já funciona] → só acrescenta uma leitura
  travada da própria instituição; os testes de concorrência da 3.1 continuam valendo e entram na verificação.

## Migration Plan

Sem migration e sem variável nova. Deploy normal pelo Coolify. O motivo "Conta encerrada pela instituição" já está
no seed desde a 1.2; no staging, conferir que ele existe antes de testar. Rollback: reverter o merge; contas excluídas
no meio do caminho continuam excluídas (só dá para reverter à mão no banco).
