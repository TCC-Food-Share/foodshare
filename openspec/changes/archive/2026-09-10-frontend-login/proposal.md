## Why

O F0 entregou toda a plumbing de sessão do frontend (`AuthProvider.signIn`,
`ProtectedRoute`, `UserMenu` com logout) e um placeholder na rota `/login`.
RF07/RF08/RF09 já estão completos e testados no backend (specs `auth/login` e
`auth/logout`), mas **não existe tela de login** — nenhum usuário consegue de
fato autenticar pelo app, e toda a área protegida (F2–F8) fica inalcançável.
F1 constrói a tela real de login e fecha o ciclo de sessão ponta a ponta.

## What Changes

- **Rota `/login`** (pública): substitui o `RoutePlaceholder` do F0 por uma
  `LoginPage` real. Se o usuário já estiver autenticado, redireciona para `/feed`.
- **Layout de painel duplo** portado da tela `Desktop - Login` do protótipo
  Pencil: painel de marca à esquerda (gradiente `#1d4ed8 → #1e3a8a`, logo, hero,
  stats estáticos, rodapé) + painel de formulário à direita.
- **Formulário** e-mail + senha com `react-hook-form` + `zod` (e-mail válido,
  senha não vazia — RNF06 adiantado). Submit chama `AuthProvider.signIn`
  (já existente: `POST /api/auth/sign-in/email` + re-`GET /me`); em sucesso,
  redireciona para `location.state.from?.pathname ?? '/feed'`.
- **RF08 — erro genérico**: qualquer falha do sign-in renderiza **uma única
  mensagem** ("E-mail ou senha inválidos.") num `Alert` destructive, sem
  distinguir campo e sem expor a mensagem do backend. O backend já devolve
  `401 INVALID_EMAIL_OR_PASSWORD` tanto para credencial incorreta quanto para
  conta com exclusão lógica (hook `reject-deleted-user`), então o frontend só
  precisa mapear "sign-in falhou" → a frase única em pt-BR.
- **Link "Criar uma conta"** → `/cadastro` (stub do F2), com o divisor "ou"
  do protótipo.
- **Logo** (`logo_foodshare.png` do protótipo): entra em
  `frontend/src/assets/logo-foodshare.png` (recortada ao bounding box + margem,
  quadrada). Usada no painel de marca do login (selo branco + logo + wordmark,
  como o `brandTop` do protótipo) e na topbar do `AppShell` (marca + wordmark).
- **RF09 — logout**: já implementado no `UserMenu` (F0). F1 apenas confirma o
  fluxo na verificação de ponta a ponta; nenhum código novo previsto.
- **Tokens de cor** (`frontend/src/styles/index.css`): reconciliação prevista
  no `design.md` do F0. Trocar `--primary`, `--primary-foreground` e `--ring`
  (em `:root` e `.dark`) do accent Neutral portado no F0 para o accent Blue que
  **todos os frames de tela** do protótipo usam (`theme: {Accent: "Blue"}`):
  `--primary #1d4ed8`, `--primary-foreground #eff6ff`, `--ring #3b82f6`
  (dark `#2563eb`). Passa a valer para todo botão primário do app.
- **Protótipo Pencil** (`~/Downloads/pencil-design-apresentacao (1).pen`):
  "Esqueci minha senha" removido das telas `Desktop - Login` e
  `Desktop - Login (Dark)` (recuperação de senha é Fora do Escopo). O botão de
  toggle de tema do protótipo **não vira código** (sem RF; toggle de tema foi
  adiado no F0).

## Capabilities

### New Capabilities

<!-- Nenhuma. -->

### Modified Capabilities

<!-- Nenhuma. `skip_specs: true` no .openspec.yaml.

O comportamento observável de RF07/RF08/RF09 já está descrito e implementado
nas specs `auth/login` e `auth/logout` (changes `autenticacao-login`,
`bloqueio-login-invalido`, `encerramento-sessao`): autenticar com e-mail e
senha emitindo sessão, rejeitar credencial inválida / conta excluída com a
mesma mensagem genérica, encerrar a sessão a qualquer momento. F1 é a
**entrega dessa mesma capability na superfície de UI** — não muda nenhum
requisito de sistema. Segue o precedente do F0 (`frontend-fundacao`), também
`skip_specs`, que registrou que as telas de F1–F8 consomem specs existentes.
Não há capability de frontend/UI na organização de specs do projeto e não faz
sentido inventar uma só para satisfazer o validate. -->

## Impact

- **Frontend** (único afetado):
  - `src/app/router.tsx`: remove o placeholder de `/login`, aponta para `LoginPage`.
  - `src/styles/index.css`: valores de `--primary` / `--primary-foreground` / `--ring`.
  - Novos arquivos em `src/features/auth/` (tela de login + schema zod + painel de marca).
  - `src/assets/logo-foodshare.png` (novo) + uso em `components/layout/topbar.tsx`.
  - `public/favicon.ico` (novo, entregue pelo Andre) + `index.html`; remove o
    `public/favicon.svg` genérico do template Vite.
  - Sem dependências novas (usa `react-hook-form`, `zod`, `@hookform/resolvers`,
    `components/ui/{form,input,label,button,alert}` já instalados no F0).
- **Backend**: nada. Endpoints (`POST /auth/sign-in/email`, `POST /auth/sign-out`,
  `GET /me`) e `trustedOrigins` já entregues.
- **Depende de** (já em `develop`): F0 (`AuthProvider`, `useAuth`, `ProtectedRoute`,
  `lib/api`, `components/ui/*`, tokens), specs `auth/login` e `auth/logout`.
- **Build**: `tsc -b && vite build` do frontend deve continuar verde (atenção
  ao ARM64 do Coolify — não subir `vite` / `@vitejs/plugin-react`).
- **Fora do escopo desta change**: cadastro (F2), recuperação de senha, toggle
  de tema, "lembrar-me", rate limiting de tentativas, testes E2E automatizados.
