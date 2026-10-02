## Context

Ver `proposal.md` — "Why". Estado herdado (F0 `frontend-fundacao` + F1
`frontend-login`, ambos em `develop`):

- `AuthProvider` expõe `status`, `user`, `role`, `signIn`, `signOut`.
  Não há método de cadastro — o fluxo é HTTP direto contra os endpoints REST.
- `lib/api` (`api.post`) lança `ApiError` (`status`, `body`, `message`) em
  resposta não-2xx; `credentials: 'include'`.
- `LoginPage` (F1) já implementa: guarda de sessão (`loading` →
  `<FullPageSpinner>`, `authenticated` → `<Navigate>`), layout de painel duplo
  inline, `react-hook-form` + `zodResolver`, `mode: 'onTouched'`, erro de
  servidor num `<Alert variant="destructive">`. O painel de marca é o
  `BrandPanel` (`features/auth/brand-panel.tsx`), estático, `hidden md:flex`.
- `router.tsx`: `/cadastro` renderiza
  `<RoutePlaceholder feature="F2" title="Criar conta" />`. `/login` já aponta
  para `LoginPage`. Ambas são rotas públicas de topo, fora do `AppShell`.
- `components/ui/`: `form`, `input`, `label`, `button`, `alert`, `textarea`,
  `select`, `sonner` (toast) prontos. **Não há** `radio-group` nem componente
  de progresso.
- Backend (imutável nesta change):
  - `POST /establishments` e `POST /beneficiary-entities`, ambos
    `@AllowAnonymous()`, corpo **achatado** (`CreateEstablishmentDto` /
    `CreateBeneficiaryEntityDto`): `name`, `email`, `personalPhone`,
    `password`, `companyName`, `tradeName?`, `cnpj`, `institutionalEmail`,
    `institutionalPhone`, `description`, `address: { postalCode, street,
    number, complement?, city, state }`. DTOs idênticos entre os dois.
  - Sucesso: `201` com o recurso criado (sem senha). **Nenhum `Set-Cookie`** —
    o service chama `auth.api.signUpEmail` internamente mas não repassa os
    headers de sessão na resposta do controller; o browser não recebe cookie.
  - Duplicidade: `409`. Caminho normal (checagem prévia de unicidade):
    `{ message: string, fields: string[] }` com `fields ⊆ { "cnpj",
    "institutionalEmail", "institutionalPhone", "personal" }` — `personal`
    cobre e-mail pessoal e/ou celular pessoal, sem distinguir
    (`mensagem-generica-duplicidade-cadastro`). Caminho de corrida (colisão
    no `signUpEmail`): `409` com `{ message: "CNPJ, email or phone already
    registered." }` e **sem `fields`**.
  - Validação de formato: `400` (`class-validator`) — regex de telefone
    `/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/`, CNPJ
    `/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/`, CEP `/^\d{5}-?\d{3}$/`, UF
    `/^[A-Z]{2}$/`, senha 8–72, `@IsEmail`, `@MaxLength` (name 200,
    companyName 300, tradeName 200, description 2000, street 300, number 10,
    complement 200, city 200).
- Protótipo Pencil: frames `TvMFc` (Tipo de Perfil), `aUJeK` (Dados do CNPJ),
  `8rwFj` (Perfil na plataforma) e as variantes Dark. Rotulam "Etapa X de 4"
  mas só há 3 frames — falta a etapa do responsável.

## Goals / Non-Goals

**Goals:**

- Um wizard `/cadastro` que compõe peças do F0/F1 (nada de infra nova de
  sessão) e cobre RF01–RF04 na camada de apresentação.
- Extrair o `AuthLayout` compartilhado que o F1 adiou, sem regressão visual
  nem funcional do login.
- Fidelidade ao protótipo dentro do recorte MVP, com as 4 etapas alinhadas
  ao DTO real do backend.
- Tratamento de `409` que respeita o critério anti-enumeração do backend
  (institucional explícito, pessoal genérico).

**Non-Goals (nível de design):**

- Refatorar `AuthProvider` / `lib/api` / `ProtectedRoute`.
- Persistir o rascunho do wizard em `sessionStorage` / retomar cadastro
  interrompido (ver decisão 5).
- Consulta de razão social por CNPJ, foto de perfil, auto-login pós-cadastro,
  toggle de tema.
- Tela mobile dedicada (o painel de marca colapsa via `hidden md:flex`, o
  wizard vira coluna única — RNF01 — sem frame próprio no protótipo).

