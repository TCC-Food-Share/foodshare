## 1. Backend — CORS

- [x] 1.1 `src/auth/auth.instance.ts`: `export const trustedOrigins` (tornar público o array já existente).
- [x] 1.2 `src/main.ts`: `import { trustedOrigins }`; `app.enableCors({ origin: trustedOrigins, credentials: true, methods: [...] })` logo após `NestFactory.create`, antes de `express.json()`.

## 2. Backend — cookie cross-subdomínio

- [x] 2.1 `src/auth/auth.instance.ts`: `const cookieDomain = process.env.COOKIE_DOMAIN?.trim() || undefined;`.
- [x] 2.2 `crossSubDomainCookies` **mesclado no bloco `advanced` já existente** (que tinha `database.generateId: 'serial'`) — `...(cookieDomain ? { crossSubDomainCookies: { enabled: true, domain: cookieDomain } } : {})`. (Bug pego na verificação: um spread `advanced` separado era sobrescrito pela chave `advanced` que já existia mais abaixo no objeto → o cookie saía sem `Domain=`.)

## 3. Env / config

- [x] 3.1 `backend/.env.example`: `COOKIE_DOMAIN` (vazio + comentário; staging `.staging.foodshare.com.br`). `BETTER_AUTH_URL`/`TRUSTED_ORIGINS` com nota dev/staging.
- [x] 3.2 `frontend/.env.example`: comentário — dev `/api` (proxy); staging `https://api.staging.foodshare.com.br` (absoluto).

## 4. Docs

- [x] 4.1 `docs/PLANO-FRONTEND.md`: linha "X" da tabela e da lista de gaps marcada como feita; seção "Deploy" reescrita com a receita final por ambiente (3 vars de backend + 1 de front).
- [x] 4.2 `docs/INFRAESTRUTURA.md`: subseção "Frontend ↔ API (origens)" — tabela de vars por ambiente, `foodshare.com.br` como site pai, pré-condição de HTTPS no staging, e a alternativa de mesmo host.

## 5. Verificação e fechamento

- [x] 5.1 `backend/`: `npm run lint:check` (0 warnings), `npm test` (6 suites / 105 testes — auth/originCheck seguem passando), `npm run build` sem erro.
- [x] 5.2 CORS local (curl, backend `:3000`, `TRUSTED_ORIGINS=http://localhost:5173`):
  - `OPTIONS /orders` + `Origin: http://localhost:5173` → `204` com `Access-Control-Allow-Origin: http://localhost:5173`, `Allow-Credentials: true`, `Allow-Methods`, `Allow-Headers`.
  - `OPTIONS /auth/sign-in/email` + mesmos headers → **idem** (o preflight de `/auth/*` também pega CORS — o risco de ordem do design.md não se confirmou).
  - `OPTIONS /orders` + `Origin: http://evil.example` → **sem** `Access-Control-Allow-Origin`.
  - `GET /health` + `Origin` confiável → header ecoado.
- [x] 5.3 Cookie cross-subdomínio local (curl, backend com `BETTER_AUTH_URL=https://api.local.test`, `COOKIE_DOMAIN=.local.test`, `TRUSTED_ORIGINS=https://app.local.test`): `POST /auth/sign-in/email` com `Origin: https://app.local.test` → `Set-Cookie: __Secure-better-auth.session_token=...; Domain=.local.test; Path=/; HttpOnly; Secure; SameSite=Lax`. Sem `COOKIE_DOMAIN` (dev): a mesma resposta **não** traz `Domain=`. Dados de teste removidos.
- [x] 5.4 Fluxo same-origin no browser (`playwright-cli`, backend dev normal + `npm run dev`): com o `enableCors` ligado, o fluxo do F0 continua intacto — `/feed` sem sessão → `/login`; login → `/feed` com o shell e a nav de entidade; "Sair" → `/login` e `/api/me` → 401. (Cross-subdomínio de verdade só valida no 1º deploy do staging — localmente foi coberto por curl no 5.3.)
- [x] 5.5 `openspec validate deploy-cross-origin --strict` sem erro.
