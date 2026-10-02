## Why

O backend cobre RF01–RF20; o `frontend/` é só o scaffold do Vite (`react`/`react-dom`, `App.tsx` template). Nenhuma tela do MVP pode ser construída sem antes existir a fundação: roteamento, sessão ligada ao better-auth, cliente HTTP com erros tipados, o shell de layout com navegação recortada ao escopo do MVP, e o design system portado do protótipo Pencil (que já é shadcn/ui). Esta change entrega essa base para que F1–F8 (as telas dos RF) apenas componham peças prontas.

## What Changes

- **Dependências** (`frontend/package.json`): `react-router-dom`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`, `tailwindcss@4` + `@tailwindcss/vite`, e as libs que o shadcn/ui usa (`class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `tailwindcss-animate`, primitivos `@radix-ui/*` conforme cada componente). `vite@7` e `@vitejs/plugin-react@5` **não sobem** (regra de `docs/INFRAESTRUTURA.md` — bug ARM64 do Rolldown no `vite@8`).
- **Estilo / tokens**: Tailwind v4 via plugin do Vite (sem `postcss.config`); `src/styles/index.css` com os tokens do protótipo Pencil (`GetVariables()` → shadcn default, base Neutral: `--background #fafafa`, `--foreground #0a0a0a`, `--primary #171717`, `--destructive #e7000b`, `--border #e5e5e5`, etc.), com bloco `.dark`. Fonte do sistema/`Inter`.
- **Cliente HTTP** (`src/lib/api.ts`): wrapper de `fetch` com base em `import.meta.env.VITE_API_URL` (default `/api`), `credentials: 'include'` (cookie de sessão do better-auth), parse de JSON, e `ApiError` tipado com `status` (400/401/404/409) e a mensagem do servidor. `401` dispara reset da sessão no `AuthProvider`.
- **React Query** (`src/lib/query-client.ts`): `QueryClient` com `retry` desligado para 4xx e defaults sensatos.
- **Autenticação** (`src/features/auth/`): `AuthProvider` (bootstrap por `GET /api/me`, expõe `user`, `role`, `signIn`, `signOut`, `status`), `useAuth`, `<ProtectedRoute>` (redireciona para `/login` preservando o destino), `<RoleRoute>` (rota só de estabelecimento / só de entidade). `signIn` → `POST /api/auth/sign-in/email`; `signOut` → `POST /api/auth/sign-out`.
- **Suporte mínimo no backend**:
  - `GET /me` passa a retornar o **nome do papel** (`role`) além de `user` — o frontend precisa saber se é estabelecimento ou entidade beneficiária para montar navegação e rotas, e hoje `session.user` só traz `roleId` (número). Uma consulta a `role` por id, sem mudança de schema.
  - `auth.instance.ts` ganha `trustedOrigins` (env `TRUSTED_ORIGINS`, default de dev `http://localhost:5173`). Login e logout do better-auth são POST e passam pelo `originCheck`; como o frontend chama a API por baixo de um proxy (mesma origem no browser), a origem que chega não é a `baseURL` — sem isso o `POST /auth/sign-out` (e o `sign-in` do F1) responde `403 INVALID_ORIGIN`.
- **Layout** (`src/components/layout/`): `AppShell` (topbar + sidebar conforme o Pencil), navegação **só com itens do MVP** — Feed, Meus Pedidos / Pedidos Recebidos (conforme o papel), Meu Perfil, e Sair (RF09) no menu do avatar. **Sem** "Estabelecimentos"/"Instituições", **sem** área administrativa. Responsivo.
- **Roteamento** (`src/app/router.tsx`): árvore de rotas para as telas de F1–F8 como placeholders preguiçosos (`/login`, `/cadastro/*`, `/feed`, `/alimentos/:id`, `/pedidos`, `/pedidos/:id`, `/perfil`), sob `<ProtectedRoute>` exceto login/cadastro.
- **Componentes base do shadcn/ui** em `src/components/ui/`: `button`, `input`, `label`, `select`, `textarea`, `badge`, `card`, `dialog`, `tabs`, `table`, `pagination`, `dropdown-menu`, `form`, `sonner` (toasts), `skeleton`, `alert`. Gerados/adaptados a partir do protótipo (nomes de componente batem 1:1).
- **Dev**: proxy do Vite `^/api` → `http://localhost:3000` (mesma origem no browser → cookie flui, sem CORS). Prod: mesma origem via reverse proxy do Coolify; `VITE_API_URL` default `/api`.
- **Limpeza**: remove o cruft do template (`App.css`, conteúdo default de `App.tsx`, `assets/react.svg`/`vite.svg`); atualiza `README.md`; `.env.example` com `VITE_API_URL`.

## Capabilities

### New Capabilities
<!-- Nenhuma. -->

### Modified Capabilities
<!-- Nenhuma. `skip_specs: true` no .openspec.yaml: esta change é scaffold/tooling do frontend — nenhum comportamento de RF é entregue aqui. Login/feed/pedidos/etc. (comportamento observável) chegam em F1–F8, cada um com sua própria change. O ajuste do `GET /me` é suporte de plumbing, não muda contrato de RF. -->

## Impact

- **Frontend**: reestrutura `frontend/src/` em `app/`, `lib/`, `components/{ui,layout}/`, `features/auth/`, `styles/`. Novos `tailwind` (via `@tailwindcss/vite`), `vite.config.ts` ganha o plugin do Tailwind + `server.proxy`. `package.json`/`package-lock.json` com as novas deps.
- **Backend**: `AppController.getMe` retorna `role` (nome), com teste; `auth.instance.ts` com `trustedOrigins`; `backend/.env.example` ganha `TRUSTED_ORIGINS`. Nenhuma migration, nenhum outro endpoint.
- **Depende de** (já implementados): `GET /me`, `POST /auth/sign-in/email`, `POST /auth/sign-out`.
- **Build**: `tsc -b && vite build` do frontend deve continuar verde; validar o build (atenção ARM64 do Coolify — não subir vite/plugin-react).
- **Fora do escopo desta change**: qualquer tela de RF (F1–F8), configuração de deploy no Coolify, `GET /establishments/me` e `GET /beneficiary-entities/me` (necessários no F3/RF05 — a serem adicionados lá), tema claro/escuro com toggle de usuário (só o baseline de tokens), i18n, testes E2E de frontend.
