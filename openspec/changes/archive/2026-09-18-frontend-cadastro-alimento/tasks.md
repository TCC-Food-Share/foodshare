## 1. Frontend — schema e API

- [x] 1.1 `frontend/src/features/foods/create-food-schema.ts`:
      `createFoodSchema` (zod) espelhando `CreateFoodDto` — `name` (1-200),
      `categoryId` (string, obrigatório — `<Select>` entrega string;
      convertido para `number` só no `onSubmit`), `description` (1-2000),
      `quantity` (string, `refine` positivo e até 2 casas — mesmo motivo de
      `categoryId`), `quantityUnit` (1-50), `expirationDate` (string,
      obrigatório), `image` (string, obrigatória, ≤500). Exportar
      `CreateFoodInput` e `DEFAULT_VALUES`.
      **Ajustes sobre o design**: (1) `z.coerce.number()` (proposto no
      `design.md`) não compila com `useForm<CreateFoodInput>` sem os três
      parâmetros de tipo do resolver — trocado por string + `refine`. (2)
      `image` documentada como opcional no design original; verificação em
      runtime (task 4.2) mostrou que `CreateFoodDto.image` é
      `@IsNotEmpty()` — RF10 exige o campo no cadastro, diferente do campo
      homônimo opcional do perfil (F3). Trocado para `min(1)` obrigatório.
      Ambos documentados no `design.md` (decisões 2 e 4).
- [x] 1.2 `frontend/src/features/foods/foods-api.ts`: nova função
      `createFood(payload)` → `POST /foods`, tipada com `CreateFoodInput` e
      retorno `FoodListItem`.

## 2. Frontend — modal de cadastro

- [x] 2.1 `frontend/src/features/foods/create-food-dialog.tsx`: `Dialog`
      controlado (`open`/`onOpenChange` via props), `useForm` +
      `zodResolver(createFoodSchema)`, `mode: 'onTouched'`. Reset do form
      (`DEFAULT_VALUES`) sempre que o modal abre.
- [x] 2.2 Campos do formulário, na ordem do protótipo (`oHutt`): Nome
      (`Input`) e Categoria (`Select`, `listCategories`) numa linha;
      Descrição (`Textarea`); Quantidade (`Input` numérico), Unidade de
      medida (`Input` texto livre) e Data de vencimento (`Input
      type="date"`) numa linha; Imagem (obrigatória, RF10) por último —
      `Input` de URL com prévia em thumbnail ao lado (fallback
      `ImageOffIcon` quando vazio ou a URL falha no `onError`).
      **Sem** "Tipo de solicitação aceita" e **sem** "Observações"
      (ausentes do `CreateFoodDto`, remoção do protótipo).
- [x] 2.3 Submissão: `useMutation(createFood)`; sucesso → fecha o modal
      (`onOpenChange(false)`), `toast.success('Alimento cadastrado.')`,
      `queryClient.invalidateQueries({ queryKey: ['foods'] })`. Erro `400` →
      alerta neutro "dados inválidos, revise o formulário"; erro de
      rede/outro status → alerta neutro "não foi possível cadastrar".
      Botão "Cadastrar alimento" do footer mostra spinner e fica desabilitado
      durante `mutation.isPending`; botão "Cancelar" fecha sem submeter.

## 3. Frontend — gatilho no Feed

- [x] 3.1 `frontend/src/features/foods/feed-page.tsx`: `useState` para
      `createOpen`; botão "Cadastrar alimento" (ícone `PlusIcon`) no header,
      ao lado do título, renderizado só quando `role === 'establishment'`
      (`useAuth`); monta `<CreateFoodDialog open={createOpen}
      onOpenChange={setCreateOpen} />`.
      Verificar: `tsc -b` passa.

## 4. Verificação e fechamento

- [x] 4.1 `frontend/`: `npm run lint:check` (0 warnings) + `npm run build`
      (`tsc -b && vite build`) sem erro.
- [x] 4.2 Verificação de ponta a ponta no browser (`playwright-cli`,
      backend `:3000` + Postgres + `npm run dev`):
  - Conta **estabelecimento**: vê o botão "Cadastrar alimento" no Feed;
    abrir o modal mostra os campos na ordem esperada, sem "Tipo de
    solicitação aceita" nem "Observações".
  - Cadastrar um alimento completo (com imagem): modal fecha, toast de
    sucesso, o alimento aparece na grade do Feed sem reload manual, com a
    imagem certa.
  - Submeter sem preencher o campo imagem: erro de validação inline
    ("Informe a URL da imagem."), sem request ao backend — campo é
    obrigatório (RF10/`CreateFoodDto.image`), não opcional.
  - Colar uma URL de imagem inválida/inacessível no campo: a prévia cai no
    ícone de fallback antes mesmo de submeter.
  - Submeter com campo obrigatório vazio: erro de validação inline, sem
    request ao backend.
  - Fechar o modal (Cancelar ou X), reabrir: formulário volta limpo, sem
    resíduo do preenchimento anterior.
  - Conta **entidade beneficiária**: **não** vê o botão "Cadastrar
    alimento" no Feed.
  - 0 erros de console. Dados de teste (alimentos cadastrados na
    verificação) removidos ao final.
  - **Resultado**: verificado no browser com 1 estabelecimento e 1 entidade
    beneficiária de teste criados via cadastro real. Confirmado: botão
    "Cadastrar alimento" só aparece para `establishment`; modal idêntico ao
    protótipo `oHutt` sem os dois campos fora de escopo; cadastro completo
    com imagem → `201`, toast, modal fecha, card aparece no Feed sem
    reload; validação inline bloqueia submit com qualquer campo vazio
    (nenhum request disparado); prévia da imagem cai no ícone de fallback
    com URL inválida/inacessível antes de submeter; reabrir o modal sempre
    volta limpo; entidade beneficiária não vê o botão.
    **Achados e corrigidos durante a verificação** (dois bugs reais, não
    cobertos pela checagem estática):
    1. `<Select>` de categoria alternava de não controlado (`value=
       undefined` inicial) para controlado no primeiro `onValueChange`,
       disparando o warning do React "Select is changing from
       uncontrolled to controlled" — `field.value || undefined` trocado
       por `field.value` direto (o form já inicializa `categoryId: ''`,
       então o Select fica controlado desde o mount).
    2. `image` estava modelada como opcional (copiando o campo homônimo do
       perfil) — submeter sem imagem gerava `400` do backend
       (`CreateFoodDto.image` é `@IsNotEmpty()`, RF10 lista imagem entre
       os dados do cadastro). Corrigido para campo obrigatório em
       `create-food-schema.ts`/`create-food-dialog.tsx`; `proposal.md` e
       `design.md` atualizados para refletir o requisito real.
    Dados de teste (2 contas, 1 estabelecimento, 1 entidade, 2 alimentos)
    removidos do banco ao final via SQL direto (sem UI de exclusão no MVP).
- [x] 4.3 `openspec validate frontend-cadastro-alimento --strict` sem erro.
