## 1. Dependências e build

- [x] 1.1 `frontend/`: deps de runtime — `react-router-dom`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@hookform/resolvers`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/react-{slot,label,dialog,tabs,dropdown-menu,select}`, `sonner`. `npm audit fix` (0 vulnerabilidades).
- [x] 1.2 Deps de estilo — `tailwindcss@4`, `@tailwindcss/vite`, `tw-animate-css`. `vite`/`@vitejs/plugin-react` inalterados.
- [x] 1.3 `vite.config.ts`: `@tailwindcss/vite` no `plugins`; `server.proxy` (`/api` → `http://localhost:3000`, `changeOrigin`, `rewrite`); `resolve.alias` `@` → `src`.
- [x] 1.4 `tsconfig.app.json`: `paths` `@/*` → `./src/*` (sem `baseUrl` — deprecado no TS 6).
- [x] 1.5 Removido cruft: `App.css`, `App.tsx`, `assets/react.svg`, `assets/vite.svg`, `index.css`, `public/icons.svg`. `hero.png` mantido. `index.html`: título "Food Share", `lang="pt-BR"`.

## 2. Estilo e tokens

- [x] 2.1 `src/styles/index.css`: `@import "tailwindcss"` + `tw-animate-css`; `@custom-variant dark`; `:root` com os tokens do Pencil (`GetVariables()` = shadcn default Neutral); bloco `.dark`; `@theme inline` mapeando `--color-*`; `@layer base` (`bg-background text-foreground`).
- [x] 2.2 `src/lib/cn.ts`: `cn()` com `clsx` + `twMerge`.
- [x] 2.3 `src/main.tsx` importa `./styles/index.css`. `index.css` antigo removido.

## 3. Componentes base (shadcn/ui) — `src/components/ui/`

- [x] 3.1 Escritos à mão a partir das fontes canônicas (CLI do shadcn não completou por lentidão de rede): `button`, `input`, `label`, `textarea`, `badge`, `card`, `dialog`, `tabs`, `table`, `dropdown-menu`, `skeleton`, `alert`, `sonner`, `select`, `form`.
- [x] 3.2 `pagination`.
- [x] 3.3 Usam os tokens (`bg-primary`, `text-muted-foreground`, `border-input`, `ring-ring`…). Override no `eslint.config.js` para `src/components/ui/**` (`react-refresh/only-export-components` off — exportam variantes/hooks). Conferância visual contra o protótipo fica para o `npm run dev` das telas (F1+).

## 4. Cliente HTTP e React Query

- [x] 4.1 `src/lib/api.ts`: `ApiError` (`status`, `body`, `message` — campos explícitos, `erasableSyntaxOnly`); `request<T>()` com `credentials: "include"`, base `VITE_API_URL ?? "/api"`, `query`, `extractMessage` (string | string[]); helpers `api.get/post/patch`. `src/vite-env.d.ts` tipa `VITE_API_URL`.
- [x] 4.2 `src/lib/query-client.ts`: `QueryClient` — `retry` off p/ 4xx; `refetchOnWindowFocus: false`; `QueryCache`/`MutationCache` `onError` → `setUnauthorizedHandler` chama o reset da sessão em `401`.
- [x] 4.3 `.env.example` (`VITE_API_URL=/api` + nota do proxy).

## 5. Autenticação — `src/features/auth/`

- [x] 5.1 `api.ts`: `getMe()` → `{ user, role }`; `signInEmail`; `signOutRequest`.
- [x] 5.2 `auth-context.ts` (context + tipos, `.ts` sem JSX) + `auth-provider.tsx` (`AuthProvider` — `status` loading/authenticated/unauthenticated, `user`, `role` normalizado, `signIn` + re-`getMe`, `signOut` + `queryClient.clear()`, `reset` registrado no query-client).
- [x] 5.3 `use-auth.ts`: `useAuth()` (erro fora do provider).
- [x] 5.4 `protected-route.tsx`: `<ProtectedRoute>` (+ `FullPageSpinner`) — loading → spinner; unauth → `<Navigate to="/login" state={{ from }}>`.
- [x] 5.5 `role-route.tsx`: `<RoleRoute role>` — papel diferente → `<Navigate to="/feed">`.

## 6. Backend — `role` no `/me`

