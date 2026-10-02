## Context

Ver `proposal.md` — "Why". Estado herdado relevante:

- Backend já tem `PATCH /establishments/me` e `PATCH /beneficiary-entities/me`
  (specs `estabelecimentos/edicao-cadastro`, `entidades-beneficiarias/edicao-cadastro`),
  DTOs de edição whitelisted (`personalPhone`, `institutionalPhone`,
  `institutionalEmail`, `image`, `description`, `address` completo), resposta
  `EstablishmentResponseDto` / `BeneficiaryEntityResponseDto` (dados
  institucionais + `user` + `address`, sem senha). **Não existe `GET` equivalente**
  — gap que esta change fecha.
- `router.tsx`: `/perfil` renderiza `<RoutePlaceholder feature="F3" title="Meu perfil" />`,
  já dentro de `<ProtectedRoute>` + `<AppShell>` — a página não precisa de guarda
  de sessão própria (diferente de `LoginPage`/`SignUpPage`, que são rotas públicas).
- `UserMenu` já tem o item "Meu perfil" apontando para `/perfil` — nenhuma
  mudança de navegação necessária.
- `useAuth()` expõe `user: SessionUser`, `role: 'establishment' | 'beneficiary' | null`.
- Protótipo Pencil, frame `huKcK` (`Desktop - Meu Perfil`): cabeçalho com avatar
  (iniciais), nome da instituição e botão **"Editar perfil"** com ícone de lápis;
  abaixo, dois cartões lado a lado — "Dados Institucionais" (razão social, nome
  fantasia, CNPJ) e "Contato do Responsável" (nome, celular, e-mail). O botão
  "Editar perfil" indica que a tela abre em **modo de visualização** e alterna
  para edição — não é um form sempre aberto. Confirmado via screenshot do frame
  (`get_screenshot`, node `huKcK`) durante o planejamento desta change.
- Peças reaproveitáveis do F2 (`features/auth/sign-up/`), hoje só usadas lá:
  `masked-input` (já em `components/ui/`, compartilhado), `viacep.ts`
  (`lookupCep`), `ibge.ts` (`citiesOf`, com cache em memória), `city-autocomplete.tsx`.
  A F3 precisa dos mesmos três últimos — hoje vivem dentro da feature `sign-up`,
  o que os torna um import cross-feature estranho se usados direto de lá.
- Regras de formato dos campos (regex de telefone/CEP, lista de UFs) hoje só
  existem dentro de `sign-up-schema.ts`, sem exportação própria além de `UFS`.
- Memória de sessões anteriores relevante aqui: `form.watch()` não é reativo
  dentro de um componente filho que usa `useFormContext` — `city-autocomplete.tsx`
  já usa `useWatch({ control, name })` (correção feita no F2); a relocação
  desta change carrega essa correção de graça, sem reescrevê-la.

## Goals / Non-Goals

**Goals:**

- Tela `/perfil` com alternância visualização/edição fiel ao protótipo
  (`huKcK`), cobrindo RF05 (edição de contato, imagem, descrição, endereço) e
  RF06 (e-mail pessoal, CNPJ e razão social sempre travados, mesmo em modo de
  edição).
- Fechar o gap de backend com o menor endpoint possível (`GET .../me`,
  reaproveitando `toResponse`/`NotFoundException` já existentes no `update`).
- Consolidar as peças de endereço (máscara de CEP, ViaCEP, autocomplete de
  cidade) num lugar compartilhado, já que passam a ter dois consumidores
  (F2 e F3), evitando duas fontes de verdade para os mesmos regex/URLs de API
  externa.

**Non-Goals:**

- Upload de imagem — campo `image` continua texto livre (URL), mesma limitação
  do F2 (sem endpoint de upload no backend).
- Qualquer forma de exclusão/desativação de conta — Fora do Escopo (RF/RNF).
- Aviso de "alterações não salvas" ao cancelar a edição — MVP aceita perder o
  rascunho ao clicar "Cancelar" (ver Risks).
