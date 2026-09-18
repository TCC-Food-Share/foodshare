## Why

F4 (`frontend-feed`) entregou o Feed e o detalhe do alimento, mas o
estabelecimento ainda não tem como colocar um alimento à disposição — RF10
está completo e testado no backend (spec `alimentos/cadastro`, `POST
/api/foods`), porém não existe nenhuma tela que o exponha. O F5 fecha esse
gap com o modal de cadastro de alimento, acionado a partir do Feed.

## What Changes

- **Botão "Cadastrar alimento" no Feed** (`FeedPage`), visível só para conta
  estabelecimento (`role === 'establishment'`), que abre o modal.
- **Modal de cadastro** (`Dialog` shadcn, copiado do frame Pencil `Modal
  Cadastro Alimento` / `oHutt`): formulário `react-hook-form` + `zod` com
  nome, categoria (`categoryId`, select populado por `GET /categories`,
  reaproveitando `categories-api.ts` do F4), descrição, quantidade, unidade
  de medida, data de vencimento e imagem — `POST /api/foods`.
- **Campo imagem — ausente no protótipo, adicionado**: input de URL (texto),
  obrigatório, não upload de arquivo. RF10 lista "imagem" entre os dados que
  o estabelecimento informa ao cadastrar, e `CreateFoodDto.image` é
  `@IsNotEmpty()` (sem `@IsOptional()`) — diferente do campo homônimo do
  perfil (F3, opcional, só editável depois do cadastro). O backend não tem
  endpoint de upload (`docs/PLANO-FRONTEND.md` registra upload de imagem real
  como change futura comum a F2/F5), então o campo aqui é uma URL de texto,
  não um seletor de arquivo. Melhoria sobre o protótipo (pesquisa Refero):
  abaixo do input, uma prévia (thumbnail quadrado) que carrega a imagem
  colada em tempo real e cai para um ícone de "sem imagem" se a URL falhar —
  mesmo padrão de fallback já usado em
  `food-card.tsx`/`food-detail-page.tsx`.
- **Sucesso**: fecha o modal, toast de confirmação, invalida a query do Feed
  (`['foods', ...]`) para o novo alimento aparecer sem reload manual.
- **REMOVER do protótipo** (frame `oHutt`, regra "toda tela alinhada ao RF"):
  - Campo "Tipo de solicitação aceita" (Somente total / parcial / ambos) —
    não é RF10, não existe no `CreateFoodDto`.
  - Campo "Observações" — `CreateFoodDto` só tem `description`.

## Capabilities

### New Capabilities

<!-- Nenhuma. -->

### Modified Capabilities

<!-- Nenhuma. `skip_specs: true` no .openspec.yaml.

O comportamento observável de RF10 já está descrito e implementado na spec
`alimentos/cadastro` (change `cadastro-alimento`): cadastrar um alimento
vinculado ao estabelecimento autenticado com imagem, nome, categoria,
quantidade, unidade, descrição e data de vencimento, disponível
imediatamente. `CreateFoodDto` já aceita `image` como string (URL) — não há
gap de backend para fechar (diferente do F4, que precisou de
`alimentos/categorias` nova e `alimentos/detalhe` modificada). O F5 é a
**entrega dessa mesma capability na superfície de UI**, mesmo precedente de
F1/F2 (`frontend-login`, `frontend-cadastro`), também `skip_specs`. Não há
capability de frontend/UI na organização de specs do projeto e não faz
sentido inventar uma só para satisfazer o validate. -->

## Impact

- **Frontend** (único lado afetado):
  - `src/features/foods/feed-page.tsx`: novo botão "Cadastrar alimento" no
    header, condicionado a `role === 'establishment'` (`useAuth`).
  - Novo `src/features/foods/create-food-modal.tsx` (ou `.../create-food/`
    se o form ficar grande o bastante para separar form de modal): `Dialog`
    + `react-hook-form` + `zodResolver`.
  - Novo `src/features/foods/create-food-schema.ts`: schema zod espelhando
    `CreateFoodDto` (`name` ≤200, `categoryId` int, `quantity` positivo até 2
    casas, `quantityUnit` ≤50, `description` ≤2000, `expirationDate`
    ISO/data, `image` URL obrigatória ≤500 — RF10 e `CreateFoodDto` exigem o
    campo no cadastro, ao contrário do campo homônimo opcional do perfil).
  - `src/features/foods/foods-api.ts`: nova função `createFood(payload)` →
    `POST /foods`.
  - Reaproveitados sem mudança: `categories-api.ts` (`listCategories`),
    componentes shadcn `dialog`, `form`, `input`, `select`, `textarea`,
    `button`; `ApiError` de `lib/api.ts`.
  - Nenhuma dependência nova, nenhum componente shadcn novo a instalar
    (`dialog`/`select`/`textarea`/`form` já existem no projeto).
- **Fora do escopo desta change**:
  - Upload de arquivo de imagem real — change futura comum a F2/F5.
  - Editar ou desativar um alimento já cadastrado — "reativação/desativação
    manual" é Fora do Escopo do MVP (`docs/REQUISITOS.md`).
  - Sincronizar o protótipo Pencil com as remoções acima — mesmo precedente
    do F2/F3/F4 (código é a fonte da verdade).
