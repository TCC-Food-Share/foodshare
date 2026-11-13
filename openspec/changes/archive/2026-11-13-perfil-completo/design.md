## Context

A edição do próprio perfil já existe desde o MVP e foi ampliada na 0.3 (imagem por arquivo no MinIO):

- **Backend:** `PATCH /establishments/me` e `PATCH /beneficiary-entities/me` recebem JSON ou multipart
  (`FileInterceptor` + `ValidatedImage`). O `update()` de cada service confere a unicidade dos contatos, grava a
  imagem nova no MinIO, atualiza `User`, `Address` e a instituição numa única `prisma.$transaction` e, depois do
  commit, apaga a imagem anterior (ou a nova, se falhar). O `ValidationPipe` global usa `whitelist` +
  `forbidNonWhitelisted`, então hoje `tradeName` e `name` são recusados com `400` só por não estarem no DTO.
- **Dados:** `User.name` (`VarChar(200)`, obrigatório) e `tradeName` (`VarChar(200)`, opcional) já existem nas duas
  tabelas de instituição. Não há migration.
- **Frontend:** `features/profile/` tem a página (modo visualização/edição), o schema zod, o form e a API. O form
  sempre envia todos os campos editáveis; com foto nova, envia multipart por `toFormData` (`lib/form-data.ts`), que
  **descarta valores vazios** (`''`, `null`, `undefined`). O menu do usuário (`user-menu.tsx`) mostra `user.name` e
  `user.image` da sessão (`GET /me`), que é recarregada com `refreshSession()` — hoje só quando a foto muda.
- A sessão do better-auth não usa `cookieCache`: `GET /me` lê o usuário do banco a cada chamada, então o nome novo
  aparece assim que a sessão é recarregada.

## Goals / Non-Goals

**Goals:**

- Os dois `PATCH .../me` aceitam `tradeName` e `name` com as mesmas regras de formato do cadastro, na mesma
  transação e com a mesma troca de imagem de hoje.
- O nome fantasia pode ser apagado também no envio multipart.
- O menu do usuário reflete o nome e a foto novos logo depois de salvar.

**Non-Goals:**

- Mudar a resposta do `GET .../me` ou do `PATCH` (já trazem `tradeName` e `user.name`).
- Revalidar a sessão ao focar a janela (pendência registrada, fica para a 4.4).
- Unificar os dois services de instituição num só. A duplicação já existe e não é o foco desta change.

## Decisions

### 1. Continuar no `PATCH .../me`, sem usar o `updateUser` do better-auth para o nome

O better-auth tem a rota nativa `POST /auth/update-user`, que troca `name` e `image`. Não usamos: o RF03 pede uma
edição única e atômica de usuário, endereço e instituição, e a nossa rota já faz isso em uma transação. Dividir o
nome numa segunda chamada abriria estado parcial (nome salvo, endereço recusado) e duas mensagens de erro. A rota
própria já existe com motivo funcional real (`docs/CONVENCOES.md`, cadastro); esta change só acrescenta campos a ela.
A `update-user` nativa continua como está, fora do escopo.

### 2. `tradeName`: `trim` e vazio vira `null`

No DTO de edição:

- `@Transform` que apara espaços e converte string vazia em `null`;
- `@IsOptional()` (que pula os demais validadores para `null` e `undefined`);
- `@IsString()`, `@MaxLength(200)` e `@NoProhibitedContent()`, iguais ao cadastro.

No service, `dto.tradeName !== undefined` decide se o campo entra no `update` da instituição: `null` apaga, string
grava. `undefined` (campo ausente) mantém o valor atual.

Um helper `trimToNull` em `common/` (ao lado do `trimToUndefined` existente) serve aos dois DTOs.

Alternativa descartada: um campo booleano `clearTradeName`. É mais explícito, mas cria um contrato que o cadastro não
tem e que o painel administrativo (RF44, 5.2) teria de repetir. Vazio = sem nome fantasia é o mesmo significado do
cadastro.

