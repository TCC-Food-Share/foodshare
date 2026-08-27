## Context

`EntidadesBeneficiariasService.criar` (ver `backend/src/entidades-beneficiarias/entidades-beneficiarias.service.ts`) já cria `Usuario` + `Endereco` + `EntidadeBeneficiaria` numa `prisma.$transaction`, e já captura violação de unicidade do Prisma (`P2002`) devolvendo `ConflictException('CNPJ, e-mail ou celular já cadastrado.')` genérica — sem dizer qual campo colidiu. As constraints únicas relevantes já existem em `prisma/schema.prisma`: `Usuario.email`, `Usuario.celularPessoal`, `EntidadeBeneficiaria.cnpj`, `EntidadeBeneficiaria.emailInstitucional`, `EntidadeBeneficiaria.celularInstitucional`.

A change `unicidade-cadastro-estabelecimento` (RF02) já resolveu exatamente o mesmo problema para `EstabelecimentosService`, com a mesma forma de dados (`Usuario` + `Endereco` + entidade institucional, mesmos 5 campos únicos). Esta change replica a mesma decisão de design para `EntidadesBeneficiariasService`, sem reabrir as alternativas já descartadas naquela change.

## Goals / Non-Goals

**Goals:**
- Antes do `INSERT`, checar todos os 5 campos únicos contra o banco e reportar, numa única resposta 409, todos os campos que já colidem com outro cadastro.
- Manter a captura de `P2002` como rede de segurança para a corrida entre duas submissões concorrentes.
- Preservar a atomicidade e o comportamento já existente (transação única, sem registro parcial).
- Manter a resposta 409 estruturada (`message` + `campos`) no mesmo formato já usado por `EstabelecimentosService`, para consistência de contrato de API entre os dois cadastros.

**Non-Goals:**
- Unicidade cruzada com `Estabelecimento` (schema já trata como tabelas/constraints separadas; RF04 é só sobre "cadastro de entidades beneficiárias" — um CNPJ já usado por um estabelecimento não bloqueia o cadastro de uma entidade beneficiária, e vice-versa, pois `Usuario.email`/`celularPessoal` são a única tabela compartilhada entre os dois papéis e já é coberta pela checagem em `Usuario`).
- Mudar o formato de erro de validação de campo obrigatório/formato (`ValidationPipe` — já responde 400 e não muda aqui).
- Resolver a corrida de forma perfeita com uma segunda consulta pós-`P2002` para nomear o campo exato do conflito concorrente — ver Risks/Trade-offs.

## Decisions

**Pré-checagem com 5 consultas independentes antes da transação** — o service roda `Promise.all` de 5 `findUnique`, um por coluna única: `usuario.findUnique({ where: { email } })`, `usuario.findUnique({ where: { celularPessoal } })`, `entidadeBeneficiaria.findUnique({ where: { cnpj } })`, `entidadeBeneficiaria.findUnique({ where: { emailInstitucional } })`, `entidadeBeneficiaria.findUnique({ where: { celularInstitucional } })`. Cada `findUnique` é um lookup direto no índice da constraint única — sem ambiguidade sobre qual campo colidiu. Mesma decisão da change de RF02, aqui aplicada ao model `EntidadeBeneficiaria`.

Alternativa descartada: `findFirst` com `OR` (uma query por model, 2 no total) comparando o registro achado campo a campo. Rejeitada pelo mesmo motivo da change de RF02 — `OR`+`findFirst` só retorna **uma linha**, podendo deixar passar um segundo campo duplicado que colide com outro registro.

Alternativa descartada: continuar só com `P2002` e parsear `error.meta.target` pra nomear o campo. Rejeitada pelo mesmo motivo da change de RF02 — o Postgres para no primeiro `UNIQUE` violado, obrigando a várias idas e vindas pra corrigir um cadastro com múltiplas colisões.

**Resposta 409 estruturada** — `ConflictException` recebe um objeto (não só string), no formato:
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "CNPJ e e-mail institucional já cadastrados.",
  "campos": ["cnpj", "emailInstitucional"]
}
```
`campos` usa os mesmos nomes de propriedade do DTO (`cnpj`, `emailInstitucional`, `celularInstitucional`, `email`, `celularPessoal`), pra o consumidor (frontend, quando existir) apontar o campo certo no formulário sem parsear a mensagem em texto livre. `message` continua uma frase amigável em pt-BR pra exibição direta. Mesmo formato usado em `EstabelecimentosService`, reaproveitando a lógica de montagem de mensagem (`montarMensagemDuplicidade`/`CAMPO_LABELS`) — copiada para `entidades-beneficiarias.service.ts` em vez de extraída para um helper compartilhado, para manter os dois módulos de cadastro independentes um do outro (mesmo padrão de organização já usado no restante do backend, sem módulo `shared/` para lógica de domínio).

**`P2002` continua tratado, mas sem lista de campos** — se a corrida ocorrer (dois cadastros concorrentes passam pela pré-checagem antes de qualquer um persistir), o `catch` existente continua devolvendo a mensagem genérica atual (sem `campos`), porque remontar quais colidiram nesse ponto exigiria uma segunda consulta pós-falha — não vale o custo pra um caso raro que ainda assim impede o cadastro duplicado (garantia principal do RF04 preservada pela constraint do banco).

## Risks / Trade-offs

- [5 queries extras (`findUnique` por coluna única) antes de todo cadastro] → índices já existem nas colunas únicas (constraint única cria índice); cada lookup é O(1) por índice, custo desprezível pro volume esperado do MVP.
- [Janela de corrida entre a pré-checagem e o `INSERT`: dois cadastros concorrentes ainda podem colidir] → constraint única do banco garante que só um dos dois persiste; mensagem nesse caso é genérica (sem `campos`), consistente com o comportamento já existente antes desta change.
- [Resposta 409 estruturada (`campos`) é uma mudança de contrato da API em relação ao 409 genérico atual] → não há consumidor (frontend) implementado ainda pra esse endpoint, então não há breaking change real; já é o mesmo formato adotado por `EstabelecimentosService`.
- [Lógica de montagem de mensagem duplicada entre `estabelecimentos.service.ts` e `entidades-beneficiarias.service.ts`] → duplicação pequena (labels de 5 campos + função de formatação) aceita para manter os módulos independentes; se um terceiro cadastro precisar do mesmo padrão, vale extrair para um helper compartilhado nessa hora.

## Migration Plan

- Nenhuma migração de schema (constraints já existem).
- Mudança isolada ao service; substitui o corpo do `catch (P2002)` existente e adiciona a pré-checagem antes da transação. Reverter o deploy remove a pré-checagem e volta ao 409 genérico único, sem efeito em dados.
