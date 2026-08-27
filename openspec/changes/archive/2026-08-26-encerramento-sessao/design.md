## Decisão final

**Sem wrapper. `POST /auth/sign-out` (rota nativa do better-auth) é a rota oficial de logout.** RF09 acabou não exigindo código de produção nenhum — só testes/verificação confirmando que o comportamento nativo já satisfaz o requisito, e correção de documentação (tag/summary/description em pt-BR no Scalar, ver `main.ts`).

Duas versões anteriores deste documento (abaixo, como histórico) chegaram a empacotar a rota num `AppController.logout()`. Revertido depois de pergunta direta ("faz sentido não reaproveitar as rotas do better-auth?") expor que o wrapper não tinha motivo funcional — ver `docs/CONVENCOES.md`, seção "Quando empacotar uma rota do better-auth", registrada como consequência direta dessa reversão.

## Context (histórico — decisão superada)

O `proposal.md` original previa o endpoint de logout "no módulo `auth/`" (que hoje só contém a instância do better-auth e o wiring do `BetterAuthModule.forRoot()`, sem controller próprio). Entre a proposta e a implementação, o RF07 já tinha assentado `GET /me` em `AppController` como o padrão pra endpoint fino que só delega pra `auth.api.*` — decisão tomada aqui (na época): seguir esse precedente em vez de criar um `AuthController` novo só pra um método.

## Goals / Non-Goals (histórico)

**Goals:**
- Endpoint de logout exige sessão válida (sem `@AllowAnonymous()`, guard global se aplica) e delega inteiramente pro better-auth — sem lógica própria de expiração/blacklist.

## Decisions (histórico — implementação revertida)

**`POST /logout` em `AppController`, usando `AuthService` (de `@thallesp/nestjs-better-auth`) + `fromNodeHeaders` (de `better-auth/node`).**
```ts
@Post('logout')
@HttpCode(200)
async logout(@Req() request: Request) {
  await this.authService.api.signOut({ headers: fromNodeHeaders(request.headers) });
  return { success: true };
}
```

Dois problemas achados nessa versão, nenhum motivo funcional pra manter:

1. **Duplicidade de rota documentada.** `POST /auth/sign-out` nativo continuou aparecendo no Scalar junto de `POST /logout`, as duas com summary "Logout" — mesma duplicidade já evitada no cadastro (RF01/03). Corrigido numa primeira rodada desabilitando `/sign-out` via `disabledPaths` (sem quebrar o wrapper, que chama `authService.api.signOut()` programaticamente — `disabledPaths` só filtra request HTTP real).
2. **O wrapper pulava proteção que a rota nativa já tem de graça.** Chamada programática (`auth.api.signOut()`) não passa pelo `originCheckMiddleware` que a rota HTTP nativa aplica (checagem de `Origin`, proteção CSRF) — confirmado testando: `curl` sem header `Origin` pra rota nativa devolve 403 (`MISSING_OR_NULL_ORIGIN`), corretamente; o wrapper aceitava a mesma chamada sem essa checagem.

Nenhum dos dois problemas existiria se a rota nativa tivesse sido usada direto desde o início — motivo real do revert, não só as correções pontuais.

`@HttpCode(200)`: detalhe também achado nessa versão — default do Nest pra `@Post()` é 201 (Created), semanticamente errado pra logout. Deixa de ser relevante com a rota nativa (better-auth já define seus próprios status codes, sem esse problema).