> Máscara de input, autopreenchimento por CEP (ViaCEP) e autocomplete de cidade
> (IBGE) eram Non-Goals na 1ª versão deste design; foram trazidos para o escopo
> a pedido da Maria — decisões 14–16.

## Decisions

### 1. `AuthLayout` compartilhado; `LoginPage` refatorada para usá-lo

Novo `features/auth/auth-layout.tsx`:

```tsx
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh">
      <BrandPanel />
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
```

- `BrandPanel` fica como está (`features/auth/brand-panel.tsx`), renderizado
  pelo layout. Não é absorvido — é reutilizável e já testado no F1.
- `LoginPage` troca o seu `<div className="flex min-h-svh">…</div>` inline por
  `<AuthLayout>…</AuthLayout>`, mantendo **exatamente** o mesmo conteúdo do
  painel direito. É refactor puro de marcação: nenhuma lógica de sessão, form
  ou erro muda. A verificação (tasks) re-roda o E2E de login do F1.
- O wizard precisa de mais largura que o `max-w-sm` do login (campos lado a
  lado em "Cidade / UF"). `AuthLayout` aceita a largura do slot como
  responsabilidade do filho: o wrapper interno usa `max-w-sm`, e a
  `SignUpPage` sobrepõe com uma classe própria (`max-w-md`) OU o `AuthLayout`
  recebe uma prop `contentClassName`. Escolha: **prop `contentClassName`**
  opcional (default `max-w-sm`), para o layout não impor largura fixa.

Alternativa: deixar cada página dona do layout inteiro (o que o F1 fez).
Descartada — é a duplicação que o próprio design do F1 disse para eliminar
"quando existir a segunda tela".

### 2. Estrutura de arquivos — subpasta `features/auth/sign-up/`

```
features/auth/
  auth-layout.tsx          (novo)
  brand-panel.tsx          (inalterado)
  login-page.tsx           (refactor: usa AuthLayout)
  login-schema.ts          (inalterado)
  sign-up/
    sign-up-page.tsx       (rota: guarda, form único, estado de etapa, submit)
    sign-up-schema.ts      (signUpSchema, STEP_FIELDS, SignUpInput)
    sign-up-api.ts         (createEstablishment / createBeneficiaryEntity + tipos)
    profile-type-step.tsx
    institutional-step.tsx
    responsible-step.tsx
    address-step.tsx
    wizard-progress.tsx
```

O F1 manteve `features/auth/` plano por ter só 3 arquivos e disse isso
explicitamente. O F2 traz ~7 — subpasta é mais limpa e bate com
"organização por feature/tela" (`CONVENCOES.md`). O cadastro é concern
distinto da sessão, então **não** entra em `features/auth/api.ts` (que é
`getMe` / `signInEmail` / `signOutRequest`) — ganha `sign-up-api.ts` próprio.

### 3. Um único `useForm` para as 4 etapas; etapa é estado de view

```ts
const form = useForm<SignUpInput>({
  resolver: zodResolver(signUpSchema),
  mode: 'onTouched',
  defaultValues: { profileType: undefined, /* … strings vazias … */ },
});
const [step, setStep] = useState(0); // 0..3
```

- Todos os valores num só form — sem merge manual de rascunho por etapa, sem
  N formulários. Navegar entre etapas é só trocar `step`; os inputs das
  etapas não visíveis continuam montados? **Não** — cada `*-step.tsx` só
  renderiza quando é a etapa atual, mas os valores sobrevivem porque o
  `react-hook-form` guarda o estado fora da árvore React (registro por
  `control`). Campos desmontados mantêm valor (`shouldUnregister: false`, que
  é o default do RHF v7).
- "Continuar": `const ok = await form.trigger(STEP_FIELDS[step])` — valida só
  os campos da etapa; avança `setStep(s => s + 1)` se `ok`.
- "Voltar": `setStep(s => s - 1)`, sem validar.
- Etapa 4, "Finalizar cadastro": `form.handleSubmit(onSubmit)` — revalida o
  schema inteiro (backstop caso `STEP_FIELDS` tenha divergido do schema).

`STEP_FIELDS` mora ao lado do schema, no mesmo arquivo, para não driftar:

