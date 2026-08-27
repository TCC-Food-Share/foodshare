## Context

O `proposal.md` original previa o endpoint de logout "no módulo `auth/`" (que hoje só contém a instância do better-auth e o wiring do `BetterAuthModule.forRoot()`, sem controller próprio). Entre a proposta e a implementação, o RF07 já tinha assentado `GET /me` em `AppController` como o padrão pra endpoint fino que só delega pra `auth.api.*` — decisão tomada aqui: seguir esse precedente em vez de criar um `AuthController` novo só pra um método.

## Goals / Non-Goals

**Goals:**
- Endpoint de logout exige sessão válida (sem `@AllowAnonymous()`, guard global se aplica) e delega inteiramente pro better-auth — sem lógica própria de expiração/blacklist.

**Non-Goals:**
- (revisado — ver Decisions abaixo: a rota nativa acabou desabilitada também, não ficou de fora do escopo como este texto dizia originalmente)

## Decisions

**`POST /logout` em `AppController`, usando `AuthService` (de `@thallesp/nestjs-better-auth`) + `fromNodeHeaders` (de `better-auth/node`) — não o token `BETTER_AUTH` usado em `establishments`/`beneficiary-entities`.**
```ts
@Post('logout')
@HttpCode(200)
async logout(@Req() request: Request) {
  await this.authService.api.signOut({ headers: fromNodeHeaders(request.headers) });
  return { success: true };
}
```
`BETTER_AUTH` foi criado especificamente pra módulos de feature conseguirem mockar o better-auth sem puxar `BetterAuthModule.forRoot()` (guard + rotas HTTP) pros testes isolados deles. `AppController` já vive dentro do módulo que registra `BetterAuthModule.forRoot()` de qualquer forma — não tem isolamento a proteger, então usar o `AuthService` que a própria lib expõe (documentado pra exatamente esse uso) é mais direto que reintroduzir o token.

`@HttpCode(200)`: o default do Nest pra `@Post()` é 201 (Created) — semanticamente errado pra logout, nada é criado. Achado e corrigido durante o teste manual.

**`/sign-out` adicionado a `disabledPaths` em `auth.instance.ts`, junto do `/sign-up/email` já desabilitado no RF08.** Erro cometido na primeira versão deste documento: a rota nativa `POST /auth/sign-out` continuou documentada no Scalar junto de `POST /logout` — as duas com summary "Logout", a mesma duplicidade que já tinha sido evitada no cadastro (RF01/03). Só percebido depois de perguntado — corrigido: `disabledPaths` some com a rota HTTP crua (confirmado via curl, 404) sem quebrar `AppController.logout()`, que chama `authService.api.signOut()` programaticamente (não passa pelo router HTTP, `disabledPaths` só filtra requests reais — mesmo mecanismo já usado no `sign-up/email`).

## Risks / Trade-offs

- Nenhum trade-off aceito nessa versão — a duplicidade de rota (ver Decisions) foi corrigida, não mantida como risco aceitável.
