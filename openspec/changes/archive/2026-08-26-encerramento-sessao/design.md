## Context

O `proposal.md` original previa o endpoint de logout "no módulo `auth/`" (que hoje só contém a instância do better-auth e o wiring do `BetterAuthModule.forRoot()`, sem controller próprio). Entre a proposta e a implementação, o RF07 já tinha assentado `GET /me` em `AppController` como o padrão pra endpoint fino que só delega pra `auth.api.*` — decisão tomada aqui: seguir esse precedente em vez de criar um `AuthController` novo só pra um método.

## Goals / Non-Goals

**Goals:**
- Endpoint de logout exige sessão válida (sem `@AllowAnonymous()`, guard global se aplica) e delega inteiramente pro better-auth — sem lógica própria de expiração/blacklist.

**Non-Goals:**
- Desabilitar a rota nativa `POST /auth/sign-out` do better-auth. Ao contrário do `sign-up/email` (RF01/03, onde a rota nativa deixava o cadastro incompleto — só criava `User`+`Account`, sem `Address`/`Establishment`), aqui a rota nativa já faz exatamente a mesma coisa que o wrapper faria (não tem estado adicional pra sincronizar), então não é um caso de "duas rotas fazendo coisas diferentes e incompletas". Mesmo assim, `POST /logout` (`AppController`) é o único documentado no Scalar — mantém o padrão de uma rota oficial por ação, mesmo a nativa continuando tecnicamente acessível.

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

## Risks / Trade-offs

- [Rota nativa `/auth/sign-out` continua acessível em paralelo à oficial `/logout`] → aceito: ver Non-Goals acima — não há risco de estado divergente, é a mesma operação nos dois casos.
