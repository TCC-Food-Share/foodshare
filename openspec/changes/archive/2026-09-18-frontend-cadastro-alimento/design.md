## Context

Ver `proposal.md` — "Why". Estado herdado (F0–F4, em `develop`):

- `features/foods/feed-page.tsx`: grade paginada de `FoodCard`, com
  `SearchFilters` acima. Nenhum botão de ação além dos cards (que navegam
  para o detalhe).
- `features/foods/categories-api.ts`: `listCategories()` — `GET /categories`,
  já usado pelo `<Select>` de categoria do filtro de busca (F4). O F5 reusa
  a mesma função para o `<Select>` de categoria do formulário.
- `features/auth/use-auth.ts` / `auth-context.ts`: `role: 'establishment' |
  'beneficiary' | null`. Mesmo padrão de gate por papel já usado em
  `food-detail-page.tsx` (`role === 'beneficiary'` para o card de
  "Solicitar doação").
- Backend `POST /foods` (`FoodsController.create`, `CreateFoodDto`): já
  aceita exatamente os campos do RF10, incluindo `image` como string (URL,
  ≤500 chars). Vincula ao estabelecimento da sessão autenticada
  (`Session() session: UserSession`) — não há campo de "estabelecimento" no
  formulário. Erros documentados: `400` (dados inválidos — `class-validator`
  por campo), `404` (sessão sem estabelecimento vinculado, caso de borda
  que não deveria ocorrer numa conta estabelecimento normal).
- Componentes shadcn já no projeto, nenhum novo a instalar: `dialog`,
  `form`, `input`, `select`, `textarea`, `button`, `label`.
- `components/ui/dialog.tsx`: ainda sem nenhum uso no projeto — F5 é o
  primeiro `Dialog`. Segue o Radix padrão (`Dialog` + `DialogTrigger` +
  `DialogContent` com `DialogHeader`/`DialogFooter`).
- Protótipo Pencil, frame `oHutt` ("Modal Cadastro Alimento", lido via MCP
  `pencil`): header (ícone + título "Cadastrar Alimento" + subtítulo + X),
  corpo com Nome/Categoria (linha), Descrição, Quantidade/Unidade/Validade
  (linha), "Tipo de solicitação aceita" (radio, remover) e "Observações"
  (remover), footer Cancelar/Cadastrar alimento. **Sem campo de imagem** —
  gap do protótipo, RF10 exige.

### Pesquisa Refero

- **Padrão de campo de imagem por URL com prévia** (`peerlist.io`, modal de
  "New submission" por URL de vídeo): título + campo de URL + thumbnail de
  prévia que carrega ao colar, ações Salvar/Cancelar. Confirma o formato
  adotado aqui — sem isso, o campo "imagem" seria só um texto cru, sem
  feedback se a URL colada é válida antes de submeter.
- Padrões de **upload de arquivo com crop/drag-drop** (GlossGenius, The
  Leap, TikTok Studio) foram descartados para este campo — pressupõem um
  endpoint de upload que não existe (`docs/PLANO-FRONTEND.md`); adotar
  qualquer um deles aqui seria construir UI para uma capability de backend
  que não existe ainda.

## Goals / Non-Goals

**Goals:**

- Modal de cadastro (RF10) fiel ao recorte do protótipo, com o campo de
  imagem que falta no frame Pencil.
- Reaproveitar 100% dos componentes/infra já existentes (shadcn, React
  Query, `useAuth`, `categories-api.ts`) — nenhuma dependência nova.
- Botão de gatilho visível só para quem pode cadastrar (`establishment`).
- Ao cadastrar com sucesso, o alimento aparece no Feed sem reload manual.

**Non-Goals (nível de design):**

- Upload real de arquivo de imagem — fica para a change futura comum a
  F2/F5 (registrada em `docs/PLANO-FRONTEND.md`).
- Editar/desativar um alimento já cadastrado — Fora do Escopo do MVP.
- Qualquer campo de "tipo de solicitação aceita" — não existe no schema;
  pedidos parciais/totais (F6) são decididos na hora do pedido
  (`POST /orders`), não no cadastro do alimento.
