## Context

- O papel do usuário é a FK `User.roleId` → `Role.name` (`Establishment`,
  `BeneficiaryEntity`). Não usamos o plugin `admin` do better-auth, então o
  `@Roles()` de `@thallesp/nestjs-better-auth` (que lê `user.role` como
  string) não serve.
- O `AuthGuard` do pacote é global (`APP_GUARD`), valida a sessão e preenche
  `request.session` / `request.user`. Rotas públicas usam `@AllowAnonymous()`.
- O handler do better-auth (`/auth/*`) é montado pelo `configure()` do
  `AuthModule` do pacote, como middleware de módulo do Nest. Middleware
  registrado com `app.use()` no `main.ts` entra antes dele na pilha do
  Express.
- Os services de instituição descobrem o papel procurando
  `establishment`/`beneficiaryEntity` pelo `userId` e devolvem `404` quando
  não acham. O feed (`GET /foods`, `GET /foods/:id`) e `GET /categories` só
  exigem sessão.
- O backend não tem nenhum log hoje.
- `better-auth` declara `personalPhone` como `additionalField` obrigatório.
- O seed usa strings soltas para os papéis.
- No frontend, `Role` é `'establishment' | 'beneficiary'`, `RoleRoute`
  redireciona para `/feed` quando o papel não bate, e `/` e `*` vão sempre
  para `/feed`. Não há componente `sheet`/`sidebar` do shadcn instalado.

## Goals / Non-Goals

**Goals:**

- Um único ponto que decide papel por rota, no backend e no frontend, que as
  changes 1.x e 5.x só precisam reaproveitar.
- Contrato de auditoria pronto para a 1.3 usar sem mudanças.
- Registro de acesso que não interfere em nenhuma resposta.

**Non-Goals:**

- Cache distribuído, fila ou batch para o `access_log` (uma instância, volume
  de TCC).
- Política de retenção/limpeza do `access_log` (pergunta em aberto, ver
  proposta).
- Qualquer tela de consulta de auditoria ou de acessos.

## Decisions

### D1. Constante `ROLE` e cache do mapa `roleId → nome`

`backend/src/auth/roles.constants.ts` exporta
`ROLE = { ESTABLISHMENT: 'Establishment', BENEFICIARY_ENTITY: 'BeneficiaryEntity', ADMINISTRATOR: 'Administrator' }`
e `INSTITUTION_ROLES`. O seed e os services de cadastro passam a usar a
constante. Um `RolesService` carrega a tabela `role` uma vez (lazy) e
resolve `roleId → nome` em memória: os papéis só mudam por seed, então não
há motivo para uma consulta por requisição.

*Alternativa:* incluir `role` na sessão do better-auth (`additionalFields`
como string). Rejeitada: duplicaria o dado do `roleId` e exigiria migrar o
cadastro.

### D2. `@RequireRoles(...)` como decorator composto, com guard no controller

`RequireRoles(...roles)` = `applyDecorators(SetMetadata(ROLES_KEY, roles), UseGuards(RolesGuard))`.
Guard de controller roda **depois** dos guards globais, então
`request.user` já foi preenchido pelo `AuthGuard` do pacote. O
`RolesGuard` lê `request.user.roleId`, resolve o nome (D1) e, se não estiver
na lista, lança `ForbiddenException({ code: 'ROLE_NOT_ALLOWED', message })`.
O código fica numa constante junto de `ROLE`.

Para `/admin`, um segundo decorator composto
`AdminController(path)` = `Controller(\`admin/${path}\`)` +
`RequireRoles(ROLE.ADMINISTRATOR)` + `ApiTags('Administração')`. Toda rota
administrativa usa esse decorator; assim não existe controller `/admin` sem
a trava. Um teste unitário do guard cobre os três papéis e a ausência de
`roleId`.

Rotas de instituição: `@RequireRoles(...INSTITUTION_ROLES)` na classe de
`FoodsController`, `OrdersController` e `CategoriesController`, e nos
métodos `/me` (GET e PATCH) de `EstablishmentsController` e
`BeneficiaryEntitiesController`. O `POST` de cadastro continua
`@AllowAnonymous()`. `GET /me` (sessão) não ganha restrição. Os `404`
existentes entre os dois tipos de instituição não mudam.

*Alternativa:* guard global (`APP_GUARD`) que aplica a regra pelo prefixo
`/admin`. Rejeitada: a ordem entre dois `APP_GUARD` de módulos diferentes
depende da ordem de importação, e o guard poderia rodar antes de
`request.user` existir.

### D3. `User.personalPhone` opcional

Schema: `String?` mantendo `@unique` (o Postgres aceita vários `NULL`).
`auth.instance.ts`: `personalPhone.required = false`. Os DTOs de cadastro e
edição das instituições continuam com `@IsNotEmpty`, então nada muda para
elas. No frontend, `SessionUser.personalPhone` vira `string | null`; as
telas de perfil leem o telefone de `/establishments/me` e
`/beneficiary-entities/me`, não da sessão.

