# Convenções

## Linguagem

- TypeScript em tudo: código de produção, configuração, testes, seeds e
  qualquer exemplo. Não usar `.js`/`.jsx`.
- **Idioma do código: inglês.** Vale para nomes de módulo, arquivo, classe e
  variável, schema do banco (`schema.prisma`), rotas, DTOs, corpo de
  request/response da API (JSON), códigos e mensagens de erro retornados pela
  API, e valores de enum. Comentário no código, quando existir (ver
  "Comentários no código"), também em inglês.
- **Idioma da documentação: pt-BR.** Vale para o Markdown em `docs/` e
  `openspec/` e para a documentação OpenAPI/Scalar (`summary`/`description`
  de `@ApiOperation`, `@ApiProperty`, `@ApiTags`, `DocumentBuilder`). Nomes
  de campo, `example` de DTO e o texto de erro que a API devolve continuam
  em inglês mesmo dentro da doc; só o texto explicativo é traduzido.
- **Texto de interface: pt-BR**, sempre no frontend. O backend nunca devolve
  texto para mostrar na tela.
- Na prática: se roda ou se a API devolve como dado, é inglês; se é texto
  para uma pessoa ler (documentação, spec ou tela), é pt-BR.
- **Exceção conhecida:** os nomes em `food_status`, `order_status` e os
  motivos de cancelamento são dados em pt-BR ("Em andamento", "Alimento
  vencido"), porque são mostrados ao usuário como estão.

## Comentários no código

Comentário só quando for **extremamente necessário** para explicar algo
complexo que o código sozinho não deixa claro, nunca por hábito. Antes de
escrever um, pergunte: "sem isso, alguém competente lendo este código
correria risco real de errar ou quebrar algo?" Se não, não comente.

Não fazer:

- Documentar o código como um documentário: bloco no topo de
  função/componente/arquivo dizendo "o que isto faz" (estilo
  JSDoc/docstring). O nome e a assinatura de tipos já fazem esse trabalho.
- Registrar decisão de projeto no código (por que X em vez de Y, número de
  RF, contexto histórico). Isso fica em `openspec/` e em `docs/`, nunca no
  código-fonte.
- Repetir em prosa o que a linha de código já diz.

Quando comentar (raro):

- Lógica realmente não óbvia (um trecho de concorrência, um cálculo cuja
  regra não salta aos olhos).
- Um risco real de regressão que o código não sinaliza (duas implementações
  que precisam ficar sincronizadas, um valor espelhado de outra camada, uma
  supressão de lint com causa não óbvia).

Nesses casos, um comentário curto na linha relevante.

## Backend

### Organização

- Um módulo NestJS por feature (`auth/`, `establishments/`,
  `beneficiary-entities/`, `foods/`, `orders/`, `catalog/`, `suggestions/`,
  `files/`, `audit/`, `jobs/`, `admin/…`).
- `prisma/schema.prisma` é a única fonte de verdade do modelo de dados.
  Toda alteração passa por `prisma migrate dev` no ambiente local antes de
  subir. Nunca editar uma migration já aplicada.

### Status, tipos e motivos de sistema

- Status de alimento e de pedido são tabelas de domínio. O código acessa os
  nomes **só** por constantes centralizadas (ex.:
  `ORDER_STATUS.IN_PROGRESS = 'Em andamento'`). Nunca escrever a string
  solta numa query ou num `if`.
- O mesmo vale para os três motivos de sistema (`SYSTEM_CANCELLATION_REASON`).
- Tipos fixos novos são enums do Prisma (`docs/MODELO-DE-DADOS.md`).

### Regras de negócio e concorrência

- Toda operação que muda status de pedido ou estoque de alimento roda numa
  **única transação** (`prisma.$transaction`) e aplica todas as
  consequências da regra (RN07, RN08, RN09, RN20, RN28, RN29). Nunca em
  passos separados.
- **Estoque nunca fica negativo, mesmo com dois aceites ao mesmo tempo.**
  O desconto é um update condicional (`quantity >= x` no `where`, conferindo
  as linhas afetadas) ou um `SELECT … FOR UPDATE` no alimento antes de ler o
  estoque. Ler, calcular e gravar sem trava não é aceito.
- A transição de status também é condicional: o `where` do update inclui o
  status de origem. Se nenhuma linha foi afetada, outra requisição chegou
  antes, e a resposta é `409`.
- **Erros de negócio:** `409` (ou `400`, para entrada inválida) com
  `{ "code": "UPPER_SNAKE_CASE", "message": "..." }`. O frontend decide a
  mensagem pela `code`, nunca pelo texto. Códigos existentes do MVP:
  `ORDERS_IN_PROGRESS_LIMIT_REACHED` e `DUPLICATE_ORDER_IN_PROGRESS`. Todo
  `409` novo ganha uma `code`.

### Rotas

- Rotas de administrador ficam sob `/admin/*`, protegidas por guard de papel
  (`Administrator`). Instituição nunca acessa `/admin`; administrador não usa
  as rotas de instituição.
- `/auth/*` é reservado ao better-auth (ver abaixo).
- Listagens paginadas seguem o padrão do MVP: `page`, `pageSize` (padrão 20,
  teto 50), resposta `{ data, total, page, pageSize }`. Busca e ordenação
  por query string (`sort=field`, `order=asc|desc`).

### Auditoria

- Toda escrita feita por administrador grava uma linha em `audit_log` (RN46)
  pelo `AuditService`, **na mesma transação** da escrita. Se a auditoria
  falhar, a operação falha junto.
- `details` nunca leva senha, token ou chave.

### Tarefas agendadas

- Ficam em `jobs/`, são idempotentes e registram em log o início, o fim e
  quantos registros foram afetados (`docs/INFRAESTRUTURA.md`).

### Quando empacotar uma rota do better-auth

**Regra: só criar controller/service próprio em cima do better-auth quando
há motivo funcional real. Se a rota nativa já faz exatamente o que precisa,
usar ela direto (`auth.api.*` no service, ou a própria rota HTTP
documentada). Não envolver por padrão: cada camada a mais é manutenção sem
ganho.**

Casos reais deste projeto para calibrar:

- **Cadastro (`POST /establishments` / `/beneficiary-entities`): empacotado,
  com motivo.** `auth.api.signUpEmail()` sozinho só cria `User` + `Account`;
  sem `Address` e `Establishment` o cadastro fica incompleto. Motivo real:
  um estado que só o nosso service completa (transação atômica).
- **Login (`POST /auth/sign-in/email`): não empacotado.** A rota nativa faz
  tudo que o RF06 precisa.
- **Logout: empacotado e depois revertido.** O wrapper (`POST /logout`
  chamando `auth.api.signOut()`) não fazia nada além da rota nativa. Pior:
  a chamada programática pula o `originCheckMiddleware` que a rota HTTP
  nativa aplica (proteção contra CSRF). O wrapper enfraquecia uma segurança
  que já vinha de graça.
- **Recuperação de senha (RF08): não empacotada.** Usa as rotas nativas do
  plugin `emailOTP` (`/auth/email-otp/request-password-reset` e
  `/auth/email-otp/reset-password`). O limite de 10 minutos (RNF11) é
  configuração nativa (`rateLimit.customRules`), não código nosso.
- **Exclusão lógica (RF04, RF05, RF42, RF43): empacotada, com motivo.**
  Além de revogar as sessões, aplica as regras de pedidos e alimentos
  (RN28, RN29), o que o better-auth não faz.

Antes de criar um wrapper, pergunte: "o que a rota nativa do better-auth não
faz que eu preciso?" Se a resposta for "nada", não crie.

### Rotas e documentação (`/auth`, tags do Scalar)

- `/auth/*` é reservado ao better-auth (`basePath` em `auth.instance.ts`) e
  só serve para as rotas nativas dele. **Nenhum controller nosso consegue
  registrar rota sob esse prefixo.** O pacote `@thallesp/nestjs-better-auth`
  monta o handler do better-auth como middleware global do Express e
  intercepta qualquer request em `/auth/*` antes do router do Nest, devolvendo
  404 próprio para sub-rota que não reconhece. Endpoint próprio que é "de
  auth" mas não tem equivalente nativo (ex.: `GET /me`) fica na raiz, nunca
  sob `/auth`.
- O agrupamento na doc (Scalar) é por `@ApiTags`, independente do path: `/me`
  fica na raiz, com `@ApiTags('Autenticação')` no método.
  - `@ApiTags` no método **soma** com o `@ApiTags` da classe, não
    substitui. Não use tag na classe se algum método precisar de outra tag;
    nesse caso, coloque a tag em cada método.
  - `SwaggerModule.createDocument(app, config, { autoTagControllers: false })`
    em `main.ts`. Sem isso, controller sem `@ApiTags` ganha tag automática com
    o nome da classe.

## Frontend

- Componentes funcionais com hooks, TypeScript estrito.
- Organização por feature/tela, não por tipo de arquivo
  (`features/foods/`, `features/orders/`, `features/admin/…`).
- Stack fixa (não trocar): React 19, Vite 7 (não atualizar, ver
  `docs/INFRAESTRUTURA.md`), Tailwind v4, shadcn/ui, react-router-dom,
  TanStack Query, react-hook-form + zod (schemas espelham os DTOs do
  backend), cliente HTTP em `lib/api.ts`.
- **Rótulos de status e tipos** (texto em pt-BR para cada valor de enum ou
  status) ficam num único arquivo por domínio. Nada de `switch` de rótulo
  espalhado pelas telas.
- **Campos de lista padronizada** usam um único componente de select com
  busca (Combobox do shadcn), com a ação "Sugerir nova opção" (RN38).
  Nenhum formulário usa texto livre para categoria, alimento, unidade ou
  motivo.
- **Imagens** sempre pela URL que a API devolve (`/files/...`). O front
  nunca monta URL do MinIO.
- O painel administrativo é uma área separada do app (`/admin/...`), com
  layout próprio e `RoleRoute` para `Administrator`.
- O protótipo Pencil é referência visual. Se ele divergir de
  `docs/REQUISITOS.md`, vale o requisito, e a divergência é registrada na
  change (mesmo precedente do MVP).

## Fluxo de trabalho (OpenSpec)

- Cada item do `docs/PLANO-IMPLEMENTACAO.md` é **uma change**:
  `/opsx:propose <nome>` → revisão humana da proposta → `/opsx:apply` →
  verificação → `/opsx:archive` → commit → PR para `develop`.
- A proposta cita os RF/RN que cobre, **na numeração nova**.
- Ao terminar uma change, atualizar a coluna "Status" do
  `docs/PLANO-IMPLEMENTACAO.md` na mesma branch.

## Commits

- Ver `docs/COMMITS.md`.

## Branches

- Ver `docs/BRANCHES.md`. O código do requisito no nome da branch usa a
  numeração nova (`feat/rf26-cancelar-pedido`).

## Regra para o agente

Ao gerar código, seguir os padrões acima. Se um padrão não estiver coberto
aqui, seguir o que já existe no repositório, em vez de introduzir um estilo
novo. Se nem o repositório resolver, perguntar antes de decidir.
