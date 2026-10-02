## Context

Ver `proposal.md` — "Why". Estado herdado do F0 (`frontend-fundacao`, em `develop`):

- `AuthProvider` expõe `status: 'loading' | 'authenticated' | 'unauthenticated'`,
  `user`, `role`, `signIn(email, password)`, `signOut()`.
  `signIn` = `POST /api/auth/sign-in/email` (via `signInEmail`) seguido de
  `loadSession()` (`GET /api/me`). `signInEmail` usa `api.post`, que **lança
  `ApiError`** (`status`, `body`, `message`) em resposta não-2xx.
- `<ProtectedRoute>` já redireciona anônimo para `/login` com
  `state={{ from: location }}` (um objeto `Location` do react-router, só path
  same-origin) e mostra `<FullPageSpinner>` enquanto `status === 'loading'`.
- `src/app/router.tsx` tem `/login` como rota pública renderizando
  `<RoutePlaceholder feature="F1" title="Entrar" />`.
- `components/ui/`: `form` (shadcn padrão sobre `react-hook-form`), `input`,
  `label`, `button`, `alert` (variante `destructive`), `sonner` — todos prontos.
  `@hookform/resolvers` + `zod@4` instalados.
- `UserMenu` (F0) já tem "Sair" → `signOut()` → `navigate('/login')` — RF09.
- Backend: `POST /auth/sign-in/email` devolve `401` com código
  `INVALID_EMAIL_OR_PASSWORD` para credencial incorreta **e** para conta
  `deleted` (hook `reject-deleted-user`). Nenhuma mudança de backend em F1.
- Tokens em `src/styles/index.css`: o F0 portou o accent **Neutral** do shadcn
  (`--primary #171717`). Toda tela de desktop do protótipo Pencil tem
  `theme: {Accent: "Blue"}`; os componentes referenciam `$--primary` etc.,
  então no protótipo o primário resolve para `#1d4ed8`.

## Goals / Non-Goals

**Goals:**

- Uma `LoginPage` que compõe peças do F0 (nada de infra nova de sessão).
- Fidelidade visual à tela `Desktop - Login` do protótipo, dentro do recorte MVP.
- RF08 aplicado na camada de apresentação: uma frase, sem vazar campo nem
  a mensagem crua do backend.

**Non-Goals (nível de design):**

- Refatorar `AuthProvider` / `lib/api` / `ProtectedRoute`.
- Tema claro/escuro com toggle (o protótipo tem o botão; F1 não porta).
- Máquina de estado de erro por campo, contadores de tentativa, captcha.
- Tela de login mobile dedicada (o layout de painel colapsa para uma coluna
  em telas estreitas — RNF01 — mas sem frame próprio no protótipo).

## Decisions

### 1. `LoginPage` é dona do próprio layout; fica fora de `AppShell`

`/login` continua rota pública de topo em `router.tsx`, sem `<ProtectedRoute>`
nem `<AppShell>`. O layout de painel duplo (marca + formulário) é local da
página. Alternativa considerada: um `AuthLayout` compartilhado com `/cadastro`
(F2) — adiada para o F2, quando existir a segunda tela que justifique a
extração. Em F1 seria abstração prematura.

### 2. Estrutura de arquivos — plano, em `src/features/auth/`

Segue o F0 (que manteve `features/auth/` sem subpastas):

- `src/features/auth/login-page.tsx` — a rota: guarda de sessão, layout,
  `useForm`, `onSubmit`, estado de erro do servidor.
- `src/features/auth/login-schema.ts` — schema zod + tipo inferido.
- `src/features/auth/brand-panel.tsx` — o painel de marca (estático).

Alternativa (`features/auth/login/…` como subfeature) descartada: só 3 arquivos
e o F0 já fixou o padrão plano para `auth/`.

### 3. Guarda de sessão na própria página — e é ela que redireciona pós-login

```
status === 'loading'        → <FullPageSpinner />   (reaproveita o do F0)
status === 'authenticated'  → <Navigate to={from} replace />
senão                       → formulário
```

`from = (location.state?.from?.pathname) ?? '/feed'`. A guarda serve dois
casos com o mesmo código:

- **Já logado abriu `/login`**: sem `state.from` → cai no fallback `/feed`.
- **Pós-login bem-sucedido**: `onSubmit` só chama `signIn`; quando a sessão
  carrega, `status` vira `authenticated`, a página re-renderiza e a **própria
  guarda** faz o `<Navigate to={from}>`.

Tentei antes ter `onSubmit` chamando `navigate(from)` explicitamente além da
guarda fixa em `/feed` — os dois competem no re-render pós-login e o
`<Navigate to="/feed">` da guarda ganha, ignorando o destino pretendido
(pego no E2E: login a partir de `/perfil` caía em `/feed`). Um único caminho
de redirecionamento (a guarda, parametrizada por `from`) elimina a corrida.

