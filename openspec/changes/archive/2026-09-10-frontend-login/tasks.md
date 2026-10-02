## 1. Tokens de cor (accent Blue)

- [x] 1.1 `frontend/src/styles/index.css`: em `:root` e `.dark`, trocar
      `--primary` → `#1d4ed8`, `--primary-foreground` → `#eff6ff`, `--ring` →
      `#3b82f6` (`:root`) / `#2563eb` (`.dark`). Nenhum outro token muda. Verificar
      com `npm run build` no `frontend/` (sem erro de Tailwind) e abrindo `/feed`
      no dev: o stub e qualquer `Button` default aparecem azuis.

## 2. Schema e painel de marca

- [x] 2.1 `frontend/src/features/auth/login-schema.ts`: `loginSchema` zod
      (`email`: `min(1)` + `z.email({ pattern: html5Email })`; `password`: `min(1)`)
      com mensagens em pt-BR, e `type LoginInput = z.infer<typeof loginSchema>`.
      Verificar: `tsc -b` passa.
- [x] 2.2 `frontend/src/features/auth/brand-panel.tsx`: painel estático da tela
      `Desktop - Login` — gradiente `linear-gradient(180deg,#1d4ed8,#1e3a8a)`, logo
      "Food Share", título "Conectando quem doa com quem precisa", descrição, linha
      de stats (`500+` Estabelecimentos, `120+` Entidades parceiras, `10k+` Doações
      feitas) e rodapé "© 2026 Food Share. Todos os direitos reservados.".
      **Sem** link "Esqueci minha senha", **sem** toggle de tema. Verificar:
      renderiza sem erro no dev e confere visualmente com o screenshot do protótipo.

## 3. Tela de login

- [x] 3.1 `frontend/src/features/auth/login-page.tsx`: guarda de sessão via
      `useAuth().status` — `loading` → `<FullPageSpinner>`; `authenticated` →
      `<Navigate to={from} replace />` (`from = location.state?.from?.pathname ??
'/feed'`); senão renderiza o layout de painel duplo (`<BrandPanel>` +
      formulário), responsivo (uma coluna < md). Verificar: autenticado, abrir
      `/login` redireciona para `/feed`.
- [x] 3.2 Formulário com `react-hook-form` + `zodResolver(loginSchema)`,
      `mode: 'onTouched'`, campos e-mail e senha (`components/ui/form` + `input` +
      `label`), placeholders do protótipo (`seu@email.com`, `Digite sua senha`),
      título "Bem-vindo de volta" + subtítulo. Botão "Entrar" desabilita e vira
      "Entrando…" com `Loader2Icon` enquanto `formState.isSubmitting`. Divisor "ou"
  - botão outline "Criar uma conta" → `/cadastro`. Verificar: submeter vazio
    mostra as mensagens zod por campo; nada é enviado à API.
- [x] 3.3 `onSubmit`: `setFormError(null)`; `await signIn(email, password)` — o
      redirecionamento pós-login fica com a guarda de sessão (3.1). No `catch`:
      `ApiError` com `status === 401` → `setFormError('E-mail ou senha inválidos.')`;
      qualquer outra falha → `setFormError('Não foi possível entrar. Tente novamente
em instantes.')`. Nunca usar `err.message`. Verificar: credencial errada
      mostra a frase única num `<Alert variant="destructive">` acima dos campos, sem
      marcar e-mail nem senha.
- [x] 3.4 Redirecionar para o destino pretendido: entrar a partir de
      `/pedidos` (anônimo → `ProtectedRoute` manda pra `/login`) e, após login,
      cair em `/pedidos`. Verificar esse fluxo no browser.

## 4. Roteamento

- [x] 4.1 `frontend/src/app/router.tsx`: rota `/login` passa a renderizar
      `<LoginPage>` no lugar de `<RoutePlaceholder feature="F1" …>`. Import do
      placeholder some se não houver outro uso (continua usado por F2–F8).
      Verificar: `tsc -b` passa, `/login` monta a tela real.

## 5. Logo, favicon e tipografia do protótipo

- [x] 5.1 `frontend/src/assets/logo-foodshare.png`: o `logo_foodshare.png` do
      protótipo, recortado ao bounding box da marca + ~6% de margem, quadrado
      (transparente). Verificar: `npm run build` empacota o asset.
- [x] 5.2 `brand-panel.tsx`: selo branco **circular** `size-11` com a logo +
      wordmark "Food Share" `text-2xl`, como o `whiteBg` do protótipo (logo azul
      precisa de fundo claro no painel azul). `alt=""` (decorativa, o texto ao lado
      nomeia).
- [x] 5.3 `components/layout/topbar.tsx`: marca (`size-7`) + wordmark no link da
      home. Verificar no browser: logo aparece no login e na topbar do `AppShell`,
      sem erro de console, imagem `complete`.
- [x] 5.4 Favicon: `logo.ico` (entregue pelo Andre) → `frontend/public/favicon.ico`;
      `index.html` aponta para ele; remove o `public/favicon.svg` genérico do F0.
      Verificar: aba do browser mostra a marca de mãos.
- [x] 5.5 Tipografia: `brand-panel.tsx` + `login-page.tsx` ficam nos passos
      padrão do Tailwind / defaults do shadcn (wordmark e loginTitle `text-2xl`,
      heroTitle `text-4xl`, subtítulo `text-sm`, stat `text-2xl`/`text-xs`). Os px
      literais do protótipo (`Q54PP`, frame de 1280px) ficaram grandes demais na
      viewport real — revertido a pedido do Andre. Ver design decisão 10.

## 6. Verificação e fechamento

- [x] 6.1 `frontend/`: `npm run lint:check` (0 warnings) e `npm run build`
      (`tsc -b && vite build`) sem erro.
- [x] 6.2 Verificação de ponta a ponta no browser (`playwright-cli`, backend
      `:3000` + Postgres + `npm run dev`), com um estabelecimento e uma entidade de
      teste criados via API:
  - `/login` anônimo: layout de painel duplo, primário azul, logo no selo
    branco, sem "Esqueci minha senha", sem toggle de tema.
  - Credenciais válidas de estabelecimento → sessão emitida, redireciona para
    `/feed`, topbar do `AppShell` com logo + nav de estabelecimento (RF07).
  - Logout pelo menu do avatar → "Sair" → volta para `/login`, sessão limpa;
    rota protegida volta a redirecionar para `/login` (RF09 — confirmar, sem
    código novo).
  - E-mail não cadastrado, senha errada e (se der para simular) conta excluída:
    todos mostram exatamente "E-mail ou senha inválidos.", sem distinção de
    campo (RF08).
  - Entrar a partir de `/perfil` retorna a `/perfil` após o login.
  - Login como entidade beneficiária → nav de entidade.
  - 0 erros de console na tela de login (os `401` de `/api/me` no bootstrap sem
    sessão são esperados). Dados de teste removidos ao final.
- [x] 6.3 `openspec validate frontend-login --strict` sem erro.
