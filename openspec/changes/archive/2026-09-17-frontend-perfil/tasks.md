## 1. Backend — leitura do próprio cadastro (RF05 pré-requisito)

- [x] 1.1 `backend/src/establishments/establishments.service.ts`: método
      `findMe(userId)` — busca `establishment` por `userId` (`include: { user, address }`),
      `NotFoundException` se não existir, retorna via `toResponse` (mesmo
      método privado do `update`). Verificar: `npm test` do módulo passa.
- [x] 1.2 `backend/src/establishments/establishments.controller.ts`: `@Get('me')`
      antes do `@Patch('me')`, `@ApiOperation` ("Consulta do próprio cadastro"),
      `@ApiOkResponse({ type: EstablishmentResponseDto })`,
      `@ApiNotFoundResponse`. Chama `establishmentsService.findMe(Number(session.user.id))`.
- [x] 1.3 Repetir 1.1–1.2 para `beneficiary-entities` (`findMe` no service,
      `@Get('me')` no controller).
- [x] 1.4 Verificação manual (curl): `GET /establishments/me` e
      `GET /beneficiary-entities/me` autenticados retornam o cadastro sem senha
      (`200`); sem sessão retorna `401`; sessão de estabelecimento contra
      `/beneficiary-entities/me` retorna `404` ("Beneficiary entity not found.").
      Testado contra o backend real rodando em `localhost:3000` (Postgres em
      `localhost:5433`), com duas contas de teste criadas via `POST /establishments`
      e `POST /beneficiary-entities`.

## 2. Extração de constantes e utilitários compartilhados (design decisões 6–7)

- [x] 2.1 `frontend/src/lib/validation.ts`: mover `PHONE_REGEX` (como
      `PHONE_REGEX`), criar `POSTAL_CODE_REGEX`, mover `UFS` de
      `sign-up-schema.ts` para cá. Adicionado também `UF_REGEX` (mesma
      necessidade nos dois schemas, mesmo racional).
- [x] 2.2 `sign-up-schema.ts`: importar `PHONE_REGEX`/`POSTAL_CODE_REGEX`/`UF_REGEX`/`UFS`
      de `lib/validation.ts` em vez de defini-los; remover as definições locais
      (`CNPJ_RE` continua local — só o cadastro usa CNPJ). Verificar: `tsc -b`
      passa, nenhum comportamento de validação muda.
- [x] 2.3 Mover `frontend/src/features/auth/sign-up/viacep.ts` →
      `frontend/src/lib/viacep.ts` e `ibge.ts` → `frontend/src/lib/ibge.ts`
      (conteúdo idêntico, só o caminho muda).
  - **Extra (descoberto no apply)**: `masks.ts` (CNPJ/CEP/telefone) tinha o
    mesmo problema — é puro, sem acoplamento a `SignUpInput`, e o perfil
    precisa de `CEP_MASK`/`PHONE_MASK`/`phoneModify`. Movido também para
    `frontend/src/lib/masks.ts`, mesmo racional da decisão 6/7 do design (não
    listado lá por omissão). `institutional-step.tsx` e `responsible-step.tsx`
    atualizados para importar de `@/lib/masks`.
- [x] 2.4 Mover `frontend/src/features/auth/sign-up/city-autocomplete.tsx` →
      `frontend/src/components/city-autocomplete.tsx`.
  - **Ajuste em relação ao design**: o componente original importava
    `SignUpInput` e chamava `useFormContext<SignUpInput>()` internamente —
    acoplado ao schema do cadastro, não reutilizável como estava por
    `ProfileFormInput` (schema diferente). Decoupled: agora recebe
    `value`/`onChange`/`onBlur`/`name`/`inputRef` como props e o `<FormField>`
    fica por conta de quem chama (mesmo padrão que o campo de CEP já usava em
    `address-step.tsx`). Lógica interna (busca de municípios, filtro, teclado,
    `useEffect` por UF) idêntica — só a integração com o form mudou de lugar.
- [x] 2.5 `frontend/src/features/auth/sign-up/address-step.tsx`: atualizar
      imports para os novos caminhos e envolver `CityAutocomplete` no próprio
      `<FormField name="city">` (ver ajuste acima). Verificado: `tsc -b` passa.