### 3. `name`: `trim` e obrigatório quando enviado

`@Transform` que só apara (sem converter para `null`), `@IsOptional()`, `@IsString()`, `@IsNotEmpty()` e
`@MaxLength(200)`. String vazia ou só com espaços vira `''` e cai no `@IsNotEmpty()` → `400`. Sem
`@NoProhibitedContent()` (DT24 deixa o nome do responsável de fora). Gravado em `User.name` dentro do mesmo
`tx.user.update` que já trata `personalPhone` e `image` (a condição de entrada nesse update passa a incluir `name`).

### 4. Multipart: enviar o nome fantasia mesmo vazio

`toFormData` descarta `''`, então um nome fantasia apagado junto de foto nova sumiria do corpo e o backend manteria o
valor antigo, sem erro. Duas saídas:

- **Escolhida:** `toFormData` ganha uma opção `keepEmpty` (lista de chaves de primeiro nível que devem ir mesmo
  vazias). O perfil passa `keepEmpty: ['tradeName']`. Os demais formulários não mudam.
- Descartada: mudar o padrão de `toFormData` para mandar `''` sempre. Afetaria o cadastro e o cadastro de alimento,
  em que `complement` e `observations` vazios hoje simplesmente não vão, e o backend trataria `''` de outro jeito.

No JSON (sem foto nova), `tradeName: ''` já vai no corpo normalmente.

### 5. Frontend

- `profile-schema.ts`: `tradeName` (`max(200)`, opcional, aceita `''`) e `name` (`trim`, `min(1, 'Informe o nome do
  responsável.')`, `max(200)`); `mapResponseToFormValues` preenche os dois (`tradeName ?? ''`).
- `profile-api.ts`: `UpdateProfilePayload` ganha `tradeName: string` e `name: string`.
- `profile-form.tsx`: nome fantasia e nome do responsável viram `FormField` com `Input` (nome fantasia com rótulo
  "(opcional)", como o complemento). Razão social, CNPJ e e-mail pessoal continuam `LockedField`.
- `profile-view.tsx`: `Field` de nome fantasia e de nome sem `locked`.
- `profile-page.tsx`:
  - `defaultValues` e `onSubmit` com os campos novos;
  - erro de `PROHIBITED_CONTENT` passa a percorrer os campos devolvidos (`description`, `tradeName`) e marcar cada
    um, em vez de testar só `description`;
  - `refreshSession()` depois de todo salvamento bem-sucedido, não só com foto nova. É uma chamada a `GET /me`, e
    evita comparar nome antigo e novo.

O protótipo do Pencil mostra o nome fantasia e o nome do responsável com cadeado (estado do MVP). A divergência vem
do RF03 e fica registrada aqui; o protótipo não é redesenhado.

### 6. Documentação Scalar

Os `@ApiPropertyOptional` dos campos novos em pt-BR, com `example` em inglês. O de `tradeName` explica que vazio
apaga o valor. A `description` do `@ApiOperation` dos dois `PATCH` passa a listar os campos editáveis do RF03 e os
fixos da RN27.

## Risks / Trade-offs

- [Duas implementações paralelas (estabelecimento e entidade) podem divergir] → as tarefas alteram as duas em pares e
  os testes de service cobrem os mesmos casos nas duas.
- [Clientes que mandam `tradeName: ''` sem querer apagar] → o único cliente é o nosso frontend, que sempre manda o
  valor atual do campo; o comportamento fica documentado no Scalar.
- [`keepEmpty` esquecido em outro formulário que precise apagar campo por multipart no futuro] → a opção é explícita
  e local; o painel administrativo (RF44) pode reutilizá-la.
- [Menu desatualizado em outra aba aberta] → aceito; é a pendência de revalidação da sessão, prevista para a 4.4.

## Migration Plan

Sem migration nem mudança de infraestrutura. Deploy normal pelo Coolify (backend e frontend). Rollback: reverter o
merge; os dados gravados (nome e nome fantasia) continuam válidos para a versão anterior, que só deixa de editá-los.