- Refatorar `AuthProvider`, `lib/api` ou o formato de resposta dos DTOs
  existentes.

## Decisions

### 1. Backend: `GET .../me` espelha o `update`, sem service novo

`EstablishmentsController` / `BeneficiaryEntitiesController` ganham:

```ts
@Get('me')
findMe(@Session() session: UserSession): Promise<EstablishmentResponseDto> {
  return this.establishmentsService.findMe(Number(session.user.id));
}
```

E no service, um método curto que reaproveita a mesma query e o mesmo
`toResponse` privado que o `update` já usa:

```ts
async findMe(userId: number): Promise<EstablishmentResponseDto> {
  const establishment = await this.prisma.establishment.findUnique({
    where: { userId },
    include: { user: true, address: true },
  });
  if (!establishment) throw new NotFoundException('Establishment not found.');
  return this.toResponse(establishment);
}
```

Idêntico no `BeneficiaryEntitiesService`. Nenhum DTO novo — a resposta é a
mesma `*ResponseDto` que o `PATCH` já documenta. `@Get('me')` antes do
`@Patch('me')` no controller por convenção de leitura-antes-de-escrita.

Alternativa: expandir o `GET /me` genérico do `AppController` para incluir o
cadastro completo. Descartada — aquele endpoint é sobre sessão/role (usado por
`AuthProvider` para toda a aplicação, inclusive rotas públicas) e misturar o
cadastro completo ali acopla um concern de UI (tela de perfil) a um endpoint
de infraestrutura de auth.

### 2. Página com dois modos (`view` | `edit`), não duas rotas

```ts
const [mode, setMode] = useState<'view' | 'edit'>('view');
```

- `view`: cartões somente leitura (fiel ao protótipo), botão "Editar perfil".
- `edit`: os mesmos campos viram um form (`react-hook-form` + `zod`), com
  "Salvar alterações" e "Cancelar".
- "Cancelar" volta para `view` chamando `form.reset(valoresAtuaisDoGET)` —
  sem nova requisição, os dados já estão em cache do React Query.
- Sucesso do `PATCH`: atualiza o cache da query (`setQueryData` ou
  `invalidateQueries`), volta para `view`, toast de sucesso.

Alternativa: `/perfil` (view) + `/perfil/editar` (edit) como rotas separadas.
Descartada — duas rotas para o mesmo recurso sem necessidade de deep-link
direto para o modo de edição, e complica o "Cancelar" (navegação em vez de
troca de estado local).

### 3. Dados: uma query, uma mutation, por `role`

```ts
// features/profile/profile-api.ts
export function getMyProfile(role: Role): Promise<ProfileResponse> {
  return api.get(role === 'establishment' ? '/establishments/me' : '/beneficiary-entities/me');
}
export function updateMyProfile(role: Role, body: UpdateProfilePayload): Promise<ProfileResponse> {
  return api.patch(role === 'establishment' ? '/establishments/me' : '/beneficiary-entities/me', body);
}
```

`ProfilePage` usa `useQuery({ queryKey: ['profile', role], queryFn: () => getMyProfile(role!) })`
e `useMutation({ mutationFn: (body) => updateMyProfile(role!, body) })`. Um
único componente de página funciona para os dois papéis porque
`EstablishmentResponseDto` e `BeneficiaryEntityResponseDto` têm exatamente os
mesmos campos (só o conteúdo muda) — não há union discriminada nem
componentes duplicados por papel, mesmo raciocínio do `signUpSchema` único no F2.

### 4. Campos travados (RF06) nunca entram no payload do `PATCH`

`email` (pessoal), `cnpj` e `companyName` (razão social) aparecem sempre como
`<Input disabled>` (view e edit), preenchidos a partir do `GET`, mas **fora**
do `useForm` — não são campos do formulário, só props de exibição. Isso
elimina por construção o risco de enviá-los no `PATCH` (a spec `Campos não
editáveis rejeitados na edição` rejeitaria a submissão inteira se algum
chegasse). `tradeName` e `name` (responsável) também são exibidos, mas também
fora do escopo de RF05 — mostrados como somente leitura pelo mesmo motivo
(não estão na lista de editáveis do backend, embora não sejam RF06
explicitamente).

