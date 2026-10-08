## 1. Banco e seed (backend)

- [x] 1.1 `schema.prisma`: `User.personalPhone` → `String?` (mantém `@unique`);
      models `AuditLog` (`audit_log`) e `AccessLog` (`access_log`) conforme
      design D5/D6, com índices; relações `auditLogs` e `accessLogs` em `User`.
- [x] 1.2 `npx prisma migrate dev --name papel-administrador` (migration
      aditiva, sem reset) e `prisma generate`.
- [x] 1.3 `src/auth/roles.constants.ts`: `ROLE`, `INSTITUTION_ROLES` e
      `ROLE_NOT_ALLOWED`; trocar as strings soltas de papel em `seed.ts`,
      `establishments.service.ts` e `beneficiary-entities.service.ts`.
- [x] 1.4 `seed.ts`: upsert do papel `Administrator`; passo do primeiro
      administrador (design D4): pula com aviso sem as variáveis, pula se já
      houver administrador, cria via `auth.api.signUpEmail` sem
      `personalPhone`.
- [x] 1.5 `auth.instance.ts`: `personalPhone.required = false`.
- [x] 1.6 `backend/.env.example`: `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL` e
      `SEED_ADMIN_PASSWORD`, com comentário curto (só dev; staging no Coolify).
- [x] 1.7 Rodar `npx prisma db seed` duas vezes: admin criado na primeira,
      nada muda na segunda; sem as variáveis, aviso e seed concluído.

## 2. Papéis e guard (backend)

- [x] 2.1 `RolesService` com cache lazy de `roleId → nome` (design D1).
- [x] 2.2 `RolesGuard` + decorator composto `RequireRoles(...)` (design D2),
      lançando `403` com `code: ROLE_NOT_ALLOWED`.
- [x] 2.3 Decorator `AdminController(path)` (`admin/<path>` +
      `RequireRoles(ROLE.ADMINISTRATOR)` + `ApiTags('Administração')`).
- [x] 2.4 Aplicar `RequireRoles(...INSTITUTION_ROLES)` em `FoodsController`,
      `OrdersController`, `CategoriesController` e nos métodos `/me`
      (GET/PATCH) de `EstablishmentsController` e
      `BeneficiaryEntitiesController`. Cadastro e `GET /me` sem mudança.
- [x] 2.5 Documentar o `403` (`@ApiForbiddenResponse`) nos controllers
      afetados; descrição de `GET /me` no Scalar cita o papel `Administrator`.
- [x] 2.6 Testes unitários do `RolesGuard`: administrador, estabelecimento,
      entidade, sessão sem `roleId`.

## 3. Auditoria (backend)

- [x] 3.1 `audit/` (`@Global()`): `AuditService.record(tx, entry)` exigindo
      `Prisma.TransactionClient`, com `administrator: { name, email }` em
      `details` e remoção recursiva de chaves sensíveis (design D5).
- [x] 3.2 Testes unitários: grava com o `tx` recebido; `details` sem
      `password`/`token` aninhados; nome e e-mail do administrador presentes.

## 4. Registro de acesso (backend)

- [x] 4.1 `access-log/`: `AccessLogService.record()` (trunca `path` e
      `userAgent`, nunca lança para o chamador).
- [x] 4.2 Middleware Express no `main.ts`, registrado antes de todos (design
      D6): exclusões (`OPTIONS`, `/health`, `/docs*`, `/openapi*`,
      `/favicon.png`), gravação no `finish` sem `await`, erro só no `Logger`.
- [x] 4.3 Usuário do registro: `request.user` do `AuthGuard`; login via hook
      `after` do better-auth (ou plano B pelo `Set-Cookie`); logout
      resolvendo a sessão antes do handler.
- [x] 4.4 `app.set('trust proxy', 1)` no `main.ts`.
- [x] 4.5 Testes unitários do middleware: caminho excluído não grava; query
      string removida; falha do service não altera a resposta.

## 5. Tarefas (backend)

- [x] 5.1 `jobs/`: `JobsService` com registro vazio e `run(name)` (design D7).
- [x] 5.2 `AdminJobsController` (`@AdminController('jobs')`):
      `POST /admin/jobs/:name/run` → `404 JOB_NOT_FOUND` para nome
      desconhecido; auditoria `job.run` quando a tarefa existe. Doc no Scalar.
- [x] 5.3 Teste unitário: nome desconhecido → `JOB_NOT_FOUND`, sem
      auditoria; tarefa registrada no teste → resposta com `affected` e
      auditoria gravada.
