## 1. Dependências e layout compartilhado

- [x] 1.1 `frontend/`: instalar `@radix-ui/react-radio-group` e criar
      `src/components/ui/radio-group.tsx` (shadcn padrão: `RadioGroup` +
      `RadioGroupItem`). Verificar: `tsc -b` passa, `npm run build` empacota.
- [x] 1.2 `src/features/auth/auth-layout.tsx`: componente `AuthLayout` com o
      painel duplo (`<BrandPanel />` + slot de conteúdo centrado), prop
      opcional `contentClassName` (default `max-w-sm`). Marcação idêntica à que
      está inline hoje na `LoginPage` (design decisão 1).
- [x] 1.3 `src/features/auth/login-page.tsx`: trocar o `<div className="flex
      min-h-svh">…</div>` externo por `<AuthLayout>…</AuthLayout>`, mantendo o
      conteúdo do painel direito sem nenhuma mudança de lógica. Verificar:
      `/login` renderiza visualmente igual ao F1 (screenshot lado a lado) e o
      E2E de login continua verde (ver 7.2).

## 2. Schema, constantes e API

- [x] 2.1 `src/features/auth/sign-up/sign-up-schema.ts`: `UFS` (27 siglas),
      `signUpSchema` (zod, espelhando os regex e `maxLength` do backend —
      design decisão 4), `.refine` de `password === passwordConfirmation` com
      `path: ['passwordConfirmation']`, `type SignUpInput = z.infer<…>`, e
      `STEP_FIELDS` (4 arrays de `keyof SignUpInput`, na mesma ordem das
      etapas). Verificar: `tsc -b` passa; um valor completo válido faz
      `signUpSchema.parse` passar e trocar uma senha faz falhar em
      `passwordConfirmation`.
- [x] 2.2 `src/features/auth/sign-up/sign-up-api.ts`: `type SignUpPayload`
      (corpo achatado + `address` aninhado, `tradeName`/`complement`
      opcionais), `createEstablishment` (`POST /establishments`) e
      `createBeneficiaryEntity` (`POST /beneficiary-entities`), ambos
      `api.post<{ id: number }>`. Verificar: `tsc -b` passa.

## 3. Etapas do wizard

- [x] 3.1 `src/features/auth/sign-up/profile-type-step.tsx`: `radio-group` com
      dois cartões (`Estabelecimento` / `Entidade beneficiária`), ícone lucide
      (`StoreIcon` / `HeartHandshakeIcon`), título + descrição do protótipo,
      cartão selecionado com `border-primary bg-primary/5`. `<FormField
      name="profileType">` + `<FormMessage />`. Link "Já tem uma conta?
      Entrar" → `/login`.
- [x] 3.2 `src/features/auth/sign-up/institutional-step.tsx`: campos
      `companyName`, `tradeName` (opcional), `cnpj`, `institutionalEmail`,
      `institutionalPhone`, `description` (`textarea`, `maxLength={2000}`).
      `<FormField>`/`<FormMessage>` em cada, `autoComplete` apropriado,
      placeholders pt-BR do protótipo.
- [x] 3.3 `src/features/auth/sign-up/responsible-step.tsx`: campos `name`,
      `email`, `personalPhone`, `password`, `passwordConfirmation` (dois
      `type="password"`, `autoComplete="new-password"`). Aceitar prop
      `dupPersonal: boolean` que, quando `true`, renderiza um `<Alert
      variant="destructive">` acima dos campos: "Um dado pessoal (e-mail ou
      celular) já está cadastrado. Revise os dois campos."
- [x] 3.4 `src/features/auth/sign-up/address-step.tsx`: campos `postalCode`,
      `street`, `number`, `complement` (opcional), `city`, `state`
      (`<select>` populado de `UFS`). "Cidade / UF" lado a lado
      (`grid grid-cols-[1fr_6rem] gap-3`).
- [x] 3.5 `src/features/auth/sign-up/wizard-progress.tsx`: barra de 4
      segmentos (`h-1 rounded-full`, `<= step` em `bg-primary`, resto em
      `bg-muted`) + "Etapa {step+1} de 4" + título da etapa atual.

## 4. Página do wizard

- [x] 4.1 `src/features/auth/sign-up/sign-up-page.tsx`: guarda de sessão
      (`loading` → `<FullPageSpinner>`, `authenticated` → `<Navigate
      to="/feed" replace>`); `useForm<SignUpInput>` (`zodResolver`,
      `mode: 'onTouched'`, `defaultValues` com strings vazias e
      `profileType: undefined`); `useState` de `step` (0–3); render dentro de
      `<AuthLayout contentClassName="max-w-md">` com `<WizardProgress>` + a
      etapa atual + botões "Voltar" (oculto na etapa 0) / "Continuar"
      (etapas 0–2) / "Finalizar cadastro" (etapa 3).
- [x] 4.2 Navegação: "Continuar" → `await form.trigger(STEP_FIELDS[step])`,
      avança só se `true`; "Voltar" → `setStep(s => s - 1)` sem validar;
      limpar o erro de servidor a cada `setStep`. Verificar: submeter etapa
      vazia mostra as mensagens zod por campo e não avança; nada vai para a
      API.
