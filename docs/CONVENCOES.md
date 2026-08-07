# Convenções

## Linguagem

- TypeScript em tudo: código de produção, configuração, testes e
  qualquer exemplo. Não usar `.js`/`.jsx`.

## Backend

- Organização por módulo de feature (ex: `auth/`, `estabelecimentos/`,
  `alimentos/`, `pedidos/`), no padrão de módulos do NestJS.
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