- [x] 2.6 Verificação no browser (`playwright-cli`): fluxo de cadastro do F2
      sem regressão — CEP válido preenche rua/cidade/UF, cidade sugere
      municípios da UF, CNPJ/telefone/CEP mascaram ao digitar. Testado
      completo: cadastro de estabelecimento de ponta a ponta (etapas 1–4),
      CNPJ e celular institucional mascarando ao digitar, CEP real (`01310-100`)
      preenchendo logradouro/cidade/UF via ViaCEP+IBGE, `Finalizar cadastro` →
      `201` → redirect para `/login`. 0 erros de console (fora os `401` já
      esperados de `GET /me` sem sessão).

## 3. API e schema do perfil

- [x] 3.1 `frontend/src/features/profile/profile-api.ts`: `type ProfileResponse`
      (espelha `EstablishmentResponseDto`/`BeneficiaryEntityResponseDto` — são
      idênticos), `getMyProfile(role)` (`GET /establishments/me` ou
      `/beneficiary-entities/me`), `updateMyProfile(role, payload)` (`PATCH`
      no mesmo endpoint conforme `role`).
- [x] 3.2 `frontend/src/features/profile/profile-schema.ts`: `profileSchema`
      (zod) só com os campos editáveis (`personalPhone`, `institutionalPhone`,
      `institutionalEmail`, `image` opcional, `description`, `postalCode`,
      `street`, `number`, `complement` opcional, `city`, `state`), usando
      `PHONE_REGEX`/`POSTAL_CODE_REGEX`/`UF_REGEX` de `lib/validation.ts`;
      `type ProfileFormInput`; `mapResponseToFormValues(data: ProfileResponse)`.

## 4. Componentes da tela

- [x] 4.1 `frontend/src/features/profile/profile-view.tsx`: cartões somente
      leitura (fiel ao protótipo `huKcK`) — cabeçalho com avatar (iniciais,
      mesmo padrão do `UserMenu`, ou a imagem quando `user.image` existe),
      nome/razão social, botão "Editar perfil"; cartão "Dados Institucionais"
      (razão social, nome fantasia, CNPJ, e-mail e celular institucionais) e
      "Contato do responsável" (nome, e-mail pessoal — RF06 — e celular
      pessoal); cartão de endereço; cartão de descrição.
- [x] 4.2 `frontend/src/features/profile/profile-form.tsx`: mesmo agrupamento
      do `profile-view`, mas os campos editáveis viram `<FormField>` do
      `react-hook-form` (`personalPhone`, `institutionalPhone`,
      `institutionalEmail` com `masked-input` em telefones; `image` como
      `<Input>` de URL; `description` como `<Textarea maxLength={2000}>`;
      endereço com `masked-input` de CEP + ViaCEP no `onBlur` + `city-autocomplete`
      + `<select>` de UF). `email`, `cnpj`, `companyName`, `tradeName`, `name`
      continuam `<Input disabled readOnly>` fora do `useForm` (design decisão 4).
      Botões "Salvar alterações" / "Cancelar".
- [x] 4.3 `frontend/src/features/profile/profile-page.tsx`: `useQuery(['profile', role], () => getMyProfile(role!))`
      (`enabled: role !== null`); `useState<'view'|'edit'>('view')`;
      `useForm<ProfileFormInput>({ resolver: zodResolver(profileSchema), mode: 'onTouched' })`;
      `useMutation` para o `PATCH`. Renderiza alerta se `role === null`,
      `<Skeleton>` enquanto `query.isLoading`, `<Alert>` de erro em
      `query.isError`, senão `profile-view` (modo `view`) ou `profile-form`
      (modo `edit`).
- [x] 4.4 "Editar perfil" → `form.reset(mapResponseToFormValues(query.data))` +
      `setMode('edit')`. "Cancelar" → `form.reset(mapResponseToFormValues(query.data))`
      + `setMode('view')`, sem chamar a API.
- [x] 4.5 `onSubmit` (design decisão 5): monta o payload com endereço sempre
      completo, chama a mutation; sucesso → `queryClient.setQueryData` com a
      resposta do `PATCH`, `toast.success('Perfil atualizado.')`, `setMode('view')`.
- [x] 4.6 Tratamento de erro do `PATCH` (design decisão 9): `409` com `fields`
      → `form.setError` no campo apontado (`institutionalEmail`/`institutionalPhone`/`personalPhone`
      para `personal`) com "Este campo já está em uso por outro cadastro.";
      `400` → `<Alert>` "Há dados inválidos. Revise o formulário."; rede/`5xx`
      → `<Alert>` "Não foi possível salvar. Tente novamente em instantes.".
      Erro não sai do modo `edit`.