### D4. Primeiro administrador no seed

Depois dos papéis, o seed:

1. lê `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`; se faltar
   alguma, `console.warn` e segue;
2. conta usuários com papel `Administrator`; se houver algum, segue;
3. chama `auth.api.signUpEmail({ body: { name, email, password, roleId } })`
   importando a instância de `src/auth/auth.instance.ts` — o mesmo caminho do
   cadastro de instituições, que já funciona apesar de `/sign-up/email`
   estar em `disabledPaths` (a trava vale só para a rota HTTP).

Se o e-mail já estiver em uso por uma instituição, o `signUpEmail` falha e o
seed termina com erro e mensagem clara: é configuração errada e precisa
aparecer no deploy.

*Consequência:* o seed passa a carregar a instância do better-auth, então
precisa de `JWT_SECRET` e `BETTER_AUTH_URL` no ambiente onde roda (já
existem em dev e no staging).

### D5. `AuditLog` e `AuditService`

Model conforme `docs/MODELO-DE-DADOS.md` (`administratorId Int?`,
`onDelete: SetNull`, `action`, `entityType`, `entityId`, `details Json?`,
`createdAt`), com `@@index([entityType, entityId])` e
`@@index([createdAt])`.

`AuditService.record(tx, { administrator: { id, name, email }, action, entityType, entityId, details? })`
recebe **obrigatoriamente** o `Prisma.TransactionClient`: não existe
assinatura sem transação, então não dá para gravar auditoria fora da escrita.
Antes de gravar, o service:

- acrescenta `administrator: { name, email }` em `details` (sobrevive à
  exclusão do administrador, spec `auditoria/acoes-administrador`);
- remove recursivamente chaves cujo nome casa com
  `/password|token|secret|otp|api_?key/i` (spec "não guarda segredos").

O `AuditModule` é `@Global()` para as changes de painel só injetarem o
service.

### D6. `AccessLog` (decisão nova, DT19)

Model `AccessLog` → `access_log`:

| Campo | Tipo |
| ----- | ---- |
| `id` | `Int @id @default(autoincrement())` |
| `userId` | `Int?`, FK `User`, `onDelete: SetNull` |
| `method` | `String @db.VarChar(10)` |
| `path` | `String @db.VarChar(500)` (sem query string, truncado) |
| `statusCode` | `Int` |
| `durationMs` | `Int` |
| `ipAddress` | `String? @db.VarChar(45)` |
| `userAgent` | `String? @db.VarChar(500)` (truncado) |
| `createdAt` | `DateTime @default(now())` |

Índices: `@@index([createdAt])`, `@@index([userId])`.

Captura: middleware Express registrado com `app.use()` no `main.ts`, antes
de qualquer outro, para enxergar também as rotas `/auth/*` do better-auth.
Ele marca o início, e em `res.on('finish')` monta o registro e chama
`AccessLogService.record()` **sem `await`**, com `.catch()` que só faz
`Logger.error`. Exclusões: `OPTIONS`, `/health`, `/docs*`, `/openapi*` e
arquivos estáticos (`/favicon.png`).

Usuário do registro, nesta ordem:

1. `request.user.id`, preenchido pelo `AuthGuard` em toda rota do Nest que
   passou pelo guard (inclusive as que terminaram em `401`/`403`/`4xx`);
2. **login** (`POST /auth/sign-in/email` com status `200`): um hook `after`
   do better-auth lê `ctx.context.newSession.user.id` e o grava num campo do
   objeto de resposta (`res.locals`) — o hook roda no mesmo ciclo, antes do
   `finish`. Se o acesso ao `res` pelo contexto do hook não for viável, a
   alternativa é procurar a sessão pelo token do `Set-Cookie` da resposta;
3. **logout** (`POST /auth/sign-out`): o middleware resolve a sessão do
   cookie da requisição **antes** de passar adiante (a sessão é apagada pelo
   logout), só para esse caminho;
4. caso contrário, `null` (rotas anônimas e rotas inexistentes).

IP: `app.set('trust proxy', 1)` no `main.ts`, para o Express usar o
`X-Forwarded-For` posto pelo Traefik do Coolify (um salto) e `req.ip` ser o
IP do cliente. Confiar só em um salto impede que o cliente forje o IP pelo
cabeçalho. Em dev, sem proxy, `req.ip` é o do socket.

Além da tabela, nada vai para stdout por requisição: o `Logger` do Nest fica
para erros (RNF15), para não duplicar o volume.

*Alternativas:* interceptor do Nest (não vê `/auth/*`, que não passa pelo
router); log só em stdout (descartado pela decisão da dupla de ter tabela);
`await` na gravação (atrasaria toda resposta e uma falha do banco derrubaria
requisições que nem usam o banco).