```ts
export const STEP_FIELDS = [
  ['profileType'],
  ['companyName', 'tradeName', 'cnpj', 'institutionalEmail', 'institutionalPhone', 'description'],
  ['name', 'email', 'personalPhone', 'password', 'passwordConfirmation'],
  ['postalCode', 'street', 'number', 'complement', 'city', 'state'],
] as const satisfies ReadonlyArray<ReadonlyArray<keyof SignUpInput>>;
```

Alternativa: um `useForm` por etapa + objeto de rascunho em `useState`.
Descartada — mais estado para sincronizar, e o `onSubmit` final teria que
recombinar tudo à mão.

### 4. `signUpSchema` — um shape só, espelhando o `class-validator`

Os dois DTOs do backend são idênticos, então **não** há union discriminada.
`profileType` é só `z.enum(['establishment', 'beneficiary'])` e decide o
endpoint, não o formato.

```ts
const phone = z.string().regex(/^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/, 'Telefone inválido.');

export const signUpSchema = z
  .object({
    profileType: z.enum(['establishment', 'beneficiary'], { error: 'Selecione um perfil.' }),

    companyName: z.string().min(1, 'Informe a razão social.').max(300),
    tradeName: z.string().max(200).optional().or(z.literal('')),
    cnpj: z.string().regex(/^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/, 'CNPJ inválido.'),
    institutionalEmail: z.string().min(1, 'Informe o e-mail institucional.')
      .pipe(z.email({ pattern: z.regexes.html5Email, error: 'E-mail inválido.' })).and(z.string().max(200)),
    institutionalPhone: phone,
    description: z.string().min(1, 'Escreva uma descrição.').max(2000),

    name: z.string().min(1, 'Informe o nome do responsável.').max(200),
    email: z.string().min(1, 'Informe o e-mail de acesso.')
      .pipe(z.email({ pattern: z.regexes.html5Email, error: 'E-mail inválido.' })).and(z.string().max(200)),
    personalPhone: phone,
    password: z.string().min(8, 'Mínimo de 8 caracteres.').max(72, 'Máximo de 72 caracteres.'),
    passwordConfirmation: z.string().min(1, 'Confirme a senha.'),

    postalCode: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido.'),
    street: z.string().min(1, 'Informe o logradouro.').max(300),
    number: z.string().min(1, 'Informe o número.').max(10),
    complement: z.string().max(200).optional().or(z.literal('')),
    city: z.string().min(1, 'Informe a cidade.').max(200),
    state: z.enum(UFS, { error: 'Selecione a UF.' }),
  })
  .refine((v) => v.password === v.passwordConfirmation, {
    path: ['passwordConfirmation'],
    error: 'As senhas não conferem.',
  });
```

- `UFS` = as 27 siglas (`['AC', 'AL', …]`), constante em `sign-up-schema.ts`;
  o `<select>` de UF é populado a partir dela → satisfaz `/^[A-Z]{2}$/` de
  graça.
- `z.email` com o preset `html5Email` (mesma escolha do F1) — regex estrito
  demais poderia barrar e-mail válido. A forma exata de compor `min(1)` +
  `email` + `max(200)` é detalhe de implementação; o que importa é: mensagem
  de "vazio" antes da de "formato", teto de 200.
- `tradeName` / `complement` opcionais: aceitar `''` e enviar `undefined`
  (ver decisão 6).
- **Confirmação de senha é só do frontend** — o backend recebe só `password`.

### 5. Rascunho só em memória — sem `sessionStorage`

O rascunho vive no `react-hook-form` enquanto a `SignUpPage` está montada.
Sair da rota descarta tudo. Motivos:

- O protótipo/`PLANO-FRONTEND` cogitou `sessionStorage`, mas persistir o
  rascunho significa gravar **senha em texto puro** no storage do browser —
  contra o espírito de RNF08. Não vale a pequena conveniência de retomar um
  cadastro abandonado num MVP.
- Se no futuro alguém quiser persistência, o caminho é gravar um subconjunto
  **sem** `password` / `passwordConfirmation` e re-pedir a senha ao retomar.
  Fica registrado, não implementado.

### 6. Montagem do payload e escolha do endpoint

