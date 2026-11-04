## Context

Motivação em `proposal.md`, comportamento em `specs/`.

Estado atual que molda a solução:

- `Suggestion` e o índice `[status, type]` existem desde a 1.1. Aprovar não guarda a opção criada, como define `docs/MODELO-DE-DADOS.md`.
- Cada service de lista (`admin/lists/*`) tem `create` que abre a própria transação, faz checagem de duplicidade e grava auditoria. Nenhum aceita transação de fora.
- `hasDuplicate` já compara sem maiúsculas nem acentos nas tabelas das listas, mas não em `suggestion`.
- `SearchableSelect` tem um slot `footer` sem uso. Só o select de alimento usa o componente no modal: a unidade ainda é `Select` simples.
- `AdminTable` e `useAdminListParams` só conhecem busca, ordenação e paginação. Não há filtro.
- O popover do `SearchableSelect` desmonta ao fechar, então um diálogo dentro dele sumiria junto.

## Goals / Non-Goals

**Goals:**

- Aprovar reaproveita exatamente as regras de cadastro de cada lista, sem repetir limite nem checagem.
- Aprovação atômica, segura contra dois administradores decidindo juntos.
- O `SearchableSelect` continua genérico, sem conhecer sugestões.

**Non-Goals:**

- Limite próprio de sugestões por instituição: vale o limite global da DT20.
- Migration ou coluna nova em `suggestion`.
- Tela para quem sugeriu acompanhar a decisão (RN39).

## Decisions

### Dois controllers, um por público

- `suggestions/`: `POST /suggestions`, com `@RequireRoles(...INSTITUTION_ROLES)`, `@ApiTags('Listas padronizadas')`.
- `admin/suggestions/`: `@AdminController('suggestions')`, com `GET /admin/suggestions`, `PATCH /admin/suggestions/:id/approve` e `PATCH /admin/suggestions/:id/reject`.

Segue `docs/CONVENCOES.md`: rota de administrador fica sob `/admin`, e instituição nunca a acessa. As decisões usam `PATCH`, como as ações de pedido (`/orders/:id/accept`).

### Criação das listas dentro de uma transação recebida

Cada um dos quatro services ganha `createInTransaction(tx, admin, dto)`, com o corpo atual do `create`, e o `create` passa a só abrir a transação e chamá-lo. `AdminListsModule` exporta os services, e `AdminSuggestionsService` os injeta por tipo.

- **Por quê:** a opção criada passa pelas mesmas regras e grava a mesma auditoria (`category.create` etc.), sem duplicar nada.
- **Alternativa recusada:** gravar direto com `tx.category.create` no service de sugestões. Repetiria duplicidade e auditoria em quatro lugares.
- **Alternativa recusada:** chamar `create` em sequência, sem transação comum. Perderia a atomicidade pedida pela spec.

Os termos proibidos ficam de fora: não são tipo de sugestão.

### Aprovação em uma transação, com transição condicional

Dentro de `$transaction`:

1. Busca a sugestão: inexistente responde `404`; já decidida, `409 SUGGESTION_ALREADY_REVIEWED`.
2. Valida os dados da opção conforme o tipo, sem escrever nada.
3. `updateMany` com `where: { id, status: PENDING }`, gravando `APPROVED`, `reviewerId` e `reviewedAt`. Se `count` for 0, responde `409 SUGGESTION_ALREADY_REVIEWED`.
4. Cadastra a opção por `createInTransaction`.
5. Grava `suggestion.approve`.

Erro em qualquer passo desfaz tudo, e a sugestão continua `Pendente`. A recusa usa os passos 1, 3 e 5, com `REJECTED`. O `.catch(translatePrismaError)` trata a corrida de unicidade (`P2002`).

- **Por quê:** é o padrão de transição condicional de `docs/CONVENCOES.md`. A segunda aprovação espera a trava da linha e encontra `count` 0.

`suggestion.text` guarda sempre o texto original. O texto ajustado vai para a opção criada e para `details` da auditoria.

### Validação da aprovação pelos DTOs das listas

`ApproveSuggestionDto` tem `text`, `categoryId`, `abbreviation` e `allowsFraction`, todos opcionais, porque dependem do tipo. Depois de carregar a sugestão, o service monta o `Save*Dto` do tipo com `plainToInstance`, usando `text ?? suggestion.text`, e roda `validate`. Falha vira `400`.

- **Por quê:** os limites (100, 200, 50, 10) continuam num só lugar, e `categoryId` ou sigla ausentes falham pelas regras que já existem.
- **Campo que não pertence ao tipo** (como sigla em sugestão de categoria) é ignorado, porque o diálogo nem o envia.
- A categoria inexistente já vira `400` no `ensureCategory`.
- O texto ajustado pelo administrador não passa por `@NoProhibitedContent`, como os outros cadastros das listas no painel (DT24 cobre o texto enviado pela instituição).