- Validar a URL da imagem contra o servidor (HEAD request, checar
  content-type) — RNF09 (limite de 5MB) e RNF10 (XSS/injeção) já são
  responsabilidade do backend ao consumir a URL; o front só valida formato
  de string e usa `onError` da `<img>` para feedback visual, mesmo padrão já
  usado em `food-card.tsx`/`food-detail-page.tsx`.

## Decisions

### 1. `Dialog` controlado por `FeedPage`, formulário em componente próprio

```
features/foods/
  feed-page.tsx           (+ botão "Cadastrar alimento" condicionado ao papel)
  create-food-dialog.tsx  (Dialog + Form; orquestra mutation/reset/close)
  create-food-schema.ts   (zod, espelha CreateFoodDto)
  foods-api.ts            (+ createFood)
```

`CreateFoodDialog` recebe só `open`/`onOpenChange` (estado vive em
`FeedPage`, um `useState<boolean>`) — mesmo padrão de estado elevado já
usado entre `ProfilePage`/`ProfileForm` (o pai decide o modo, o filho só
renderiza campos). Alternativa descartada: `DialogTrigger` direto no botão
do Feed, sem estado explícito — funciona, mas impede fechar o modal
programaticamente após o `POST` ter sucesso (precisa do `onOpenChange`
controlado para o `toast.success` + fechar não ficarem acoplados ao próprio
Radix).

Cada abertura começa com o form limpo: `form.reset(DEFAULT_VALUES)` no
`onOpenChange(true)`, não só na criação do componente — sem isso, cadastrar
um alimento, fechar e abrir de novo mostraria os valores do cadastro
anterior (o componente não desmonta entre uma abertura e outra).

### 2. `create-food-schema.ts` — espelha `CreateFoodDto`

```ts
export const createFoodSchema = z.object({
  name: z.string().min(1, 'Informe o nome do alimento.').max(200),
  categoryId: z.string().min(1, 'Selecione a categoria.'),
  description: z.string().min(1, 'Descreva o alimento.').max(2000),
  quantity: z
    .string()
    .min(1, 'Informe a quantidade.')
    .refine((v) => Number(v) > 0, 'A quantidade deve ser maior que zero.')
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), 'No máximo 2 casas decimais.'),
  quantityUnit: z.string().min(1, 'Informe a unidade de medida.').max(50),
  expirationDate: z.string().min(1, 'Informe a data de vencimento.'),
  image: z.string().min(1, 'Informe a URL da imagem.').max(500),
});
export type CreateFoodInput = z.infer<typeof createFoodSchema>;
```

- `categoryId`/`quantity` como `string`, não `z.coerce.number()`: os dois
  vêm de um `<Select>` e de um `<Input>` — ambos entregam string ao form
  state. `z.coerce.number()` foi tentado primeiro, mas o par
  input-type/output-type que ele gera (`unknown`/`string` de entrada,
  `number` de saída) não compila com `useForm<CreateFoodInput>` sem passar
  os três parâmetros de tipo do resolver (`TFieldValues`/`TContext`/
  `TTransformedValues`) — complexidade que nenhum outro form do projeto
  precisa. Mantém string ponta a ponta no form (mesmo padrão de
  `categoryId` como string em `search-filters.tsx`/`useSearchParams`) e só
  converte para `number` ao montar o `CreateFoodPayload` em `onSubmit`.
- `image` obrigatória (`min(1)`), diferente do campo homônimo opcional de
  `profile-schema.ts` (F3): `CreateFoodDto.image` é `@IsNotEmpty()` — RF10
  lista imagem entre os dados do cadastro; `UpdateEstablishmentDto.image`
  (F3) é opcional porque ali é edição de um cadastro que já existe. Ver a
  correção registrada na decisão 4.
- Sem regex de URL (`z.url()`): o campo aceita string livre, igual ao F3 —
  a prévia (decisão 4) já dá o feedback visual de "não é uma imagem
  válida" sem duplicar validação de formato que o backend não exige
  (`CreateFoodDto.image` só tem `@IsString()`/`@MaxLength`).
- `expirationDate` como string (não `z.date()`): `<input type="date">`
  (decisão 3) já entrega `"YYYY-MM-DD"`, formato que `IsDateString` do
  backend aceita direto — nenhuma conversão de/para `Date` no cliente.