```ts
async function onSubmit(v: SignUpInput) {
  const body = {
    name: v.name, email: v.email, personalPhone: v.personalPhone, password: v.password,
    companyName: v.companyName,
    tradeName: v.tradeName?.trim() ? v.tradeName.trim() : undefined,
    cnpj: v.cnpj, institutionalEmail: v.institutionalEmail,
    institutionalPhone: v.institutionalPhone, description: v.description,
    address: {
      postalCode: v.postalCode, street: v.street, number: v.number,
      complement: v.complement?.trim() ? v.complement.trim() : undefined,
      city: v.city, state: v.state,
    },
  };
  const create = v.profileType === 'establishment' ? createEstablishment : createBeneficiaryEntity;
  // … try/catch — decisão 7
}
```

`sign-up-api.ts`:

```ts
export const createEstablishment = (b: SignUpPayload) => api.post<{ id: number }>('/establishments', b);
export const createBeneficiaryEntity = (b: SignUpPayload) => api.post<{ id: number }>('/beneficiary-entities', b);
```

Só o `201` importa; o tipo de resposta é minimal (`{ id: number }`).

### 7. `409` → mensagens em pt-BR e volta para a etapa do campo

```ts
const FIELD_TO_STEP: Record<string, number> = {
  cnpj: 1, institutionalEmail: 1, institutionalPhone: 1, personal: 2,
};
const FIELD_MESSAGES: Record<string, string> = {
  cnpj: 'Este CNPJ já está cadastrado.',
  institutionalEmail: 'Este e-mail institucional já está cadastrado.',
  institutionalPhone: 'Este celular institucional já está cadastrado.',
};
```

No `catch`:

- `ApiError`, `status === 409`, `body.fields` é array:
  - Para `cnpj` / `institutionalEmail` / `institutionalPhone`: `form.setError`
    no campo homônimo com `FIELD_MESSAGES[...]`.
  - Para `personal`: **não** marca campo (não dá para saber se é o e-mail ou
    o celular, e marcar os dois seria mentira). Em vez disso, seta um
    `dupPersonal = true` que a `responsible-step.tsx` usa para mostrar um
    `<Alert variant="destructive">`: "Um dado pessoal (e-mail ou celular) já
    está cadastrado. Revise os dois campos."
  - `setStep(min(steps apontados))` — leva para a etapa mais atrasada entre
    as apontadas (institucional antes de responsável).
- `ApiError`, `status === 409`, **sem `fields`** (corrida): `<Alert>` no rodapé
  da etapa 4 — "Não foi possível concluir: CNPJ, e-mail ou celular já
  cadastrados. Revise os dados e tente de novo." Sem marcar campo.
- `ApiError`, `status === 400`: não deveria acontecer (o zod espelha o
  backend), mas cai num `<Alert>` genérico na etapa 4 — "Há dados inválidos.
  Revise o formulário." e não avança.
- Qualquer outra falha (rede, 5xx): `<Alert>` neutro — "Não foi possível
  concluir o cadastro. Tente novamente em instantes."

Estado de erro de servidor: `useState` na `SignUpPage`
(`{ kind: 'dup-fields' | 'dup-race' | 'invalid' | 'network', … }`), limpo no
início de cada `onSubmit` e a cada `setStep`.

### 8. Sucesso não emite sessão → redireciona para `/login` com toast

```ts
await create(body);
toast.success('Conta criada! Entre com seu e-mail e senha.');
navigate('/login', { replace: true });
```

O backend não devolve cookie de sessão (ver Context). Tentar `signIn()` logo
depois seria uma segunda requisição não pedida e fora do escopo (auto-login é
Non-Goal). O `/login` já existe e faz o resto. `replace: true` para o cadastro
não ficar no histórico.

Uma task de verificação confirma no browser que, pós-`201`, `GET /me` ainda dá
`401` (nenhuma sessão) — se algum dia o backend passar a emitir cookie, este
design é revisitado.

### 9. Guarda de sessão — igual à `LoginPage`

```
status === 'loading'       → <FullPageSpinner />
status === 'authenticated' → <Navigate to="/feed" replace />
senão                      → <AuthLayout contentClassName="max-w-md"> wizard </AuthLayout>
```

Sem `state.from` aqui (quem chega em `/cadastro` não veio de rota protegida
com intenção de voltar) — destino fixo `/feed`.

### 10. Etapa 1 — `radio-group` em cartões

Adicionar `components/ui/radio-group.tsx` (shadcn padrão, sobre
`@radix-ui/react-radio-group`). A etapa 1 renderiza dois cartões
(`<label>` com `border rounded-lg p-4`, ícone lucide + título + descrição, o
selecionado ganha `border-primary bg-primary/5`), cada um envolvendo um
`<RadioGroupItem value="establishment" | "beneficiary">`. Ícones:
`StoreIcon` e `HeartHandshakeIcon`. Sem `Continuar` desabilitado — o
`form.trigger(['profileType'])` barra o avanço se nada foi escolhido.

