## Why

O F0 montou o frontend assumindo **mesma origem** (proxy do Vite em dev; reverse proxy path-based em prod). O staging de `develop`, porém, serve o front em `app.staging.foodshare.com.br` e a API em `api.staging.foodshare.com.br` — **origens diferentes** (subdomínios do mesmo site). Sem tratar isso, o browser bloqueia toda chamada cross-origin e o cookie de sessão do better-auth emitido pela API não volta nas requisições do front — login e qualquer rota autenticada quebram no staging.

## What Changes

- **CORS no backend** (`main.ts`): `app.enableCors({ origin: <lista TRUSTED_ORIGINS>, credentials: true })`. Hoje não há `enableCors` nenhum, então o browser recusa qualquer requisição cross-origin. Reusa a var `TRUSTED_ORIGINS` já existente (mesma lista de origens do frontend). Sempre ligado — em dev (mesma origem via proxy) é inócuo.
- **Cookie cross-subdomínio no better-auth** (`auth.instance.ts`): quando `COOKIE_DOMAIN` está setada, `advanced.crossSubDomainCookies = { enabled: true, domain: COOKIE_DOMAIN }` — o cookie de sessão passa a ter `Domain=.staging.foodshare.com.br` e é enviado tanto para `app.` quanto para `api.`. Sem `COOKIE_DOMAIN` (dev), nada muda — cookie continua `host-only`, `SameSite=Lax`, mesma origem. `secure` é ligado automaticamente pelo better-auth quando `BETTER_AUTH_URL` é `https://`.
- **`backend/.env.example`**: nova var `COOKIE_DOMAIN` (vazia/comentada em dev; `.staging.foodshare.com.br` no staging).
- **`frontend/.env.example`**: comentário explicando `VITE_API_URL` — dev `/api` (proxy), staging a URL absoluta `https://api.staging.foodshare.com.br` (o código já lê a var, é só valor de build).
- **Docs**: `docs/PLANO-FRONTEND.md` (seção "Deploy") atualizada — a mudança "X" deixa de estar pendente; `docs/INFRAESTRUTURA.md` ganha as vars de ambiente e o modelo de origens.
- **Sem mudança no frontend em código.** O `frontend/src/lib/api.ts` já usa `import.meta.env.VITE_API_URL ?? '/api'`.

## Capabilities

### New Capabilities
<!-- Nenhuma. -->

### Modified Capabilities
<!-- Nenhuma. `skip_specs: true`: config de transporte (CORS, atributos de cookie). O comportamento de login/logout continua o mesmo (capability `auth/login`); só passa a funcionar quando front e API estão em subdomínios distintos. Aspecto de segurança registrado no design.md. -->

## Impact

- **Backend**: `main.ts` (+`enableCors`), `auth.instance.ts` (+`crossSubDomainCookies` condicional), `.env.example` (+`COOKIE_DOMAIN`). Nenhuma migration, nenhum endpoint novo, nenhuma mudança de contrato.
- **Frontend**: só `.env.example` (comentário). Build de staging define `VITE_API_URL` absoluto.
- **Coolify (staging)**: setar no serviço da API — `BETTER_AUTH_URL=https://api.staging.foodshare.com.br`, `TRUSTED_ORIGINS=https://app.staging.foodshare.com.br`, `COOKIE_DOMAIN=.staging.foodshare.com.br`. No serviço do front — `VITE_API_URL=https://api.staging.foodshare.com.br`. Staging **precisa servir HTTPS** (o cookie vai `secure`).
- **Verificação**: `OPTIONS` (preflight) + `POST` com header `Origin` cross-origin via curl contra o backend local com `TRUSTED_ORIGINS`/`COOKIE_DOMAIN` simulados; teste existente de auth (`bloqueio-login-invalido`, `origin check`) continua passando.
- **Fora do escopo**: config de prod (`foodshare.com.br` sem `staging.`) — mesma receita, valores diferentes, quando o prod existir; qualquer ajuste no Coolify/Cloudflare (feito manualmente pela Maria); `partitioned`/CHIPS no cookie (fallback documentado se algum browser reclamar).