`from` vem do `<ProtectedRoute>` como `Location` do react-router — só
`pathname` same-origin, sem risco de open-redirect (não é URL livre). `replace`
para o login não ficar no histórico.

### 5. Mapa de erro do submit → RF08

```ts
try {
  await signIn(values.email, values.password);
  // redirecionamento fica com a guarda de sessão (decisão 3)
} catch (err) {
  setFormError(
    err instanceof ApiError && err.status === 401
      ? 'E-mail ou senha inválidos.'
      : 'Não foi possível entrar. Tente novamente em instantes.',
  );
}
```

- `401` (credencial errada **ou** conta excluída — o backend já unifica) → a
  frase única de RF08. Sem `FormMessage` por campo para erro de servidor, sem
  destacar e-mail ou senha, sem usar `err.message` (que vem em inglês do
  better-auth).
- Qualquer outra falha (5xx, rede) → mensagem neutra de "tente de novo" — não
  finge que a credencial está errada, e continua sem vazar nada.
- `setFormError(null)` no início de cada submit.

O erro do servidor é renderizado num `<Alert variant="destructive">` acima dos
campos (o protótipo não tem estado de erro; este é o acréscimo mínimo).
`aria-live` implícito do `role="alert"` do componente cobre o leitor de tela.

### 6. Validação de formulário (RNF06, adiantado)

`react-hook-form` + `zodResolver`, `mode: 'onTouched'` (valida ao sair do campo
e revalida a cada tecla depois disso — "valida no preenchimento"):

```ts
z.object({
  email: z
    .string()
    .min(1, 'Informe seu e-mail.')
    .pipe(
      z.email({ pattern: z.regexes.html5Email, error: 'E-mail inválido.' }),
    ),
  password: z.string().min(1, 'Informe sua senha.'),
});
```

`z.email` com o preset `html5Email` (o regex do `input[type=email]` dos
browsers), não o default estrito do zod 4 — numa tela de **login** a conta já
existe com o e-mail que tiver; um regex Gmail-like poderia barrar um e-mail
real e válido. `.pipe` dá a mensagem de "vazio" antes da de "formato".

Erros por campo via `<FormMessage>` (shadcn). Botão "Entrar" desabilitado
enquanto `formState.isSubmitting`; troca rótulo para "Entrando…" + `Loader2Icon`.

### 7. Reconciliação de tokens para o accent Blue

Editar só três variáveis em `src/styles/index.css`, em `:root` **e** `.dark`,
para os valores que o protótipo usa no accent Blue:

| var                    | antes (F0, Neutral)                       | depois (Blue)                             |
| ---------------------- | ----------------------------------------- | ----------------------------------------- |
| `--primary`            | `#171717` (`:root`) / `#e5e5e5` (`.dark`) | `#1d4ed8` (ambos)                         |
| `--primary-foreground` | `#fafafa` / `#171717`                     | `#eff6ff` (ambos)                         |
| `--ring`               | `#a3a3a3` / `#737373`                     | `#3b82f6` (`:root`) / `#2563eb` (`.dark`) |

Resto do tema fica Neutral. Alternativa (blue só escopado na `LoginPage` via
classes utilitárias) descartada: criaria valores fora do sistema de tokens e o
protótipo pede primário azul em todas as telas, não só no login.

O painel de marca usa o gradiente do protótipo (`i5tjV`:
`linear-gradient(180deg, #1d4ed8 0%, #1e3a8a 100%)`) como classe utilitária
arbitrária do Tailwind v4 no `brand-panel.tsx` — cor de superfície decorativa
específica da tela, não token global.

### 8. Protótipo Pencil — já ajustado, e o que não portar

- "Esqueci minha senha" (`forgotR`/`forgotT`) removido de `Q54PP`
  (`Desktop - Login`) e `di1u2` (`Desktop - Login (Dark)`) durante a proposta.
- O `toggleBtn` (ícone no canto superior direito do form, `Icon Button/Ghost`) é
  toggle de tema: **não vira código** — sem RF, e o F0 adiou tema de usuário.
  Mantido no `.pen` como referência.
- Números de stats do painel de marca (`500+` / `120+` / `10k+`) são conteúdo
  estático de marketing — copiados como texto fixo, sem fonte de dados.

### 9. Logo (`logo_foodshare.png` do protótipo)