- [x] 4.3 `onSubmit` (etapa 3, `form.handleSubmit`): montar `SignUpPayload`
      (`tradeName`/`complement` vazios → `undefined`, `trim`), escolher
      `createEstablishment` vs `createBeneficiaryEntity` por
      `values.profileType`, `await` o `POST`; em sucesso
      `toast.success('Conta criada! Entre com seu e-mail e senha.')` +
      `navigate('/login', { replace: true })`.
- [x] 4.4 Tratamento de erro no `catch` (design decisão 7): estado
      `serverError` na página + `dupPersonal` derivado.
  - `ApiError` `409` com `body.fields` array: `form.setError` em `cnpj` /
    `institutionalEmail` / `institutionalPhone` (mensagens de `FIELD_MESSAGES`);
    `personal` → `dupPersonal = true`; `setStep` para a menor etapa apontada
    (`FIELD_TO_STEP`).
  - `409` sem `fields`: `<Alert>` na etapa 4 — "Não foi possível concluir:
    CNPJ, e-mail ou celular já cadastrados. Revise os dados e tente de novo."
  - `400`: `<Alert>` genérico "Há dados inválidos. Revise o formulário."
  - rede / `5xx`: `<Alert>` "Não foi possível concluir o cadastro. Tente
    novamente em instantes."

## 5. Roteamento

- [x] 5.1 `src/app/router.tsx`: rota `/cadastro` passa a renderizar
      `<SignUpPage />` no lugar de `<RoutePlaceholder feature="F2" …>`. O
      import de `RoutePlaceholder` permanece (F3–F8). Verificar: `tsc -b`
      passa, `/cadastro` monta o wizard.

## 6. Ajustes no protótipo Pencil

- [ ] 6.1 `~/IFSP/Downloads/updated/pencil-design-apresentacao.pen`, nos
      frames de cadastro (light **e** dark — `TvMFc`, `aUJeK`, `8rwFj` e
      variantes): remover a etapa "Categorias de alimentos", o campo "Nome de
      perfil" e a etapa "Foto de perfil"; separar "Rua, número, complemento"
      em três campos e tirar o endereço duplicado; trocar "ConectaFood" por
      "Food Share"; conferir que o rótulo "Etapa X de 4" cobre as 4 etapas
      reais (perfil / institucional / responsável / endereço); adicionar a
      etapa faltante "Dados do responsável". O toggle de tema não vira código.
  - **Decisão (Maria): não sincronizar.** Só "ConectaFood" → "Food Share" foi
    aplicado (`8rwFj` light + `IGtaI`/`WnpJd` dark). A restruturação multi-frame
    (adicionar etapa "Dados do responsável", separar campos de endereço, remover
    categorias/foto/nome-de-perfil) **não será feita** — o código é a fonte da
    verdade e cobre RF01–RF04. Divergência registrada em `docs/PLANO-FRONTEND.md`
    (seção F2).

## 7. Verificação e fechamento

- [x] 7.1 `frontend/`: `npm run lint:check` (0 warnings) e `npm run build`
      (`tsc -b && vite build`) sem erro.
- [x] 7.2 Verificação de ponta a ponta no browser (`playwright-cli`, backend
      `:3000` + Postgres + `npm run dev`):
  - `/cadastro` anônimo: painel de marca à esquerda, wizard à direita,
    "Etapa 1 de 4", sem "Categorias", sem "Foto de perfil", sem toggle de tema.
  - Cadastro de **estabelecimento** com dados válidos → `201`, toast de
    sucesso, redireciona para `/login`; `GET /me` ainda `401` (sem sessão);
    login em seguida com as credenciais criadas entra normal (RF01).
  - Cadastro de **entidade beneficiária** análogo (RF03).
  - Validação por etapa: campos vazios / CNPJ com dígitos a menos / UF não
    selecionada / senhas diferentes bloqueiam o "Continuar"/"Finalizar" com a
    mensagem certa por campo (RNF06).
  - Reenviar um CNPJ já cadastrado → volta para a etapa 2 com "Este CNPJ já
    está cadastrado." no campo (RF02).
  - Reenviar um e-mail pessoal já cadastrado → volta para a etapa 3 com o
    `<Alert>` genérico de dado pessoal, **sem** dizer se foi e-mail ou celular
    (RF02/RF04 + `mensagem-generica-duplicidade-cadastro`).
  - `/login` sem regressão visual nem funcional (RF07–RF09) após o refactor
    do `AuthLayout`.
  - 0 erros de console no wizard. Dados de teste removidos ao final.
  - **Resultado:** todos os cenários acima verificados no browser. Achado e
    corrigido durante o apply: clicar "Continuar" disparava o `submit` do form
    (o slot de botão alternava `type="button"`/`type="submit"` reaproveitando o
    mesmo nó `<button>`), o que fazia a etapa 4 abrir com todos os campos já em
    erro. Corrigido: nenhum botão é `type="submit"`; "Finalizar cadastro" chama
    `form.handleSubmit` no `onClick` e o `<form>` faz `preventDefault`.
    Usuários de teste (`@ex.com` / `@exemplo.com` / `@teste-e2e.com` etc.)
    removidos do banco de dev via `prisma db execute` (linhas `address`
    órfãs — poucas — deixadas; `prisma migrate reset` limpa tudo).
