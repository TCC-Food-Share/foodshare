## Context

Ver `proposal.md` ("Why"). Estado atual do `frontend/`: Vite 7 + `@vitejs/plugin-react` 5 + React 19 + React Compiler (`babel-plugin-react-compiler`), TS `~6.0`, ESLint 10 + Prettier + `simple-import-sort`. Só `react`/`react-dom` em `dependencies`. `src/` = template CRA-like (`App.tsx`, `App.css`, `assets/`).

Backend relevante:
- `GET /me` → `{ user: session.user }`. `session.user` traz os campos do better-auth + `additionalFields` (`roleId: number`, `personalPhone: string`). **Não traz o nome do papel.**
- `POST /auth/sign-in/email` (better-auth nativo) → emite cookie de sessão (`sameSite: 'lax'`, `httpOnly`, default do better-auth). `POST /auth/sign-out` → limpa o cookie. `basePath: '/auth'`, `baseURL: http://localhost:3000`.
- better-auth com quase tudo em `disabledPaths` — só `sign-in/email` e `sign-out` estão vivos; `get-session` desabilitado (a checagem de sessão é o nosso `GET /me`).
- **Sem CORS** em `main.ts`.
- Cadastro é `POST /establishments` / `POST /beneficiary-entities` (não `sign-up`). Edição é `PATCH /establishments/me` / `PATCH /beneficiary-entities/me`. **Não há `GET` desses perfis** (gap do F3/RF05, não desta change).

`docs/CONVENCOES.md`: frontend por feature/tela, componentes funcionais + hooks, TS estrito, código/rotas/DTO em inglês, texto de UI em pt-BR. `docs/INFRAESTRUTURA.md`: **não subir `vite`/`@vitejs/plugin-react`** (bug ARM64 do Rolldown no `vite@8` no build do Coolify).

Tokens do protótipo Pencil (`GetVariables()`): é o tema **default do shadcn/ui, base Neutral, sem accent** — `--primary #171717` (quase preto), `--background #fafafa`, `--destructive #e7000b`, `--radius` shadcn padrão. Algumas telas do protótipo mostram botão primário azul; isso é variação de tema por frame, não o baseline — reconciliar no F1.

## Goals / Non-Goals

**Goals:**
- Base para F1–F8: uma tela nova = criar `features/<x>/`, compor `components/ui` + `lib/api` + hooks de query, plugar rota.
- Sessão do better-auth funcionando fim-a-fim em dev sem CORS (proxy do Vite) e em prod sem config extra (mesma origem).
- Fidelidade ao protótipo: shadcn/ui + tokens Pencil.

**Non-Goals:**
- Qualquer tela de RF (placeholders só).
- Toggle de tema pelo usuário (só o baseline claro + `.dark` nos tokens).
- `GET` de perfil de instituição (F3), deploy Coolify, i18n, testes E2E.
- Refatorar o backend além do `role` no `/me`.

## Decisions

**Tailwind v4 via `@tailwindcss/vite`, não v3 + PostCSS.**
shadcn/ui hoje assume Tailwind v4 (CSS-first `@theme`, sem `tailwind.config.js`, sem `postcss.config`). `@tailwindcss/vite` suporta Vite 5–7 → compatível com o `vite@7` pinado. `src/styles/index.css`:
```css
@import "tailwindcss";
@import "tw-animate-css";
@custom-variant dark (&:is(.dark *));
:root { --background:#fafafa; --foreground:#0a0a0a; --primary:#171717; /* ...tokens Pencil... */ --radius:0.625rem; }
.dark { --background:#0a0a0a; --foreground:#fafafa; /* ...dark do Pencil... */ }
@theme inline { --color-background: var(--background); /* ...mapeia tokens -> utilities... */ }
```
Risco: se o build ARM64 quebrar com Tailwind v4 no Coolify, cair para v3 + `tailwind.config.ts` + `postcss` — registrado em Riscos. Task de verificação do `npm run build` local obrigatória.

**`lib/api.ts` — um `request<T>()` central, sem SDK gerado.**
```ts
const BASE = import.meta.env.VITE_API_URL ?? "/api";
export class ApiError extends Error { constructor(readonly status: number, readonly body: unknown, message: string) { super(message); } }
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, { credentials: "include", headers: { "Content-Type": "application/json", ...init?.headers }, ...init });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body, extractMessage(body) ?? res.statusText);
  return body as T;
}
```
`extractMessage` lê `body.message` (formato de erro do NestJS `ValidationPipe`/`HttpException`, string ou string[]). `ApiError.status` é o que as telas usam para distinguir 400 (dado inválido) / 401 (sessão) / 404 / 409 (conflito de estado — RF15, RF16…). Sem cliente gerado do OpenAPI: o custo de manter geração + o schema misto (better-auth + Nest) não paga no MVP; cada `features/<x>/api.ts` tipa suas respostas à mão a partir dos DTOs do backend.

