# Convenções

## Linguagem

- TypeScript em tudo: código de produção, configuração, testes e
  qualquer exemplo. Não usar `.js`/`.jsx`.
- Idioma do código: tudo em inglês — nomes de módulo/arquivo/classe/variável,
  schema do banco (`schema.prisma`), rotas, DTOs, corpo de request/response
  da API (JSON) e mensagens de erro retornadas pela API. Comentário no
  código, quando existir (ver "Comentários no código" abaixo), também em
  inglês.
- Idioma da documentação: pt-BR em tudo — Markdown em `docs/` e
  `openspec/`, e a documentação OpenAPI/Scalar (`summary`/`description`
  de `@ApiOperation`, `@ApiProperty`, `@ApiTags`, `DocumentBuilder`).
  Nomes de campo, `example` de DTO e o texto de erro que a API
  efetivamente devolve continuam em inglês mesmo dentro da doc — só o
  texto explicativo (o que o campo/rota faz) é traduzido.
- Na prática: se é algo que roda ou que a API devolve como dado, é
  inglês; se é texto pra humano ler sobre o sistema (doc, prosa de
  spec), é pt-BR.

## Comentários no código

Comentário só quando for **extremamente necessário** para explicar algo
complexo que o código sozinho não deixa claro — nunca por hábito. Antes de
escrever um, pergunte: "sem isso, alguém competente lendo este código correria
risco real de errar ou quebrar algo?" Se não, não comenta.

Não fazer:

- Documentar código como documentário — comentário de bloco no topo de
  função/componente/arquivo dizendo "o que isto faz" (estilo JSDoc/docstring).
  O nome e a assinatura de tipos já fazem esse trabalho.
- Registrar decisão de projeto no código (por que se escolheu X em vez de Y,
  referência a RF/número de decisão de design, contexto histórico). Isso vive
  em `openspec/` (proposal/design das changes) e em `docs/`, nunca no
  código-fonte.
- Narrar o óbvio — repetir em prosa o que a linha de código já diz.

Quando comentar (raro):

- Lógica genuinely não óbvia (ex: um algoritmo de concorrência, um cálculo
  cuja regra não salta aos olhos lendo a expressão).
- Um risco real de regressão que o código sozinho não sinaliza (ex: duas
  implementações que precisam ficar sincronizadas, um valor espelhado de
  outra camada/repositório, uma supressão de lint cuja causa não é óbvia).

Nesses casos, comentário curto e na linha relevante — nunca um bloco de
documentação no topo do arquivo ou da função.

## Backend

- Organização por módulo de feature (ex: `auth/`, `establishments/`,
  `beneficiary-entities/`), no padrão de módulos do NestJS.
- `prisma/schema.prisma` como única fonte de verdade do modelo de dados.

### Quando empacotar uma rota do better-auth

**Regra: só criar controller/service próprio em cima do better-auth quando
existe motivo funcional real. Se a rota nativa dele já faz exatamente o
que precisa, usar ela direto (`auth.api.*` no service, ou a própria rota
HTTP documentada) — não envolver por padrão, cada camada extra é
manutenção sem ganho.**

Casos reais deste projeto pra calibrar o julgamento:

- **Cadastro (`POST /establishments`/`/beneficiary-entities`) — empacotado, com motivo.**
  `auth.api.signUpEmail()` sozinho só cria `User`+`Account`; sem
  `Address`/`Establishment` o cadastro fica incompleto. Motivo real:
  gap de estado que só o nosso service resolve (transação atômica).
- **Login (`POST /auth/sign-in/email`) — não empacotado.** Rota nativa já
  faz tudo que RF07 precisa, sem gap nenhum. Usada direto.
- **Logout — tentativa de empacotar (`POST /logout` em `AppController`,
  chamando `auth.api.signOut()`), depois revertida pra usar
  `POST /auth/sign-out` nativo direto.** Motivo do revert: o wrapper não
  fazia nada a mais que a rota nativa já não fizesse (mesmo response
  shape, mesma lógica) — só existia por padrão herdado do cadastro, sem
  gap real. Pior: chamada programática (`auth.api.signOut()`) pula o
  `originCheckMiddleware` que a rota HTTP nativa aplica (proteção contra
  CSRF) — o wrapper enfraquecia segurança que já existia de graça na
  rota nativa. Motivo pra evitar wrapper "só porque sim": além de
  código extra sem função, é fácil pular proteção que a lib já
  resolve, sem perceber.

Antes de criar wrapper: perguntar "o que a rota nativa do better-auth
não faz que eu preciso?" Se a resposta for "nada", não criar.

### Rotas e documentação (`/auth`, tags do Scalar)

- `/auth/*` é reservado pro better-auth (`basePath` em `auth.instance.ts`,
  hoje `/auth`) e só pra rotas nativas dele (ex: `/auth/sign-in/email`,
  `/auth/sign-out`). **Nenhum controller nosso consegue registrar rota
  sob esse prefixo** — o pacote `@thallesp/nestjs-better-auth` monta o
  handler do better-auth como middleware global do Express, intercepta
  qualquer request sob `/auth/*` antes do router do Nest decidir
  qualquer coisa, e devolve 404 próprio pra sub-rota que ele não
  reconhece. Confirmado testando (`@Post('auth/logout')` registra no
  Nest, mas a rota nunca é alcançada). Endpoint próprio que é
  conceitualmente "auth" mas não tem equivalente nativo suficiente
  (ex: `GET /me`, já que `/auth/get-session` foi desabilitado) fica em
  rota raiz, nunca sob `/auth`.
- Agrupamento na doc (Scalar) é por `@ApiTags`, independente do path —
  `/me` fica raiz mas com `@ApiTags('Autenticação')` no método, mesmo
  grupo de `/auth/sign-in/email` e `/auth/sign-out`.
  - `@ApiTags` no método **soma** com `@ApiTags` da classe, não
    sobrescreve — não usar tag na classe se algum método precisar de
    tag diferente da dos outros (ex: `AppController`, que mistura rotas
    de grupos diferentes). Nesse caso, tag em todo método individualmente.
  - `SwaggerModule.createDocument(app, config, { autoTagControllers: false })`
    em `main.ts` — sem isso, controller sem `@ApiTags` explícito ganha
    tag automática com o nome da classe (`AppController` → tag `App`),
    que também some com a tag do método.

## Frontend

- Componentes funcionais com hooks, TypeScript estrito.
- Organização por feature/tela, não por tipo de arquivo.

## Commits

- Consultar arquivo `docs/COMMITS.md`

## Branches

- Consultar arquivo `docs/BRANCHES.md`.

## Regra para o agente

Ao gerar código, seguir os padrões acima. Se um padrão não estiver
coberto aqui, seguir o que já existe no restante do repositório em vez
de introduzir um estilo novo.