Alternativa: dois `<Button variant="outline">` que setam o valor e já
avançam. Descartada — o protótipo mostra seleção + `Continuar` explícito, e
`radio-group` é o primitivo acessível certo (setas do teclado, `aria-checked`).

### 11. Indicador de progresso — componente local, barra segmentada

`wizard-progress.tsx`: 4 segmentos (`<div>` com `h-1 rounded-full`), os
`<= step` em `bg-primary`, o resto em `bg-muted`. É o visual do protótipo
(barra segmentada, não contínua). **Não** adiciona
`@radix-ui/react-progress` — seria dependência nova para um visual que 6
linhas de JSX resolvem. Acima da barra, "Etapa {step+1} de 4" + o título da
etapa atual.

### 12. Campos e componentes por etapa

| Etapa | Campos | Componentes |
| --- | --- | --- |
| 1 Perfil | `profileType` | `radio-group` (cartões) |
| 2 Institucional | `companyName`, `tradeName?`, `cnpj`, `institutionalEmail`, `institutionalPhone`, `description` | `input` × 3; `masked-input` em `cnpj` e `institutionalPhone` (decisão 14); `textarea` (description, `maxLength={2000}`) |
| 3 Responsável | `name`, `email`, `personalPhone`, `password`, `passwordConfirmation` | `input` × 2; `masked-input` em `personalPhone`; `input type="password"` × 2 |
| 4 Endereço | `postalCode`, `street`, `number`, `complement?`, `city`, `state` | `masked-input` (`postalCode`, decisão 14) + ViaCEP no `onBlur` (decisão 15); `input` × 3; `city-autocomplete` (decisão 16); `select` (UF, de `UFS`); "Cidade / UF" lado a lado (`grid grid-cols-[1fr_7rem]`) |

Todos os campos com `<FormField>` / `<FormMessage>` do shadcn. `autoComplete`
apropriado (`organization`, `email`, `tel`, `new-password`, `postal-code`,
`address-line1`, etc.). Rótulos e placeholders em pt-BR do protótipo.

### 13. Rota e navegação de saída

- `router.tsx`: `/cadastro` passa a `<SignUpPage />`; o import de
  `RoutePlaceholder` continua (F3–F8 ainda usam).
- Etapa 1 tem "Já tem uma conta? Entrar" → `<Link to="/login">`.
- `LoginPage` já tem "Criar uma conta" → `/cadastro` (F1). Fica.

### 14. Máscara de input — `@react-input/mask` num `masked-input.tsx`

`src/components/ui/masked-input.tsx`: envelopa o `<Input>` do shadcn com o hook
`useMask` de `@react-input/mask` (lib pura, ~2 kB, mesmo ecossistema headless
das primitivas Radix). Props: `mask`, `replacement`, `modify?`. Faz `forwardRef`
e compõe o ref do RHF com o do hook (o hook precisa do nó `<input>` real).

- `TextField` (helper do wizard) ganha props opcionais `mask` / `replacement` /
  `modify`; quando presentes renderiza `<MaskedInput>` no lugar de `<Input>`.
  Um helper só, sem duplicar o boilerplate de `FormField`.
- Máscaras:
  - **CNPJ**: `mask "__.___.___/____-__"`, `replacement { _: /\d/ }`.
  - **CEP**: `mask "_____-___"`, `replacement { _: /\d/ }`.
  - **Telefone** (10 ou 11 dígitos): `modify` devolve
    `(__) ____-____` até 10 dígitos e `(__) _____-____` a partir de 11 —
    cobre fixo e celular.
- O valor que o RHF guarda é o **mascarado**. Os regex do `signUpSchema`
  (decisão 4) já aceitam com pontuação, então nada muda no schema; ele vira
  backstop (a máscara é quem garante o formato). `toSignUpPayload` (decisão 6)
  manda a string como está — o `class-validator` do backend aceita.

Alternativa: formatadores à mão no `onChange`. Descartada — tratamento de
caret/paste/delete no meio da string é chato de acertar e a lib resolve.

### 15. Autopreenchimento por CEP (ViaCEP)

`src/features/auth/sign-up/viacep.ts`:

