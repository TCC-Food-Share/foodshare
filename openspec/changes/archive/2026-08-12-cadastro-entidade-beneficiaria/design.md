## Context

Backend é NestJS + Prisma + PostgreSQL. O módulo `estabelecimentos/` (RF01) já existe e estabeleceu o padrão: `PrismaService` compartilhado em `backend/src/prisma/`, `ValidationPipe` global habilitado, hash de senha com `bcryptjs`, seed de papéis via `prisma/seed.ts`. `Usuario`, `Endereco`, `EntidadeBeneficiaria` e `Papel` já existem em `prisma/schema.prisma`. `Papel` tem hoje só "Estabelecimento" semeado. Esta change replica a mesma estrutura para entidade beneficiária, reaproveitando toda a infra já criada — não repete decisões já tomadas em `estabelecimentos/`.

## Goals / Non-Goals

**Goals:**
- Endpoint `POST /entidades-beneficiarias` que cria `Usuario` + `Endereco` + `EntidadeBeneficiaria` numa transação.
- Validação de formato/obrigatoriedade dos campos de entrada.
- Hash de senha antes de persistir.
- Seed do papel "EntidadeBeneficiaria".

**Non-Goals:**
- Checagem de unicidade de CNPJ/e-mail/celular com mensagem amigável por campo (RF04 — outra change).
- Login/emissão de sessão ou token (RF07-09 — outra change).
- Qualquer UI/formulário de cadastro (frontend fica de fora, ver proposal.md).

## Decisions

**Módulo `entidades-beneficiarias/`** — controller + service + DTOs, mesmo padrão de `estabelecimentos/` (módulo por feature, `docs/CONVENCOES.md`). Reaproveita `PrismaService` já existente em `backend/src/prisma/` — nenhum módulo compartilhado novo é necessário.

**Validação com `class-validator` + `class-transformer`** — mesma abordagem de `estabelecimentos/`; `EnderecoDto` pode ser reaproveitado/importado do módulo `estabelecimentos/` em vez de duplicado, já que o formato de endereço é idêntico.

**Hash de senha com `bcryptjs`** — já adotado em `estabelecimentos/` pela mesma razão (evitar binário nativo na VPS ARM64, ver `docs/INFRAESTRUTURA.md`). Sem alternativa a considerar aqui; decisão já validada na change anterior.

**Transação via `prisma.$transaction`** — cria `Endereco`, depois `Usuario` (com `idPapel` do papel "EntidadeBeneficiaria"), depois `EntidadeBeneficiaria` vinculando os dois, tudo na mesma transação. Se qualquer etapa falhar, o Prisma reverte as três.

**Seed do papel "EntidadeBeneficiaria" via `prisma/seed.ts`** — adiciona um segundo `upsert` (por `nome`) no mesmo script já usado pra "Estabelecimento", mantendo um único script de seed idempotente pro projeto em vez de criar um novo.

**Erro de violação de unicidade tratado de forma genérica** — mesmo tratamento de `estabelecimentos/`: captura `P2002` do Prisma e retorna 409 genérico ("CNPJ, e-mail ou celular já cadastrado"), sem apontar o campo. RF04 (mensagem por campo) é change própria.

## Risks / Trade-offs

- [`bcryptjs` é mais lento que `bcrypt` nativo] → já aceito na change de RF01; mesmo trade-off se aplica aqui.
- [Erro 409 genérico de duplicidade não diz qual campo colidiu] → aceitável até RF04; UX melhora quando aquela change chegar.
- [Duplicação de `EnderecoDto` entre módulos se não for reaproveitado] → mitigado reimportando o DTO existente de `estabelecimentos/` em vez de recriar.

## Migration Plan

- Nenhuma migração de schema é necessária (tabelas já existem).
- Rodar `prisma db seed` (script já existente, com novo `upsert` incluído) pra popular `Papel` com "EntidadeBeneficiaria", em cada ambiente após o deploy.
- Sem rollback especial: reverter o deploy do módulo remove o endpoint; dado de seed do papel pode permanecer sem problema (idempotente, não é destrutivo).
