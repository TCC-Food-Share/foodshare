## Context

Backend é NestJS + Prisma + PostgreSQL, ainda no scaffold inicial (só `AppModule`, sem módulos de feature). `Usuario`, `Endereco`, `Estabelecimento` e `Papel` já existem em `prisma/schema.prisma`. `Papel` está vazio — nenhuma role foi semeada. Backend hoje usa `@nestjs/platform-express`; nada nesta change depende disso, então não é alterado aqui. VPS (Oracle Cloud ARM64) já teve problema conhecido com binário nativo em outra dependência (ver `docs/INFRAESTRUTURA.md`), o que pesa na escolha da lib de hash.

## Goals / Non-Goals

**Goals:**
- Endpoint `POST /estabelecimentos` que cria `Usuario` + `Endereco` + `Estabelecimento` numa transação.
- Validação de formato/obrigatoriedade dos campos de entrada.
- Hash de senha antes de persistir.
- Seed do papel "Estabelecimento".

**Non-Goals:**
- Checagem de unicidade de CNPJ/e-mail/celular com mensagem amigável por campo (RF02 — outra change).
- Login/emissão de sessão ou token (RF07-09 — outra change).
- Qualquer UI/formulário de cadastro (frontend fica de fora, ver proposal.md).

## Decisions

**Módulo `estabelecimentos/`** — controller + service + DTOs, seguindo o padrão de módulo por feature já definido em `docs/CONVENCOES.md`. `PrismaService` fica em um módulo compartilhado (`prisma/`) reutilizável pelos módulos futuros (`auth/`, `alimentos/`, `pedidos/`).

**Validação com `class-validator` + `class-transformer`** — padrão idiomático do NestJS pra DTO validation via `ValidationPipe`. Alternativa (validar manualmente no service) foi descartada por gerar mais código repetido e menos declarativo pros próximos módulos que vão precisar do mesmo padrão.

**Hash de senha com `bcryptjs` (implementação pura em JS), não `bcrypt`/`argon2` nativos** — `bcrypt` e `argon2` exigem compilação de binário nativo; a VPS (ARM64, Coolify) já teve build quebrado por binário nativo com outra dependência (Rolldown/Vite, ver `docs/INFRAESTRUTURA.md`). `bcryptjs` evita esse risco por completo, ao custo de ser mais lento — aceitável pro volume de cadastro esperado no MVP.

**Transação via `prisma.$transaction`** — cria `Endereco`, depois `Usuario` (com `idPapel` do papel "Estabelecimento"), depois `Estabelecimento` vinculando os dois, tudo dentro da mesma transação. Se qualquer etapa falhar, o Prisma reverte as três.

**Seed do papel "Estabelecimento" via `prisma/seed.ts`** — script de seed padrão do Prisma (`prisma db seed`), com `upsert` por `nome` pra ser idempotente. Roda depois de `prisma migrate dev` em cada ambiente (local e staging), conforme convenção já documentada em `docs/MODELO-DE-DADOS.md`.

**Erro de violação de unicidade tratado de forma genérica** — como RF02 (mensagem amigável por campo) é outra change, aqui o service só captura o erro de constraint única do Prisma (`P2002`) e retorna 409 genérico ("CNPJ, e-mail ou celular já cadastrado"), sem apontar o campo. Evita vazar erro cru do Prisma pro cliente enquanto RF02 não chega.

## Risks / Trade-offs

- [`bcryptjs` é mais lento que `bcrypt` nativo] → aceitável no volume esperado do MVP; pode ser revisto se hash virar gargalo.
- [Erro 409 genérico de duplicidade não diz qual campo colidiu] → aceitável até RF02; UX melhora quando aquela change chegar.
- [Sem verificação de unicidade em nível de aplicação antes do insert] → constraint única do banco garante integridade mesmo sem RF02; só a mensagem de erro fica menos amigável nesse meio-tempo.

## Migration Plan

- Nenhuma migração de schema é necessária (tabelas já existem).
- Rodar `prisma db seed` (novo script) pra popular `Papel` com "Estabelecimento", em cada ambiente após o deploy.
- Sem rollback especial: reverter o deploy do módulo remove o endpoint; dado de seed do papel pode permanecer sem problema (idempotente, não é destrutivo).