- [x] 5.4 `npm run lint` e `npm test` em `backend/` passando (sem
      `npm run build` com o `start:dev` ligado).

## 6. Papel e rotas (frontend)

- [x] 6.1 `features/auth`: `Role` + `'administrator'`, `BackendRole` +
      `'Administrator'`, `ROLE_MAP`, `SessionUser.personalPhone: string | null`.
- [x] 6.2 `homePathFor(role)`; `LoginPage` usa a home do papel e só respeita
      o `from` da mesma área.
- [x] 6.3 `RoleRoute` aceita lista de papéis e redireciona para a home do papel
      atual; `HomeRedirect` para `/` e `*`.
- [x] 6.4 `router.tsx`: bloco de instituição dentro de `RoleRoute` com os dois
      papéis de instituição; bloco `/admin` dentro de
      `RoleRoute role="administrator"`; `/admin/*` desconhecido → `/admin`.

## 7. Painel (frontend)

- [x] 7.1 Adicionar o componente `sheet` do shadcn pela CLI.
- [x] 7.2 `features/admin/admin-nav-items.ts`: dois grupos, dez itens, rotas e
      ícones (design D9).
- [x] 7.3 `admin-layout.tsx`: `aside` em `md+`, `Sheet` abaixo de `md`, item
      ativo via `NavLink`, nome do administrador e "Sair" (logout → `/login`).
      `rounded-md` em botões e itens.
- [x] 7.4 `admin-home-page.tsx` (saudação) e `admin-placeholder-page.tsx`
      (título + "Em construção"), rotas geradas a partir dos itens.
- [x] 7.5 Conferir o menu lateral com o frame do painel no protótipo Pencil
      (abrir o app Pencil); registrar no PR qualquer divergência mantida por
      causa da spec.
- [x] 7.6 `npm run lint` e `npx tsc -b` em `frontend/` passando (sem
      `eslint --fix` com o dev server ligado).

## 8. Documentação

- [x] 8.1 `docs/MODELO-DE-DADOS.md`: model `AccessLog` (tabela de visão geral,
      seção própria e mapeamento `RegistroAcesso`).
- [x] 8.2 `docs/REQUISITOS.md`: decisão DT19 (registro de toda requisição em
      `access_log`, com usuário e IP).
- [x] 8.3 `docs/CONVENCOES.md`: rotas `/admin` sempre com `@AdminController`;
      rotas de instituição com `RequireRoles(...INSTITUTION_ROLES)`; código
      `ROLE_NOT_ALLOWED`.
- [x] 8.4 `docs/PENDENCIAS.md`: retenção do `access_log` (LGPD, volume).
- [x] 8.5 `docs/INFRAESTRUTURA.md`: nota de que o seed precisa das variáveis
      do better-auth e das `SEED_ADMIN_*`.

## 9. Verificação e fechamento

- [x] 9.1 No navegador: admin do seed faz login → cai em `/admin`, vê o menu
      com os dez itens, abre cada seção ("Em construção"), testa o menu a
      400 px e sai → `/login`. Console limpo.
- [x] 9.2 No navegador: estabelecimento e entidade fazem login → `/feed`;
      abrir `/admin` e `/admin/categorias` volta para `/feed`. Admin abrindo
      `/feed`, `/pedidos` e `/perfil` volta para `/admin`.
- [x] 9.3 Via API (Scalar ou curl): instituição em `POST /admin/jobs/x/run`
      → `403 ROLE_NOT_ALLOWED`; sem sessão → `401`; admin → `404 JOB_NOT_FOUND`;
      admin em `GET /foods` e `GET /orders` → `403`.
- [x] 9.4 Conferir no banco: `access_log` com login (userId preenchido),
      login recusado (sem userId), `401`, `403`; nada de `/health`/`OPTIONS`;
      nenhuma linha com senha ou query string.
- [x] 9.5 Fluxo do MVP de ponta a ponta continua funcionando (cadastrar
      alimento → pedir → aceitar → confirmar).
- [x] 9.6 Marcar ✅ o item 0.2 em `docs/PLANO-IMPLEMENTACAO.md`.
- [ ] 9.7 Registrar no PR para `develop` os passos manuais: definir
      `SEED_ADMIN_*` no Coolify antes do merge e, depois do deploy, conferir
      que o IP gravado no `access_log` do staging é o IP real do cliente.