## 5. Roteamento

- [x] 5.1 `frontend/src/app/router.tsx`: rota `/perfil` passa a renderizar
      `<ProfilePage />` no lugar de `<RoutePlaceholder feature="F3" …>`.
      Verificado: `tsc -b` passa.

## 6. Verificação e fechamento

- [x] 6.1 `frontend/`: `npm run lint:check` (0 warnings) e `npm run build`
      (`tsc -b && vite build`) sem erro.
- [x] 6.2 `backend/`: suíte de testes do módulo (`npx jest establishments
      beneficiary-entities`) — 38/38 passam.
- [x] 6.3 Verificação de ponta a ponta no browser (`playwright-cli`, backend
      `:3000` + Postgres + `npm run dev`), para uma conta de **estabelecimento**
      e uma de **entidade beneficiária** (criadas via `POST /establishments` /
      `POST /beneficiary-entities`, removidas ao final):
  - `/perfil` abre em modo visualização com os dados reais da conta logada,
    para os dois papéis. ✅
  - "Editar perfil" abre o formulário pré-preenchido; e-mail pessoal, CNPJ e
    razão social continuam somente leitura (RF06). ✅
  - Editado o celular institucional e salvo → volta para visualização com o
    novo valor. ✅ (toast não capturado no snapshot por timing, mas a
    persistência foi confirmada pelo valor atualizado)
  - "Cancelar" no meio de uma edição (descrição alterada) descarta a mudança e
    volta para visualização com o dado original. ✅
  - Editado o celular pessoal para um valor já usado por outra conta (a
    entidade de teste) → `409`, "Este celular pessoal já está em uso por outro
    cadastro." no campo, `[invalid]`, permanece em modo edição. ✅ (celular
    institucional só colide contra outros *estabelecimentos* — comportamento
    do backend herdado, não alterado por esta change — então o primeiro teste
    com esse campo não gerou 409; o teste foi refeito com celular pessoal, que
    é checado globalmente contra `User.personalPhone`.)
  - Fluxo de cadastro (F2) sem regressão — ver 2.6. ✅
  - 0 erros de console em todos os passos (fora os `401` esperados de sessões
    anônimas). Dados de teste (3 usuários, 2 estabelecimentos/entidades,
    2 endereços) removidos via script `prisma`+`tsx` ao final.
  - **Achado durante a verificação — bug real, corrigido**: ao entrar em modo
    de edição com um telefone de 11 dígitos já salvo (celular, não fixo), o
    `@react-input/mask` lançava erro no mount ("initialized value ... longer
    than ... mask") porque a `mask` estática (`PHONE_MASK`, 10 dígitos) não
    batia com o `defaultValue` de 11 dígitos vindo do backend — o `modify`
    dinâmico só ajusta a mask durante a digitação, nunca no valor inicial.
    Corrigido com `phoneMaskFor(value)` (novo em `lib/masks.ts`), que escolhe
    a mask certa a partir do próprio valor carregado; `profile-form.tsx` calcula
    essa mask uma vez a partir de `data` (estável durante a edição), nunca de
    `field.value` (mudaria a cada tecla e brigaria com o `modify`).
- [x] 6.4 `openspec validate frontend-perfil --strict` sem erro.

## 7. Fidelidade visual ao protótipo Pencil (correções pedidas durante a verificação)

Durante a verificação em browser, a Maria revisou a tela `/perfil` renderizada
contra o protótipo Pencil e pediu conferência 1:1 completa de cores — não só
nesta tela, mas também em login/cadastro (F0/F1/F2, já arquivados), já que o
`Topbar`/`UserMenu` são compartilhados por todas as rotas autenticadas. Todas
as correções abaixo foram verificadas contra os valores reais do `.pen`
(`Get`/`GetVariables` via MCP `pencil`, não só inspeção visual) e contra
`frontend/src/styles/index.css` (tokens já existentes desde o F1 — nenhuma
variável nova foi necessária: `--primary: #1d4ed8` / `--primary-foreground: #eff6ff`
já eram os valores exatos do Pencil).

- [x] 7.1 `components/layout/nav-items.ts`: label do item de navegação "Meu
      perfil" → "Perfil" (texto exato do nó `label` no Pencil, frame `nurMB`/`Ul33i`).
- [x] 7.2 `components/layout/topbar.tsx`:
  - Removido o texto "Food Share" ao lado do logo — o nó `Logo` do Pencil
    (`q0apzX`/`IqE0q`) só tem `logoIcon`+`logoImg`, sem texto nenhum; era
    herança do F0 nunca conferida contra o protótipo.
  - Item de nav ativo: `bg-accent text-accent-foreground` (cinza) →
    `bg-primary-foreground text-primary` (chip `#eff6ff`/`#1d4ed8` exato do
    nó `nav-Perfil`, que usava fundo sólido, não opacidade).
  - Hover do item ativo: herdava o hover cinza genérico do inativo (`hover:bg-accent`).
    Adicionado `hover:bg-primary/15` só para o estado ativo (interação não
    modelada no protótipo estático; decisão de manter a identidade azul e
    intensificá-la, a pedido da Maria).
- [x] 7.3 `components/layout/user-menu.tsx`: avatar do menu (trigger)
      `bg-secondary text-secondary-foreground` (cinza) → `bg-primary
      text-primary-foreground` (`#1d4ed8`/`#eff6ff`, igual ao nó `Avatar` do
      Topbar no Pencil); item "Meu perfil" → "Perfil" (consistência com 7.1).
- [x] 7.4 `features/profile/profile-view.tsx` / `profile-form.tsx`: mesmo
      avatar azul (era `bg-secondary`); adicionado badge de tipo de conta
      ("Estabelecimento"/"Entidade beneficiária", chip `bg-primary-foreground
      text-primary` — cor exata do nó `Type Badge` no Pencil, ausente na
      primeira versão) e localização (cidade/UF com ícone, nó `Meta Row` do
      Pencil); campos travados (RF06) ganharam ícone de cadeado (`LockIcon`)
      + cor `text-muted-foreground` no valor, como o Pencil faz nos nós
      `value-row` com `lockIcon` (na primeira implementação os campos travados
      não se distinguiam visualmente dos editáveis).
- [x] 7.5 `features/auth/brand-panel.tsx` (login, tela pública — mesmo painel
      reaproveitado no cadastro): duas opacidades de branco não batiam com o
      hex exato do Pencil — `text-white/70` (labels das estatísticas) → o nó
      `statLabel` usa `#ffffffaa` (66,7%, não 70%); `text-white/60` (copyright)
      → o nó `brandBottom` usa `#ffffff66` (40%, não 60%). Corrigido com cor
      arbitrária exata (`text-[#ffffffaa]` / `text-[#ffffff66]`) em vez de
      aproximar por fração do Tailwind. O restante do painel (gradiente
      `#1d4ed8`→`#1e3a8a`, `heroDesc` em `text-white/80` = `#ffffffcc` exato)
      já batia.
- [x] 7.6 `features/auth/sign-up/wizard-progress.tsx`: segmento inativo da
      barra de progresso `bg-muted` (`#f5f5f5`) → `bg-border` (`#e5e5e5`,
      valor real do nó `prog2`/`p2b`/`p2c` no Pencil — cores parecidas mas
      diferentes).
- [x] 7.7 `features/auth/sign-up/profile-type-step.tsx`: cartão de perfil
      selecionado (etapa 1) usava opacidade (`bg-primary/5`) — Pencil usa
      fundo sólido `#eff6ff` (nó `cEstab`), igual ao chip do nav; corrigido
      para `bg-primary-foreground`. Ícone dentro do círculo selecionado:
      `text-primary-foreground` (`#eff6ff`) → `text-white` (`#ffffff` puro,
      valor exato do nó `eIcn`) — único lugar do design system onde ícone e
      texto de "conteúdo sobre fundo primary" divergem no Pencil (~1% de
      diferença de luminosidade; mantido fiel ao valor literal a pedido da Maria).
- [x] 7.8 Verificado no browser (sessão `playwright-cli` separada, sem afetar
      a sessão logada dos testes 6.3): `/login` e `/cadastro` (etapa 1, com
      "Estabelecimento" selecionado) batem visualmente com o protótipo —
      screenshot comparado com `Get`/`GetVariables` do `.pen`. `tsc -b` e
      `npm run lint:check` (frontend) sem erro após cada rodada de correção.
  - **Fora do escopo desta verificação** (não confirmado; mencionar caso vire
    pedido): textos das etapas 2–3 do cadastro divergem do protótipo ("Dados
    institucionais"/"Dados do responsável" no código vs. "Dados do CNPJ"/"Acesso"
    no Pencil) — já é divergência aceita e documentada no design do F2 (código
    é fonte de verdade); não mexido aqui por não ser pedido de cor.
