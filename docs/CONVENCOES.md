# Convenções

## Linguagem

- TypeScript em tudo: código de produção, configuração, testes e
  qualquer exemplo. Não usar `.js`/`.jsx`.
- Idioma do código: tudo em inglês — nomes de módulo/arquivo/classe/variável,
  schema do banco (`schema.prisma`), rotas, DTOs, corpo de request/response
  da API (JSON) e mensagens de erro retornadas pela API. Comentário no
  código só quando estritamente necessário (lógica não óbvia); quando
  existir, também em inglês.
- Idioma da documentação: pt-BR em tudo — Markdown em `docs/` e
  `openspec/`, e a documentação OpenAPI/Scalar (`summary`/`description`
  de `@ApiOperation`, `@ApiProperty`, `@ApiTags`, `DocumentBuilder`).
  Nomes de campo, `example` de DTO e o texto de erro que a API
  efetivamente devolve continuam em inglês mesmo dentro da doc — só o
  texto explicativo (o que o campo/rota faz) é traduzido.
- Na prática: se é algo que roda ou que a API devolve como dado, é
  inglês; se é texto pra humano ler sobre o sistema (doc, prosa de
  spec), é pt-BR.

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