### 3. Campo de data — `<input type="date">` nativo, sem novo componente

O projeto não tem `calendar.tsx`/date-picker shadcn instalado (nenhuma outra
tela precisou de data até agora — `expirationDate` só é *exibida*, nunca
*inserida*, nos F0–F4). Em vez de instalar `react-day-picker` + `calendar` +
`popover` só para um campo, usa `<input type="date">` dentro do `Input`
shadcn (`type="date"` já é suportado pelo componente, que só estiliza um
`<input>`) — zero dependência nova, formato nativo `YYYY-MM-DD` que bate
exatamente com `IsDateString` do backend, e o seletor de data do próprio
navegador (acessível, sem trabalho extra).

- Alternativa descartada: instalar o date-picker shadcn agora. Adiado — se
  F6/F7/F8 não precisarem de outro campo de data para inserir (só F5
  precisa; pedidos não têm data escolhida pelo usuário), a dependência nunca
  se paga; se precisarem, a migração de `<input type="date">` para um
  date-picker fica isolada nesta única tela.

### 4. Campo de imagem — URL + prévia ao vivo (melhoria sobre o protótipo)

```tsx
<FormField name="image" render={({ field }) => (
  <FormItem>
    <FormLabel>Imagem</FormLabel>
    <div className="flex items-center gap-3">
      <div className="bg-muted flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md">
        {field.value && !previewFailed ? (
          <img src={field.value} alt="" className="size-full object-cover"
               onError={() => setPreviewFailed(true)} onLoad={() => setPreviewFailed(false)} />
        ) : (
          <ImageOffIcon className="text-muted-foreground size-5" />
        )}
      </div>
      <FormControl>
        <Input placeholder="https://…" autoComplete="off" {...field} />
      </FormControl>
    </div>
    <FormMessage />
  </FormItem>
)} />
```