### Repetição checada no service da criação

`SuggestionsService.create`, dentro de uma transação:

- usa `hasDuplicate` na tabela do tipo, e também em `abbreviation` para unidade, respondendo `SUGGESTION_OPTION_EXISTS`;
- usa uma consulta nova sobre `suggestion` com `lower(immutable_unaccent(text))`, filtrando tipo e `PENDING`, respondendo `SUGGESTION_ALREADY_PENDING`.

O mapa tipo → checagem fica em `suggestions.service.ts`. Motivos de sistema contam como existentes, porque a aprovação falharia neles do mesmo jeito.

Não há índice único sobre sugestões pendentes. Duas iguais ao mesmo tempo podem entrar, e isso é inofensivo: a segunda recebe `DUPLICATE_NAME` ao ser aprovada, e o administrador recusa.

### Listagem em memória, como as outras do painel

Usa `findMany` com o filtro de tipo e status no `where`, e depois `paginateInMemory`, com `requester` incluindo `establishment` e `beneficiaryEntity`. O nome é `tradeName ?? companyName`. Ordena por `id`, `type`, `text`, `status`, `requester` e `createdAt`.

`createAdminListQueryDto` recebe `type` e `status` por herança, validados com `@IsEnum`.

### Ação no select por callback, diálogo fora dele

`SearchableSelect` ganha `onSuggest?: (search: string) => void`. Quando informado, mostra "Sugerir nova opção" no rodapé do popover, fecha o popover e chama o callback com o termo da busca. Para isso, o valor do `CommandInput` passa a ser controlado.

`SuggestOptionDialog` (`features/suggestions/`) é renderizado uma vez em `create-food-dialog.tsx`, com estado `{ type, text }`.

- **Por quê:** o diálogo não pode viver no popover, que desmonta ao fechar. E os formulários do painel continuam sem a ação só por não passarem o callback.
- **Ação dentro do popover, não ao lado do campo:** o plano pede que ela fique no componente de select, e assim aparece junto da busca sem resultado. A RN38 diz "ao lado"; a divergência fica registrada aqui.

### Diálogo aninhado sem interferir no modal de alimento

O diálogo de sugestão é um `Dialog` Radix aninhado, que fecha com Esc sem fechar o modal. Como eventos atravessam portais pela árvore React, o `<form>` dele chama `preventDefault` e `stopPropagation` no `submit`. O formulário tem estado próprio (react-hook-form), sem relação com o do alimento.

Para os erros, `SUGGESTION_OPTION_EXISTS`, `SUGGESTION_ALREADY_PENDING` e `PROHIBITED_CONTENT` vão para o campo `text`. Os demais vão para um alerta no próprio diálogo.

### Filtros no `AdminTable` e nos parâmetros

- `AdminTable` ganha `toolbar?: ReactNode`, ao lado da busca.
- `useAdminListParams` ganha `filterKeys: string[]`, para ler esses parâmetros da URL. Sem argumento, nada muda para as páginas atuais.
- Na página, `status` ausente na URL significa `PENDING`, e "Todos" é gravado como `status=ALL`, que a página não envia à API.

A página de sugestões não usa `AdminListPage`, feito para CRUD com cadastro, edição e exclusão. Ela usa `AdminTable` e `AdminFormDialogShell` direto.

Depois de aprovar, invalida `['admin']` e `['catalog']`, para a opção aparecer nas listas do painel e nos selects.

### Rótulos centralizados

`features/suggestions/suggestion-labels.ts` guarda o texto de tipo e de status, como pede `docs/CONVENCOES.md`. Diálogo e página de administração o importam.

## Risks / Trade-offs

- [Instituição pode descobrir se um texto existe, mesmo em motivo de sistema] → Inofensivo: a lista já é pública para instituições, exceto os três motivos de sistema, cujos nomes não são sigilosos.
- [Spam de sugestões] → Sem limite próprio; a validação de conteúdo, a recusa de repetidas e o limite global de 100 por minuto cobrem o caso. Se virar problema, entra um limite por usuário em outra change.
- [Entidade não tem onde clicar até a 3.2] → Registrado na proposta; o select de motivo da 3.2 usa o mesmo `onSuggest`.
- [Refatorar `create` dos quatro services pode alterar comportamento] → Os testes atuais (`admin-lists.services.spec.ts`) cobrem esses fluxos e devem passar sem mudança.
- [Trocar o `Select` de unidade pode quebrar a revalidação da quantidade] → O `onChange` mantém o `form.trigger('quantity')` atual, e o cenário de fração entra na verificação no navegador.
- [`Select` controlado com RHF tem armadilha conhecida no projeto] → O `SearchableSelect` recebe `field.value` direto, como o select de alimento.

## Migration Plan

Sem migration nem variável de ambiente. O rollback é reverter o código. As sugestões gravadas continuam válidas.