### D7. Rota de tarefas

Módulo `jobs/` com `JobsService`, que guarda um registro
`Map<string, () => Promise<{ affected: number }>>` — vazio nesta change; a
6.1 registra a expiração e liga o `@nestjs/schedule`. O controller
`AdminJobsController` (`@AdminController('jobs')`) expõe
`POST /admin/jobs/:name/run`:

- nome não registrado → `NotFoundException({ code: 'JOB_NOT_FOUND', ... })`;
- nome registrado → executa, depois grava auditoria `job.run`
  (`entityType: 'Job'`, `entityId: name`, `details: { affected }`) numa
  transação própria, e responde `{ name, affected }`.

A tarefa faz as próprias transações (várias, por lote), então a auditoria da
execução não cabe "na mesma transação". É a única exceção ao D5, e só se
aplica a esta rota.

### D8. Frontend: papel, entrada por papel e rotas

- `Role` ganha `'administrator'`; `ROLE_MAP` ganha
  `Administrator: 'administrator'`; `BackendRole` idem.
- `homePathFor(role)` em `features/auth/`: administrador → `/admin`, demais
  → `/feed`. Usado por: `LoginPage` (destino após login; o `from` só é
  respeitado se pertencer à área do papel), `RoleRoute` (redireciona para a
  home do papel atual em vez de `/feed` fixo) e um `HomeRedirect` para `/` e
  `*`.
- Router: o bloco de instituição (`AppShell` + feed, alimentos, pedidos,
  perfil) fica dentro de `RoleRoute` com os papéis de instituição
  (`RoleRoute` passa a aceitar uma lista). O bloco `/admin` fica dentro de
  `RoleRoute role="administrator"` com `AdminLayout`.

### D9. Frontend: layout do painel

`features/admin/`:

- `admin-layout.tsx`: em `md+`, `aside` fixo à esquerda com logo
  "Food Share", menu e rodapé com nome do administrador + "Sair"; conteúdo à
  direita com `<Outlet />`. Abaixo de `md`, barra superior com botão que abre
  o mesmo menu num `Sheet` (componente `sheet` do shadcn, adicionado pela
  CLI).
- `admin-nav-items.ts`: os dois grupos e dez itens da spec, com rota
  pt-BR e ícone `lucide-react`:
  `/admin/administradores`, `/admin/instituicoes`, `/admin/alimentos`,
  `/admin/pedidos`, `/admin/sugestoes`, `/admin/categorias`,
  `/admin/catalogo`, `/admin/unidades`, `/admin/motivos`,
  `/admin/termos-proibidos`.
- `admin-home-page.tsx` (saudação) e `admin-placeholder-page.tsx` (título +
  "Em construção"), um `Route` por item gerado do array.
- Item ativo via `NavLink`. Botões e itens com `rounded-md`, nunca
  `rounded-full` (preferência registrada da dupla).
- Antes de fechar o visual, conferir o menu lateral no frame do painel no
  protótipo Pencil; divergência de itens com a spec segue a spec.

## Risks / Trade-offs

- **[`access_log` cresce rápido e guarda IP (dado pessoal)]** → índice por
  `createdAt` deixa uma limpeza futura barata; a política de retenção entra
  em `docs/PENDENCIAS.md` para a dupla decidir.
- **[Uma escrita no banco por requisição]** → gravação sem `await`, fora da
  transação da requisição; no volume do TCC é desprezível. Se pesar, trocar
  por buffer em memória com `createMany` periódico, sem mudar a spec.
- **[`trust proxy` errado no staging]** (ex.: Cloudflare na frente do
  Traefik, dois saltos) → o IP gravado seria o do proxy. Tarefa de
  verificação no staging compara o IP gravado com o IP real; se divergir,
  ajusta o número de saltos.
- **[Hook `after` do better-auth sem acesso ao `res` do Express]** → plano B
  já descrito em D6 (sessão pelo `Set-Cookie`). A spec não muda.
- **[Esquecer `@AdminController` num controller novo]** → convenção
  registrada em `docs/CONVENCOES.md` nesta change; revisão das changes 1.3 e
  5.x confere.
- **[Admin perde o feed]** → intencional (`docs/CONVENCOES.md`): o painel
  terá a própria listagem de alimentos (5.4).

## Migration Plan

1. Migration única e aditiva (`personalPhone` nulo, `audit_log`,
   `access_log`). Sem reset: `prisma migrate dev` local e `migrate deploy` no
   staging pelo pré-deploy.
2. Antes do merge em `develop`, definir `SEED_ADMIN_NAME`,
   `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` no Coolify (staging). O seed
   pós-deploy cria o administrador.
3. Rollback: reverter o merge. A migration é aditiva; a coluna nula e as
   tabelas novas não quebram o código anterior.

## Open Questions

- Retenção do `access_log` (ver proposta). Não muda specs nem tarefas desta
  change.