O `useForm` só registra os campos que o `UpdateEstablishmentDto` /
`UpdateBeneficiaryEntityDto` aceitam: `personalPhone`, `institutionalPhone`,
`institutionalEmail`, `image`, `description`, `postalCode`, `street`,
`number`, `complement`, `city`, `state`.

### 5. Payload sempre envia o endereço completo quando em modo de edição

O backend exige o endereço como unidade (todos os seis subcampos ou nenhum).
Para não reintroduzir o bug de "só mandei a cidade" descrito na spec, o
`onSubmit` monta o payload assim:

```ts
const payload: UpdateProfilePayload = {
  personalPhone: values.personalPhone,
  institutionalPhone: values.institutionalPhone,
  institutionalEmail: values.institutionalEmail,
  image: values.image || undefined,
  description: values.description,
  address: {
    postalCode: values.postalCode, street: values.street, number: values.number,
    complement: values.complement || undefined, city: values.city, state: values.state,
  },
};
```

Sempre os campos editáveis inteiros, nunca um diff parcial — mais simples que
rastrear `dirtyFields` e consistente com "endereço como unidade" já ser regra
do backend. Como todo campo tem valor inicial vindo do `GET`, não há campo
"vazio sem querer".

### 6. Regex/constantes de validação compartilhadas — novo `lib/validation.ts`

Hoje `sign-up-schema.ts` tem o regex de telefone inline e exporta só `UFS`. A
F3 precisa dos mesmos regex de telefone/CEP e da mesma lista de UFs. Extrair
para `src/lib/validation.ts`:

```ts
export const PHONE_REGEX = /^\(?\d{2}\)?[\s-]?\d{4,5}-?\d{4}$/;
export const POSTAL_CODE_REGEX = /^\d{5}-?\d{3}$/;
export const UFS = ['AC', 'AL', /* … */] as const;
```

`sign-up-schema.ts` e o novo `profile-schema.ts` importam de lá. Alternativa:
duplicar os regex no schema do perfil. Descartada — são as mesmas regras que
espelham o `class-validator` do backend; duplicar cria uma segunda fonte que
pode divergir silenciosamente se o backend mudar um formato.

### 7. Relocar `viacep.ts`, `ibge.ts` e `city-autocomplete.tsx` para fora de `sign-up/`

Movem de `features/auth/sign-up/` para `src/lib/viacep.ts`, `src/lib/ibge.ts`
(funções puras, sem JSX) e `src/components/city-autocomplete.tsx` (componente
de UI genérico, não é primitiva shadcn então não vai para `components/ui/`).
`address-step.tsx` (F2) atualiza os imports — comportamento idêntico, é
relocação pura. `profile-page.tsx` importa dos mesmos três arquivos.

Alternativa: duplicar os três arquivos dentro de `features/profile/`.
Descartada — mesmo raciocínio da decisão 6 (URLs de API externa e regex de
parsing duplicados divergem fácil); e importar de `features/auth/sign-up/`
direto a partir de `features/profile/` quebra "organização por feature", que
pressupõe que o conteúdo de uma feature não é dependência de outra.

### 8. Estrutura de arquivos

```
src/lib/
  validation.ts       (novo — PHONE_REGEX, POSTAL_CODE_REGEX, UFS)
  viacep.ts           (movido de features/auth/sign-up/)
  ibge.ts             (movido de features/auth/sign-up/)
src/components/
  city-autocomplete.tsx  (movido de features/auth/sign-up/)
src/features/profile/
  profile-page.tsx       (rota: guarda de modo view/edit, query, mutation)
  profile-schema.ts       (profileSchema, ProfileInput, usando lib/validation)
  profile-api.ts          (getMyProfile, updateMyProfile, tipos)
  profile-view.tsx         (cartões somente leitura, fiel ao protótipo)
  profile-form.tsx          (formulário de edição)
```

