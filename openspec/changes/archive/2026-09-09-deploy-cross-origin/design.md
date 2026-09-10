## Context

Ver `proposal.md` ("Why"). Estado após o F0:

- `main.ts`: `NestFactory.create(AppModule, { bodyParser: false })` → `app.useStaticAssets(...)` → `app.use(express.json())` → `ValidationPipe` global → Swagger/Scalar → `app.listen(PORT ?? 3000)`. **Nenhum `app.enableCors()`.**
- `auth.instance.ts` (F0): `betterAuth({ secret, baseURL: BETTER_AUTH_URL, basePath: '/auth', trustedOrigins, ... })`. `trustedOrigins` já é `(process.env.TRUSTED_ORIGINS ?? 'http://localhost:5173').split(',').map(trim).filter(Boolean)`.
- better-auth `^1.6.28`. Fonte confirmada (`node_modules/better-auth/dist/cookies/index.mjs`): o cookie de sessão nasce com `sameSite: 'lax'`, `httpOnly`, `path: '/'`, `secure` = `true` quando `baseURL` começa com `https://`. `advanced.crossSubDomainCookies.enabled` + `.domain` só adicionam o atributo `Domain` ao cookie. `advanced.defaultCookieAttributes` sobrescreve os atributos default.
- `@thallesp/nestjs-better-auth` monta o handler do better-auth como middleware global do Express, interceptando `/auth/*` (ver `docs/CONVENCOES.md`).
- `frontend/src/lib/api.ts`: `const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'`; `fetch(BASE_URL + path, { credentials: 'include', ... })`.

Modelo de origens do staging:
- Front: `https://app.staging.foodshare.com.br` · API: `https://api.staging.foodshare.com.br`.
- Domínio registrável: `foodshare.com.br` (`.com.br` é public suffix). Os dois subdomínios são **same-site**, origens diferentes.

## Goals / Non-Goals

**Goals:**
- Front em `app.staging` autentica contra a API em `api.staging` (login, sessão, logout) com o mesmo código do F0.
- Dev (mesma origem via proxy) **não muda** — sem `secure`, sem `Domain`, `SameSite=Lax`.
- Config por env, sem hardcode de domínio.

**Non-Goals:**
- Valores de prod (sem `staging.`) — mesma receita depois.
- Tocar no Coolify/Cloudflare (manual, feito pela Maria).
- Mudar o contrato de qualquer endpoint ou o fluxo de login/logout.
- `partitioned`/CHIPS (só fallback documentado).

## Decisions

**CORS via `app.enableCors`, reusando `TRUSTED_ORIGINS`, sempre ligado.**
`main.ts`, logo após `NestFactory.create` (antes de `express.json()` e do resto):
```ts
app.enableCors({
  origin: trustedOrigins, // exportado de auth.instance.ts
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
});
```
- **Reusar `TRUSTED_ORIGINS`**: é exatamente a mesma lista (as origens do frontend). Uma var a menos. `auth.instance.ts` passa a `export`ar `trustedOrigins`.
- **`origin` como array de strings** (não função, não `true`): CORS restrito à lista; origem desconhecida → sem cabeçalho `Access-Control-Allow-Origin` → browser bloqueia. `credentials: true` exige origem explícita (nunca `*`).
- **Sempre ligado**: em dev, o proxy do Vite faz o browser ver tudo como mesma origem → nenhum preflight → `enableCors` é inócuo. Não vale a pena condicionar.
- **Posição**: `enableCors` cedo, antes do middleware do better-auth, para o preflight `OPTIONS` de `/auth/*` também receber os cabeçalhos. Risco de ordem registrado abaixo — a verificação do apply confirma com `OPTIONS` real contra `/auth/sign-in/email` e `/orders`.

**Cookie cross-subdomínio: condicional em `COOKIE_DOMAIN`.**
`auth.instance.ts`:
```ts
const cookieDomain = process.env.COOKIE_DOMAIN?.trim() || undefined;

betterAuth({
  ...,
  trustedOrigins,
  ...(cookieDomain
    ? { advanced: { crossSubDomainCookies: { enabled: true, domain: cookieDomain } } }
    : {}),
});
```
- **Sem `COOKIE_DOMAIN`** (dev): `advanced` fica ausente → cookie `host-only`, `SameSite=Lax`, `secure=false` (baseURL `http://`). Igual ao F0.
- **Com `COOKIE_DOMAIN=.staging.foodshare.com.br`**: cookie ganha `Domain=.staging.foodshare.com.br` → enviado para `app.` e `api.`. `secure` liga sozinho porque `BETTER_AUTH_URL` será `https://`.
- **`SameSite` fica `Lax`** (default). `app.staging.foodshare.com.br` → `api.staging.foodshare.com.br` é **same-site** (mesmo domínio registrável), então um `fetch` credenciado carrega o cookie `Lax`. Mantém a proteção CSRF do `Lax`; o `originCheck` (`trustedOrigins`) protege as rotas POST de qualquer forma. Se algum browser não enviar o cookie no XHR same-site cross-subdomínio (verificação do apply pega), o fallback é `advanced.defaultCookieAttributes = { sameSite: 'none', secure: true }` — registrado em Riscos.
- **`baseURL` string** já satisfaz o `crossSubDomainCookies` (a fonte exige `domain` OU baseURL dinâmico; passamos `domain` explícito).

**Frontend: só `.env`.**
`api.ts` já resolve `VITE_API_URL ?? '/api'`. Staging: `VITE_API_URL=https://api.staging.foodshare.com.br`. `.env.example` do front ganha as duas variantes comentadas. Sem código.

**Docs.**
`docs/PLANO-FRONTEND.md` seção "Deploy": remover a linha "falta implementar" da change X, deixar a receita final (vars por ambiente). `docs/INFRAESTRUTURA.md`: uma subseção "Frontend ↔ API (origens)" com o modelo de subdomínios e as três vars do backend (`BETTER_AUTH_URL`, `TRUSTED_ORIGINS`, `COOKIE_DOMAIN`) + a do front.

## Risks / Trade-offs

- [`enableCors` vs middleware global do better-auth: ordem] → `enableCors` é aplicado no bootstrap antes de `app.listen`; o handler do better-auth é `app.use` do módulo. Se o preflight de `/auth/*` não pegar CORS, mover o `enableCors` para o topo absoluto do `bootstrap()` ou adicionar `cors()` (pacote `cors`) manualmente antes do `express.json()`. A verificação do apply testa `OPTIONS` em `/auth/sign-in/email` explicitamente.
- [`SameSite=Lax` em XHR same-site cross-subdomínio] → deve funcionar (mesmo site registrável), mantém CSRF. Fallback documentado: `defaultCookieAttributes: { sameSite: 'none', secure: true }` (aí o `originCheck` do better-auth vira a única barreira CSRF nas rotas POST — aceitável, é o que o `trustedOrigins` existe para cobrir).
- [`secure: true` exige HTTPS no staging] → o cookie não será setado em HTTP puro. O staging já é HTTPS (Cloudflare + Coolify). Registrado no `proposal.md`/docs como pré-condição.
- [CORS sempre ligado inclui dev] → inócuo (proxy = mesma origem, sem preflight); custo zero, evita um `if`.
- [`origin` restrito à lista quebra se o Coolify adicionar um domínio interno de health-check] → health-check normalmente é server-to-server (sem header `Origin`), CORS não se aplica; se aparecer, adicionar à `TRUSTED_ORIGINS`.