- [x] 7.3 `openspec validate frontend-cadastro --strict` sem erro.

## 8. Melhorias de entrada de dados (máscara, ViaCEP, cidade, toast)

- [x] 8.1 `frontend/`: instalar `@react-input/mask`; criar
      `src/components/ui/masked-input.tsx` — `<Input>` do shadcn + `useMask`
      (`mask` / `replacement` / `modify`), `forwardRef` compondo o ref do RHF
      com o do hook. Verificar: `tsc -b` passa.
- [x] 8.2 `src/features/auth/sign-up/text-field.tsx`: props opcionais `mask` /
      `replacement` / `modify`; quando presentes renderiza `<MaskedInput>` no
      lugar de `<Input>`.
- [x] 8.3 Aplicar máscara nos campos (design decisão 14): `cnpj`
      (`__.___.___/____-__`) e `institutionalPhone` no `institutional-step.tsx`;
      `personalPhone` no `responsible-step.tsx`; `postalCode` no
      `address-step.tsx`. Telefone com `modify` dinâmico 10↔11 dígitos.
      Verificar no browser: digitar só números formata; o valor mascarado passa
      no zod e o `POST` continua `201`.
- [x] 8.4 `src/features/auth/sign-up/viacep.ts`: `lookupCep(cep)` →
      `fetch https://viacep.com.br/ws/{8dígitos}/json/` com `AbortController`
      (~4 s); devolve `{ logradouro, localidade, uf }` ou `null`
      (`{ erro: true }` / falha).
- [x] 8.5 `address-step.tsx`: `onBlur` do `postalCode` chama `lookupCep`; estado
      `cep: 'idle'|'loading'|'notfound'` (spinner no input; texto discreto em
      `notfound`, sem limpar campos). Sucesso → `setValue` em `street`/`state`,
      carrega municípios da UF (8.7), `setValue` em `city`, foco em `number`.
      Verificar: CEP real preenche os 3 campos; CEP inexistente mostra a dica.
- [x] 8.6 `src/features/auth/sign-up/ibge.ts`: `citiesOf(uf)` →
      `fetch .../localidades/estados/{uf}/municipios`, `.map(m => m.nome)`
      ordenado, `cache` em `Map<uf, string[]>`.
- [x] 8.7 `src/features/auth/sign-up/city-autocomplete.tsx`: `<Input>` (com
      `field` do RHF) + `<ul>` posicionado com até ~8 municípios filtrados;
      teclado ↑/↓/Enter/Esc, clique seleciona, `onBlur` fecha; desabilitado
      sem UF; trocar UF recarrega e limpa a cidade; **aceita valor livre**.
      Trocar o `<Input>` de cidade do `address-step.tsx` por este componente.
      Verificar: escolher UF → digitar filtra a lista → selecionar preenche.
- [x] 8.8 `src/components/ui/sonner.tsx`: `<Toaster>` com as CSS vars do sonner
      apontando para `--primary` / `--primary-foreground` (nomes exatos
      conferidos contra a versão instalada). `richColors` desligado. Verificar
      no browser: o toast de sucesso do cadastro renderiza azul com texto/ícone
      branco.
- [x] 8.9 `frontend/`: `npm run lint:check` (0 warnings) + `npm run build` sem
      erro; `openspec validate frontend-cadastro --strict`.
  - **Resultado:** verificado no browser (`playwright-cli`) — CNPJ e telefone
    (fixo e celular, `modify` dinâmico 10↔11 dígitos) formatam ao digitar; CEP
    válido preenche rua/cidade/UF via ViaCEP e foca `number`; CEP inexistente
    mostra "CEP não encontrado"; cidade sugere municípios da UF (IBGE) e aceita
    seleção; toast de sucesso renderiza `bg #1d4ed8` / texto `#eff6ff`; fluxo
    completo de estabelecimento e de entidade → `201` → `/login`; login com as
    credenciais criadas continua OK. Achados e corrigidos durante o apply:
    (1) `MaskedInput` controlado (`value` do RHF) perdia caracteres em digitação
    rápida/`fill` em lote — virou **não controlado** (`defaultValue` + `onChange`
    reporta o valor mascarado); (2) no CEP, o `<FormControl>` envolvia um
    `<div>` (não o input), então o rótulo não associava ao campo — `FormControl`
    passou a envolver o `MaskedInput` diretamente, com o spinner fora; (3)
    `form.watch('state')` via `useFormContext` não é reativo em componente
    filho — trocado por `useWatch({ control, name: 'state' })`, o que também
    corrigiu o autocomplete de cidade ficar preso em `disabled`.