**Proxy do Vite em dev; `VITE_API_URL` default `/api` em prod.**
`vite.config.ts`: `server.proxy = { "/api": { target: "http://localhost:3000", changeOrigin: true, rewrite: p => p.replace(/^\/api/, "") } }`. O browser vê tudo em `localhost:5173` → cookie `sameSite: lax` flui, **sem precisar de CORS no backend**. Em prod (Coolify), frontend e API atrás do mesmo host, `/api/*` roteado para o backend pelo reverse proxy → mesma origem, mesmo default. Alternativa (CORS + `sameSite: none` + subdomínio `api.`) descartada: mais config, cookie cross-site, e exigiria mudança no better-auth. Se o deploy exigir subdomínio, é decisão de infra depois — o código já isola tudo em `VITE_API_URL`.

**`AuthProvider` com máquina de estado explícita.**
`status: "loading" | "authenticated" | "unauthenticated"`. No mount: `GET /api/me` → `authenticated` (guarda `user` + `role`) ou `unauthenticated` (em `401`). `signIn(email, password)`: `POST /api/auth/sign-in/email`; em sucesso, re-`GET /api/me` (o better-auth com `autoSignIn: false`… na verdade `sign-in/email` já loga — mas re-buscar `/me` normaliza o shape e pega o `role`). `signOut()`: `POST /api/auth/sign-out` + limpa estado + `queryClient.clear()`. Um interceptor no `request()` não dá (fetch não tem) — em vez disso, um `onError` global no `QueryClient` (e nas mutations) detecta `ApiError.status === 401` e chama `auth.reset()`.
`<ProtectedRoute>`: `status === "loading"` → spinner; `unauthenticated` → `<Navigate to="/login" state={{ from }}>`; senão `<Outlet/>`. `<RoleRoute role="establishment">`: idem + checa `auth.role`.

**Backend: `GET /me` retorna `role`.**
`AppController.getMe`: `const role = await this.prisma.role.findUnique({ where: { id: session.user.roleId } }); return { user: session.user, role: role?.name ?? null };`. `role.name` é `"Establishment"` | `"BeneficiaryEntity"` (seed). Frontend mapeia para `"establishment"` | `"beneficiary"`. Alternativa (frontend deduz por `roleId === 1`): frágil, depende da ordem do seed. Teste novo em `app.controller.spec.ts` cobrindo o lookup.

**Layout: `AppShell` = topbar sempre + sidebar quando o Pencil pede.**
Navegação derivada do papel e **filtrada ao MVP** numa lista única (`nav-items.ts`), sem itens de perfil público nem admin. `UserMenu` (dropdown do avatar) tem "Meu Perfil" e "Sair". "Sair" chama `auth.signOut()` e navega para `/login` (RF09). O shell não busca dados — cada tela busca os seus.

**Estrutura de pastas** (`docs/CONVENCOES.md` — por feature):
```
src/
  main.tsx                     providers (QueryClientProvider, BrowserRouter, AuthProvider, Toaster)
  app/router.tsx               árvore de rotas + lazy
  lib/{api.ts,query-client.ts,cn.ts}
  components/ui/*               shadcn
  components/layout/{app-shell,topbar,sidebar,user-menu,nav-items}.tsx
  features/auth/{auth-context,use-auth,protected-route,role-route,api}.tsx
  styles/index.css
```
F1–F8 adicionam `features/<nome>/` (componentes de tela, hooks de query, `api.ts`, schemas zod).

**Rotas placeholder.** `/login`, `/cadastro`, `/feed`, `/alimentos/:id`, `/pedidos`, `/pedidos/:id`, `/perfil`. Cada uma renderiza um stub ("F1 — em construção") até a change da feature. `/` redireciona para `/feed`. Rota desconhecida → `/feed` (ou 404 simples).

## Risks / Trade-offs

- [Tailwind v4 + `@tailwindcss/vite` no build ARM64 do Coolify não testado] → mitigação: task obrigatória de `npm run build` local + registrar que o primeiro deploy valida ARM64; fallback documentado para Tailwind v3 + PostCSS se quebrar.
- [Sem cliente gerado do OpenAPI → tipos de resposta mantidos à mão] → aceito no MVP; os DTOs do backend são pequenos e estáveis, e o schema misto better-auth+Nest torna a geração chata. Cada `features/*/api.ts` fica com os tipos ao lado das chamadas.
- [`GET /me` extra query de `role` por request] → desprezível (tabela minúscula, indexável por PK); alternativa de embutir no `session.user` exigiria hook no better-auth, mais superfície.
- [Proxy do Vite ≠ ambiente de prod] → o comportamento de cookie/mesma-origem é equivalente (prod também mesma origem); o risco real é só de config de reverse proxy no deploy, fora desta change.
- [React Compiler ligado + libs novas (Radix, RHF)] → todas suportam React 19 e o compiler; se algum componente do shadcn brigar com o compiler, `"use no memo"` pontual. Baixo risco.
- [Placeholders de rota podem mascarar erro de roteamento] → cada stub imprime a rota e o papel esperado, e a task de verificação navega por todas.
