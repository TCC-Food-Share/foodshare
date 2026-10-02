# Food Share — Frontend

SPA em React 19 + TypeScript + Vite. Consome a API NestJS do `backend/`.

## Stack

- **Vite 7** + `@vitejs/plugin-react` 5 + React Compiler — **não subir** essas duas
  versões (bug ARM64 do Rolldown no Coolify, ver `docs/INFRAESTRUTURA.md`).
- **Tailwind v4** via `@tailwindcss/vite` (sem `tailwind.config.js` / `postcss`).
- **shadcn/ui** — componentes em `src/components/ui/` (tokens em `src/styles/index.css`,
  portados do protótipo Pencil).
- **react-router-dom** — roteamento.
- **@tanstack/react-query** — cache / paginação / mutations.
- **react-hook-form + zod** — formulários (schemas espelham os DTOs do backend).

## Rodando local

Precisa do `backend/` em `http://localhost:3000` (com Postgres). O Vite faz proxy
de `/api/*` → `:3000` (ver `server.proxy` em `vite.config.ts`), então a mesma
origem vale no browser e o cookie de sessão do better-auth flui sem CORS.

```bash
cp .env.example .env      # VITE_API_URL=/api já funciona com o proxy
npm install
npm run dev
```

Em produção `/api` é roteado para o backend pelo reverse proxy (mesma origem);
ajustar `VITE_API_URL` só se a API for para outro host.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — `tsc -b && vite build`
- `npm run lint:check` — ESLint (0 warnings)
- `npm run format` — Prettier

## Estrutura

```
src/
  app/          árvore de rotas
  lib/          api (fetch + ApiError), query-client, cn
  components/
    ui/         primitivos shadcn/ui
    layout/     AppShell, topbar, menu do usuário
  features/
    auth/       AuthProvider, useAuth, ProtectedRoute, RoleRoute
  styles/       Tailwind + tokens
```

Cada tela dos RF vira `features/<nome>/` nas changes F1–F8.