```ts
interface ViaCepResult { logradouro: string; localidade: string; uf: string; erro?: true }
export async function lookupCep(cep: string): Promise<ViaCepResult | null> { … }
```

- Só dígitos do CEP; ignora se não tiver 8. `fetch` direto a
  `https://viacep.com.br/ws/${digits}/json/` (público, CORS `*`, sem
  `credentials`). Timeout via `AbortController` (~4 s).
- No `address-step.tsx`, o campo `postalCode` tem `onBlur` que dispara
  `lookupCep`. Estado local `cep: 'idle' | 'loading' | 'notfound'`:
  - `loading` → spinner pequeno dentro do input.
  - sucesso → `form.setValue('street', logradouro, { shouldValidate: true })`,
    `setValue('state', uf, …)` e então dispara o carregamento de municípios
    (decisão 16) e `setValue('city', localidade, …)`. Foco vai para `number`.
  - `erro: true` ou falha de rede → `notfound`: texto discreto ("CEP não
    encontrado, preencha o endereço manualmente"), **não** limpa campos.
- Sobrescreve `street`/`city`/`state` mesmo se já preenchidos — o CEP é a fonte
  de verdade desses três. `number`/`complement` nunca são tocados.

### 16. Autocomplete de cidade (IBGE) — componente próprio, sem `cmdk`

`src/features/auth/sign-up/ibge.ts`:

```ts
const cache = new Map<string, string[]>(); // UF -> nomes de município, ordenados
export async function citiesOf(uf: string): Promise<string[]> { … }
```

- `fetch` a
  `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`
  (público, CORS `*`), mapeia `.map(m => m.nome)`, ordena, guarda no `cache`.
  Chamadas repetidas para a mesma UF saem do cache.

`src/features/auth/sign-up/city-autocomplete.tsx`: **não** usa `cmdk`/`popover`
(dependências novas) — é um `<Input>` (com `field` do RHF) + um `<ul>`
posicionado (`absolute`, `z-…`) com os municípios filtrados pelo que foi
digitado, no máximo ~8 itens. Navegação por teclado (↑/↓/Enter/Esc), clique
seleciona, `onBlur` fecha. Enquanto a UF não estiver escolhida, o campo fica
desabilitado com placeholder "Selecione a UF primeiro". Trocar a UF recarrega a
lista e limpa a cidade.

- **Aceita valor digitado livre** (o backend valida só `maxLength`): se o que o
  ViaCEP devolveu (decisão 15) não casar exatamente com a grafia do IBGE
  (acento/caixa), o valor do ViaCEP fica lá mesmo assim — não força match.
- Substitui o `<Input>` simples de cidade da tabela da decisão 12.

Alternativa: shadcn Combobox (`popover` + `command`/`cmdk`). Descartada — duas
dependências novas para um dropdown que ~40 linhas resolvem, e o projeto
valoriza mínimo de deps (`CONVENCOES.md`).

### 17. Toasts no tema Food Share

`src/components/ui/sonner.tsx`: o `<Toaster>` passa a definir as CSS vars do
sonner para o azul da marca — todo toast (sucesso, erro, info) renderiza com
fundo `--primary` (`#1d4ed8`) e texto/ícones `--primary-foreground` (branco):

```tsx
<Sonner
  toastOptions={{
    style: {
      '--normal-bg': 'var(--primary)',
      '--normal-text': 'var(--primary-foreground)',
      '--normal-border': 'var(--primary)',
    } as React.CSSProperties,
  }}
  {...props}
/>
```

(Nomes exatos das CSS vars conferidos contra a versão instalada do `sonner`
no apply.) `richColors` fica desligado — sem isso o sonner usa `--normal-*`
para todos os tipos.

Trade-off: toast de erro perde o vermelho. Aceito — é o pedido explícito
("todos os toasts no tema"); o texto do toast diz que é erro. Revisitar se
incomodar (dá para manter `toast.error` vermelho com um `classNames` só nele).

### 18. Wizard sem botão `type="submit"` (correção do apply)

Os botões do wizard são **todos** `type="button"`. "Finalizar cadastro" chama
`form.handleSubmit(onSubmit)` no `onClick`; o `<form>` faz
`onSubmit={(e) => e.preventDefault()}`.

Motivo: com "Finalizar" como `type="submit"` num slot JSX que alterna entre
"Continuar" (`type="button"`) e "Finalizar" (`type="submit"`), o React
reaproveita o mesmo nó `<button>` e um clique iniciado em "Continuar" chegava
como `submit` do form — a etapa 4 abria com todos os campos já marcados em erro.
Pego na verificação E2E do apply.

## Risks / Trade-offs

- **Refactor do `AuthLayout` regride o login** → o E2E de login do F1 é
  re-executado na verificação; a extração é marcação pura, sem tocar em
  form/sessão/erro.
- **`STEP_FIELDS` diverge do `signUpSchema`** (campo novo no schema, esquecido
  na lista) → o `handleSubmit` final valida o schema inteiro como backstop, e
  a lista fica no mesmo arquivo do schema. Um teste rápido de "todos os campos
  do schema aparecem em algum `STEP_FIELDS`" pode entrar como task se sobrar
  tempo.
- **`409` com `fields: ["personal"]` não diz qual dado** → banner na etapa do
  responsável pedindo para revisar os dois; é o trade-off que a change
  `mensagem-generica-duplicidade-cadastro` já assumiu de propósito (não vazar
  dado pessoal de terceiro num endpoint público). Custo baixo: a etapa tem só
  2 campos pessoais.
- **`409` de corrida sem `fields`** → banner genérico na etapa 4; raro, e o
  usuário ainda consegue corrigir e reenviar.
- **ViaCEP / IBGE fora do ar ou lentos** → o `fetch` tem timeout; na falha o
  campo continua editável à mão e o cadastro não trava. ViaCEP falhando cai em
  `notfound`; IBGE falhando deixa o autocomplete sem sugestões (input livre).
- **Grafia da cidade ViaCEP ≠ IBGE** (acento/caixa) → o autocomplete aceita o
  valor livre, não força casar com a lista; o backend valida só `maxLength`.
- **Lista de municípios grande** (MG ~850, SP ~645) → renderizar só os ~8
  primeiros resultados filtrados; a lista inteira só vive no `cache` em memória.
- **Toast tudo azul** → toast de erro perde o vermelho (decisão 17); aceito por
  ora, reversível com um `classNames` só no `toast.error`.
- **`modify` da máscara de telefone** (10↔11 dígitos) → se ficar problemático no
  apply, cair para duas máscaras fixas escolhidas pelo primeiro dígito após o
  DDD, ou para um formatador à mão só nesse campo.
- **Senha só em memória** → recarregar a página no meio do cadastro perde
  tudo. Aceito (decisão 5) — persistir senha em storage é pior.
- **Um `useForm` grande** → todos os campos re-validam no `handleSubmit`
  final; com ~18 campos o custo é irrelevante e o RHF só re-renderiza os
  campos com erro.
- **Build ARM64 no Coolify** → risco herdado; deps novas
  (`@radix-ui/react-radio-group`, `@react-input/mask`) são puras, sem binário
  nativo. Task de `npm run build` local obrigatória.

## Migration Plan

1. Branch `feat/rf01-cadastro` a partir de `develop` (BRANCHES.md: código do
   RF principal — RF01 — logo após o tipo; RF02–RF04 cobertos no mesmo PR).
2. Implementar as tasks; `npm run lint:check` (0 warnings) + `npm run build`
   (`tsc -b && vite build`) no `frontend/`.
3. Verificação de ponta a ponta no browser (`playwright-cli`, backend `:3000`
   + Postgres + `npm run dev`) — cadastro de estabelecimento e de entidade,
   erros de validação por etapa, `409` de CNPJ, `409` de dado pessoal,
   redirect para `/login` + toast, login do F1 sem regressão, e as melhorias:
   máscara formata enquanto digita, CEP válido preenche rua/cidade/UF, cidade
   sugere municípios da UF, toast renderiza azul.
4. PR para `develop`. Sem migração de dados. Rollback = reverter o PR: a rota
   `/cadastro` volta ao placeholder e o `AuthLayout` (marcação neutra) volta
   para dentro da `LoginPage`.

## Open Questions

Nenhuma que mude specs, abordagem ou o recorte de tasks. Ficam para o apply,
sem impacto estrutural:

- Texto exato do toast de sucesso e das mensagens de `<Alert>` (ajuste fino
  de copy).
- Se o `<select>` de UF usa as 27 siglas seco ou "SP — São Paulo"; e se
  "Cidade/UF" quebra em duas linhas no mobile ou encolhe o select.
- Mostrar contador de caracteres na `description` (2000) — nice-to-have.
