## Context

`EstabelecimentosService.criar` (ver `backend/src/estabelecimentos/estabelecimentos.service.ts`) já cria `Usuario` + `Endereco` + `Estabelecimento` numa `prisma.$transaction`, e já captura violação de unicidade do Prisma (`P2002`) devolvendo `ConflictException('CNPJ, e-mail ou celular já cadastrado.')` genérica — sem dizer qual campo colidiu. Isso foi decisão deliberada da change anterior (`cadastro-estabelecimento`), que deixou explícito no seu design.md que "mensagem amigável por campo" era RF02, fora daquele escopo. As constraints únicas relevantes já existem em `prisma/schema.prisma`: `Usuario.email`, `Usuario.celularPessoal`, `Estabelecimento.cnpj`, `Estabelecimento.emailInstitucional`, `Estabelecimento.celularInstitucional`.

## Goals / Non-Goals

**Goals:**
- Antes do `INSERT`, checar todos os 5 campos únicos contra o banco e reportar, numa única resposta 409, todos os campos que já colidem com outro cadastro.
- Manter a captura de `P2002` como rede de segurança para a corrida entre duas submissões concorrentes.
- Preservar a atomicidade e o comportamento já existente (transação única, sem registro parcial).

**Non-Goals:**
- Unicidade cruzada com `EntidadeBeneficiaria` (schema já trata como tabelas/constraints separadas; RF02 é só sobre "cadastro de estabelecimentos"). RF04 (entidade beneficiária) é change própria com o mesmo padrão.
- Mudar o formato de erro de validação de campo obrigatório/formato (`ValidationPipe` — já responde 400 e não muda aqui).
- Resolver a corrida de forma perfeita com uma segunda consulta pós-`P2002` para nomear o campo exato do conflito concorrente — ver Risks/Trade-offs.

## Decisions

**Pré-checagem com 5 consultas independentes antes da transação** — o service roda `Promise.all` de 5 `findUnique`, um por coluna única: `usuario.findUnique({ where: { email } })`, `usuario.findUnique({ where: { celularPessoal } })`, `estabelecimento.findUnique({ where: { cnpj } })`, `estabelecimento.findUnique({ where: { emailInstitucional } })`, `estabelecimento.findUnique({ where: { celularInstitucional } })`. Cada `findUnique` é um lookup direto no índice da constraint única — sem ambiguidade sobre qual campo colidiu.

Alternativa descartada: `findFirst` com `OR` (uma query por model, 2 no total) comparando o registro achado campo a campo. Rejeitada porque `OR`+`findFirst` só retorna **uma linha**, e essa linha pode não ser a mesma que colide em cada campo — ex.: CNPJ colide com o Estabelecimento A, e-mail institucional colide com o Estabelecimento B; `findFirst` acha só um dos dois, e o outro campo duplicado passaria batido. 5 `findUnique` independentes evitam esse falso negativo ao custo de mais round-trips (aceitável — cada um é um index lookup trivial).

Alternativa descartada: continuar só com `P2002` e parsear `error.meta.target` pra nomear o campo. Rejeitada porque o Postgres para no primeiro `UNIQUE` violado — o usuário só saberia de um campo por tentativa, obrigando a várias idas e vindas pra corrigir um cadastro com múltiplas colisões (decisão confirmada com o usuário na proposta desta change).

**Resposta 409 estruturada** — `ConflictException` recebe um objeto (não só string), no formato:
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "CNPJ e e-mail institucional já cadastrados.",
  "campos": ["cnpj", "emailInstitucional"]
}
```
`campos` usa os mesmos nomes de propriedade do DTO (`cnpj`, `emailInstitucional`, `celularInstitucional`, `email`, `celularPessoal`), pra o consumidor (frontend, quando existir) apontar o campo certo no formulário sem parsear a mensagem em texto livre. `message` continua uma frase amigável em pt-BR pra exibição direta.

**`P2002` continua tratado, mas sem lista de campos** — se a corrida ocorrer (dois cadastros concorrentes passam pela pré-checagem antes de qualquer um persistir), o `catch` existente continua devolvendo a mensagem genérica atual (sem `campos`), porque remontar quais colidiram nesse ponto exigiria uma segunda consulta pós-falha — não vale o custo pra um caso raro que ainda assim impede o cadastro duplicado (garantia principal do RF02 preservada pela constraint do banco).

## Risks / Trade-offs

- [5 queries extras (`findUnique` por coluna única) antes de todo cadastro] → índices já existem nas colunas únicas (constraint única cria índice); cada lookup é O(1) por índice, custo desprezível pro volume esperado do MVP.
- [Janela de corrida entre a pré-checagem e o `INSERT`: dois cadastros concorrentes ainda podem colidir] → constraint única do banco garante que só um dos dois persiste; mensagem nesse caso é genérica (sem `campos`), consistente com o comportamento já existente antes desta change.
- [Resposta 409 estruturada (`campos`) é uma mudança de contrato da API em relação ao 409 genérico atual] → não há consumidor (frontend) implementado ainda pra esse endpoint, então não há breaking change real; documentado aqui pra quando o frontend for construído.

## Migration Plan

- Nenhuma migração de schema (constraints já existem).
- Mudança isolada ao service; substitui o corpo do `catch (P2002)` existente e adiciona a pré-checagem antes da transação. Reverter o deploy remove a pré-checagem e volta ao 409 genérico único, sem efeito em dados.
