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