- [x] 6.1 `backend/src/app.controller.ts`: `getMe` async, busca `prisma.role.findUnique` por `roleId` e retorna `{ user, role: role?.name ?? null }`. `@ApiOperation` atualizado.
- [x] 6.2 `backend/src/app.controller.spec.ts`: 2 testes de `getMe` (com role, e `null`).
- [x] 6.3 `backend/src/auth/auth.instance.ts`: `trustedOrigins` a partir de `TRUSTED_ORIGINS` (lista por vírgula, default `http://localhost:5173`) — sem isso o `POST /auth/sign-out` do browser dá `403 INVALID_ORIGIN` (originCheck do better-auth). `backend/.env.example` + `.env` local ganham `TRUSTED_ORIGINS`.
- [x] 6.4 `backend/`: lint 0 warnings, `npm test` 6 suites / 105 testes, `npm run build` ok.

## 7. Layout — `src/components/layout/`

- [x] 7.1 `nav-items.ts`: `navItemsFor(role)` — Feed + (Pedidos recebidos | Meus pedidos) + Meu perfil. Sem Estabelecimentos/Instituições, sem admin.
- [x] 7.2 `topbar.tsx`: logo "Food Share" + nav (desktop) + menu hambúrguer (mobile) + `UserMenu`.
- [x] 7.3 `sidebar.tsx`: **não criado** — todas as telas do MVP (feed, pedidos, perfil) usam topbar no protótipo. Se uma feature precisar de sidebar, a change dela adiciona.
- [x] 7.4 `user-menu.tsx`: `DropdownMenu` do avatar — "Meu perfil" e "Sair" (`auth.signOut()` → `navigate("/login")`). RF09.
- [x] 7.5 `app-shell.tsx`: topbar + `<main>` + `<Outlet/>`.

## 8. Roteamento e providers

- [x] 8.1 `src/app/router.tsx`: `createBrowserRouter` — `/login`, `/cadastro` (stubs públicos); `<ProtectedRoute>` › `<AppShell>` › `/feed`, `/alimentos/:id`, `/pedidos`, `/pedidos/:id`, `/perfil` (stubs); `/` e `*` → `/feed`. (Lazy fica p/ F1+, quando houver telas reais.)
- [x] 8.2 `src/app/route-placeholder.tsx`: `<RoutePlaceholder feature title>` — mostra fase, rota e papel.
- [x] 8.3 `src/main.tsx`: `QueryClientProvider` › `AuthProvider` › `RouterProvider` + `Toaster`.
- [x] 8.4 `frontend/README.md` atualizado (stack, proxy, `VITE_API_URL`, rodar com backend em `:3000`).

## 9. Verificação e fechamento

- [x] 9.1 `frontend/`: `npm run lint:check` (0 warnings) e `npm run build` (`tsc -b && vite build`, Tailwind v4) sem erro. Validação ARM64 fica p/ o 1º deploy.
- [x] 9.2 Validação de ponta a ponta no browser (`playwright-cli`, backend `:3000` + Postgres + `npm run dev`), com um estabelecimento e uma entidade beneficiária de teste criados via API:
  - `/` sem sessão → redireciona `/feed` → `ProtectedRoute` → `/login` (stub F1 "Entrar").
  - Login via `fetch` do browser (`Origin: localhost:5173`) → `200` (confirma o `trustedOrigins`).
  - Autenticado como **entidade**: `/feed` monta o `AppShell` — topbar "Food Share", nav = **Feed / Meus pedidos / Meu perfil** (sem Estabelecimentos/Instituições/admin), avatar "VB". Placeholder mostra "papel: beneficiary".
  - Autenticado como **estabelecimento**: nav = **Feed / Pedidos recebidos / Meu perfil**, "papel: establishment".
  - Menu do avatar → "Meu perfil" + "Sair". "Sair" → `POST /api/auth/sign-out` (`200`, sessão limpa), volta para `/login`.
  - Depois do logout: rota protegida (`/pedidos`, `/perfil`) e rota desconhecida (`/xpto`) → `/login`. Autenticado, rota desconhecida → `/feed`.
  - 0 erros de console no shell (os `401` de `/api/me` no bootstrap sem sessão são esperados e tratados). Screenshot do shell confere o tema (tokens do Pencil = shadcn Neutral).
  - Dados de teste removidos.
- [x] 9.3 Componentes `ui/` são as fontes canônicas do shadcn/ui new-york v4 com os tokens do Pencil (= default Neutral do próprio shadcn). Shell renderizado no browser confere: bg `#fafafa`, texto quase-preto, nav ativa com fundo sutil, borda inferior, avatar arredondado — coerente com o protótipo. Conferância pixel-a-pixel dos primitivos acontece ao montar as telas em F1+.
- [x] 9.4 `openspec validate frontend-fundacao --strict` sem erro.