Mesmo trio label+input+fallback do F3 (`profile-form.tsx`, campo "URL da
imagem/logotipo"), com a thumbnail a mais — decisão levada pela pesquisa
Refero (padrão Peerlist) porque aqui a imagem é o elemento mais visível do
card/detalhe do alimento (F4), então errar a URL tem custo maior de
percepção do que no logotipo de perfil. `previewFailed` reseta em
`onLoad` (troca de URL válida depois de uma inválida deve limpar o estado de
erro anterior) — mesmo cuidado que `food-card.tsx`/`food-detail-page.tsx` já
tomam com `imageFailed`.

**Correção sobre o design original: campo obrigatório, não opcional.** A
primeira versão deste documento tratou `image` como opcional (copiando o
campo homônimo do F3). Verificação em runtime (task 4.2) descobriu que
`CreateFoodDto.image` é `@IsString() @IsNotEmpty()` — sem `@IsOptional()` —
e RF10 lista "imagem" entre os dados que o estabelecimento informa ao
cadastrar; só o campo de *perfil* (F3, `UpdateEstablishmentDto`) é opcional.
Corrigido: `createFoodSchema.image` exige `min(1)`, sem o `.optional().or
(z.literal(''))`; o label perdeu o "(opcional)"; `onSubmit` manda
`values.image` direto, sem o `|| undefined`. A prévia continua útil mesmo
com o campo obrigatório — o valor pode ser inválido antes de submeter.

### 5. Sucesso — fecha modal, toast, invalida cache do Feed

```ts
const mutation = useMutation({ mutationFn: createFood });

async function onSubmit(values: CreateFoodInput) {
  try {
    await mutation.mutateAsync({ ...values, categoryId: Number(values.categoryId), quantity: Number(values.quantity) });
    await queryClient.invalidateQueries({ queryKey: ['foods'] });
    toast.success('Alimento cadastrado.');
    onOpenChange(false);
  } catch (error) {
    setServerError(error instanceof ApiError && error.status === 400 ? 'invalid' : 'network');
  }
}
```

`invalidateQueries({ queryKey: ['foods'] })` sem o array de filtros
completo (a `queryKey` real do Feed é `['foods', filters]`) — invalida
**todas** as variações de filtro em cache, não só a combinação atual,
porque o alimento novo deveria aparecer mesmo se o estabelecimento tiver
outro filtro aplicado quando reabrir o Feed. Mesmo padrão de invalidação
"por prefixo" que `ProfilePage` não precisa fazer (usa `setQueryData`
porque o cadastro não cria uma nova entidade numa lista).

RF10 não tem `409` (nome de alimento não é único) — o único erro tratado
além do `400` de validação é rede/5xx genérico, mesmo padrão neutro do
F2/F3 (`bannerText`/`ServerError` local ao componente, sem reuso de tipo
entre features).

### 6. Botão "Cadastrar alimento" — gate por papel, no header do Feed

```tsx
<div className="flex items-center justify-between gap-4">
  <div className="flex flex-col gap-1">
    <h1>Feed de Alimentos</h1>
    <p>Encontre alimentos disponíveis para doação</p>
  </div>
  {role === 'establishment' && (
    <Button onClick={() => setCreateOpen(true)} className="gap-2">
      <PlusIcon /> Cadastrar alimento
    </Button>
  )}
</div>
```

Mesmo critério de gate por papel do card "Solicitar doação" no detalhe
(F4, decisão 6): **omite** o botão para quem não é estabelecimento, em vez
de mostrar desabilitado — uma entidade beneficiária nunca cadastra
alimento, então não há "ainda não disponível" a comunicar, é uma ação que
não existe para esse papel.

## Risks / Trade-offs

- **`<input type="date">` sem calendário customizado** → aparência varia
  por navegador (nativo do Chrome/Firefox/Safari/Edge); aceitável porque
  RNF02 só exige compatibilidade, não paridade visual entre eles, e evita
  dependência nova só para um campo.
- **Prévia de imagem que só valida no `onError` do `<img>`** → uma URL que
  responde 200 mas não é imagem (ex: HTML de erro do servidor) só falha
  visualmente depois do `POST`; aceitável porque o backend não valida
  conteúdo de imagem também (RNF09 é responsabilidade de uma etapa de
  upload que não existe ainda) — mesmo nível de garantia que o F3 já tem
  para o campo de imagem do perfil.
- **`invalidateQueries` por prefixo `['foods']`** → refaz a busca de
  qualquer combinação de filtro que esteja montada (só a do Feed aberto no
  momento, React Query não refaz query de outra aba/rota fechada);
  inofensivo, é exatamente o comportamento desejado (decisão 5).
- **Nenhum limite de tamanho de arquivo (RNF09) aplicado no cliente** →
  não há arquivo no cliente, só uma URL; a responsabilidade de RNF09 é
  inteira da etapa de upload futura, não desta change.

## Migration Plan

1. Frontend apenas — nenhuma mudança de backend/schema (`CreateFoodDto` já
   cobre o RF10 por completo).
2. Implementar `create-food-schema.ts`, `create-food-dialog.tsx`,
   `createFood` em `foods-api.ts`, botão em `feed-page.tsx`.
   `npm run lint:check` (0 warnings) + `npm run build` (`tsc -b && vite
   build`).
3. Verificação de ponta a ponta no browser (backend `:3000` + Postgres +
   `npm run dev`) — conta estabelecimento cadastra um alimento com e sem
   imagem, ele aparece no Feed; conta entidade beneficiária não vê o botão.
4. PR para `develop`. Sem migração de dado. Rollback = reverter o PR: o
   botão e o modal somem, `POST /foods` continua existindo e servindo
   qualquer outro cliente (nenhum outro consumidor depende do frontend).

## Open Questions

Nenhuma que mude a abordagem ou o recorte de tasks:

- Texto exato de placeholder/copy do modal (protótipo já dá uma base em
  pt-BR, ajuste fino no apply).
- Se `quantityUnit` vira um `<Select>` com opções fixas (kg, unidades, L…)
  ou continua texto livre como o protótipo (`Fk4H6`, placeholder "Ex:
  unidades, kg, L...") — nenhum RF/DTO restringe a um enum
  (`CreateFoodDto.quantityUnit` é `string` livre), então texto livre é a
  leitura mais direta; vira `<Select>` só se o apply notar que texto livre
  gera dado inconsistente demais para os cards do Feed.