`sign-up-schema.ts` passa a importar `PHONE_REGEX`/`POSTAL_CODE_REGEX`/`UFS`
de `lib/validation.ts` em vez de defini-los.

### 9. Conflito de unicidade (`409`) na edição — reaproveita o padrão do F2, mas mais simples

A spec `Unicidade de contato na edição` já define `fields ⊆ {institutionalEmail,
institutionalPhone, personal}` — e aqui `personal` só pode significar
`personalPhone`, porque e-mail pessoal não é editável por este endpoint (RF06).
Sem a ambiguidade e-mail/celular que o cadastro (F2) tem. O `catch` do
`onSubmit`:

- `409` com `fields`: `form.setError` no campo homônimo
  (`institutionalEmail`/`institutionalPhone`) ou em `personalPhone` (quando o
  campo apontado é `personal`), mensagem "Este \<campo\> já está em uso por
  outro cadastro."; permanece em modo `edit`.
- `400`: `<Alert>` genérico "Há dados inválidos. Revise o formulário." (não
  deveria ocorrer — o zod espelha o backend).
- Rede/`5xx`: `<Alert>` "Não foi possível salvar. Tente novamente em instantes."

### 10. Modo de visualização não busca de novo ao entrar em edição

O `useQuery` já mantém os dados em cache; entrar em `edit` só chama
`form.reset(mapResponseToFormValues(query.data))` — sem refetch. Um refetch
só acontece no mount da página (ida à rota) e depois do `PATCH` bem-sucedido
(invalidação).

## Risks / Trade-offs

- **Relocar `viacep.ts`/`ibge.ts`/`city-autocomplete.tsx` regride o F2** →
  mitigado reexecutando a verificação E2E de cadastro (CEP preenche endereço,
  autocomplete de cidade funciona) como task desta change, além do `tsc -b`.
- **Cancelar sem confirmação descarta edição em andamento** → aceito para o
  MVP (RNF não exige); reversível depois com um `<AlertDialog>` de confirmação
  se incomodar no uso real.
- **Dois papéis, uma página** → se um dia os campos entre estabelecimento e
  entidade divergirem (hoje são idênticos), a página precisa de um branch
  condicional; não é o caso agora.
- **`GET .../me` sem cadastro vinculado** (sessão de usuário com `role`
  inconsistente) → mesmo `NotFoundException` que o `update` já lança; a
  página trata como erro genérico de carregamento (estado de erro do
  `useQuery`, sem crash).
- **Endereço sempre enviado por inteiro** → nenhum trade-off real: o backend já
  exige isso; só descarta a possibilidade (não pedida) de editar um subcampo
  isoladamente por diff.

## Migration Plan

1. Branch `feat/rf05-edicao-perfil` a partir de `develop` (RF05 é o requisito
   principal; RF06 é tratado no mesmo PR).
2. Backend primeiro (`GET .../me` nos dois controllers/services) — desbloqueia
   o frontend consumir dado real desde o início do apply.
3. Relocar `viacep.ts`/`ibge.ts`/`city-autocomplete.tsx` e extrair
   `lib/validation.ts` antes de escrever `profile-*`, para `sign-up-schema.ts`
   já nascer usando a versão movida (sem período de duplicação).
4. Implementar `features/profile/*`, ligar `/perfil` no `router.tsx`.
5. `npm run lint:check` + `npm run build` (frontend) e suíte do backend
   (`npm test` se houver specs de service para os módulos tocados).
6. Verificação de ponta a ponta no browser (`playwright-cli`): visualizar
   perfil de estabelecimento e de entidade, editar e salvar cada campo
   editável, campos RF06 permanecem travados, endereço via CEP, cancelar
   descarta, `409` de contato duplicado, regressão do fluxo de cadastro (F2)
   pós-relocação.
7. PR para `develop`. Sem migração de dados (schema inalterado). Rollback =
   reverter o PR: `/perfil` volta ao `RoutePlaceholder`, `GET .../me` some,
   `viacep`/`ibge`/`city-autocomplete` voltam para dentro de `sign-up/` junto
   com o revert (mesmo commit).