O protótipo referencia `logo_foodshare.png` no `brandTop` do login (selo 80×80
`radius:24`, círculo branco atrás, imagem `mode:fit`) e na `Logo` da topbar
autenticada. O arquivo foi entregue pelo Andre; entra em
`src/assets/logo-foodshare.png` (importado como URL pelo Vite), recortado ao
bounding box da marca + ~6% de margem e centrado num canvas quadrado
transparente (o PNG original tinha muita borda transparente → `object-contain`
renderizaria a marca minúscula).

- **`brand-panel.tsx`**: selo `size-11 rounded-full bg-white p-1.5` com a logo
  (`object-contain`) + wordmark "Food Share" `text-2xl`. Círculo branco (o
  `whiteBg` do protótipo é uma elipse, não quadrado arredondado). O fundo branco
  é necessário: a marca é azul e o painel é azul. `alt=""` — decorativa, o
  wordmark ao lado já nomeia. (O protótipo usa selo 80px / wordmark 36px;
  reduzido a pedido do Andre — ver decisão 10.)
- **`components/layout/topbar.tsx`** (F0): a marca `size-7` entra antes do
  wordmark no link da home. Sem selo branco — a topbar é clara, a marca azul
  contrasta. A topbar do protótipo (`NZsZi`) mostra só a marca; mantido o
  wordmark que o F0 já usava, por clareza.
- **Favicon**: o Andre entregou `logo.ico` (a marca de mãos). Vai para
  `frontend/public/favicon.ico`; `index.html` aponta para ele. O
  `public/favicon.svg` do F0 (forma roxa genérica do template Vite, off-brand)
  é removido.

### 10. Tipografia — passos do Tailwind, não os px do protótipo

Tentativa de transportar os `fontSize` do frame `Q54PP` literalmente (wordmark
36, heroTitle 36, stat 28, loginTitle 28, loginSub 15, stat label 13) — o Andre
achou o resultado grande demais. Revertido: a tela usa os passos padrão do
Tailwind / defaults do shadcn:

| Elemento                          | Classe                                    |
| --------------------------------- | ----------------------------------------- |
| Wordmark da marca                 | `text-2xl font-semibold` · selo `size-11` |
| `heroTitle`                       | `text-4xl font-bold`                      |
| `heroDesc`                        | `text-base`                               |
| Número / rótulo do stat           | `text-2xl font-bold` / `text-xs`          |
| Rodapé © / divisor "ou"           | `text-xs`                                 |
| `loginTitle` "Bem-vindo de volta" | `text-2xl font-semibold`                  |
| `loginSub`                        | `text-sm`                                 |
| Label / input / botões            | defaults do shadcn (`text-sm`)            |

Os px do protótipo eram para um frame de 1280px; numa viewport real com o painel
responsivo (`45%`/`40%`) a escala não bate e os valores ficam grandes.

## Risks / Trade-offs

- **Trocar `--primary` para azul afeta todas as telas** (stubs de feed/pedidos
  do F0 incluídos) → é o efeito desejado (protótipo é azul em tudo); a
  verificação inclui um olhar no `AppShell` para confirmar que nada regrediu de
  contraste (`--primary-foreground #eff6ff` sobre `#1d4ed8` passa AA).
- **`err.status === 401` como gatilho da mensagem de credencial** → se o backend
  algum dia passar a devolver outro status para credencial inválida, a mensagem
  cai no ramo genérico "tente de novo". Aceitável: ainda não vaza nada, e a
  spec `auth/login` fixa o comportamento do backend.
- **`mode: 'onTouched'`** pode marcar "E-mail inválido" enquanto o usuário ainda
  digita o domínio → mitigado pelo revalidate-on-change só depois do primeiro
  blur (comportamento padrão do RHF nesse modo).
- **Build ARM64 no Coolify** → risco herdado do F0 (não subir `vite` /
  `@vitejs/plugin-react`); F1 não mexe em dependências, então o risco é só o de
  sempre. Task de `npm run build` local obrigatória.
- **Gradiente como classe arbitrária** → se o Tailwind v4 no build ARM64
  reclamar de valor arbitrário com vírgulas, cair para `style={{...}}` inline no
  `brand-panel.tsx`. Baixo risco.

## Migration Plan

1. Branch `feat/rf07-login` a partir de `develop` (BRANCHES.md: código do RF
   principal após o tipo).
2. Implementar as tasks; `npm run lint:check` + `npm run build` no `frontend/`.
3. Verificação de ponta a ponta no browser (backend `:3000` + Postgres +
   `npm run dev`) — ver `tasks.md`.
4. PR para `develop`. Sem migração de dados. Rollback = reverter o PR (a
   mudança de tokens é CSS puro; a rota volta ao placeholder).

## Open Questions

Nenhuma que mude specs, abordagem ou o recorte de tasks.
