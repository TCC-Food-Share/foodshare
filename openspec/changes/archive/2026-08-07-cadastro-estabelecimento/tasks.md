## 1. Dependências e infra do módulo

- [x] 1.1 Adicionar `class-validator` e `class-transformer` ao backend
- [x] 1.2 Adicionar `bcryptjs` (e `@types/bcryptjs`) ao backend
- [x] 1.3 Habilitar `ValidationPipe` global (com `whitelist`/`forbidNonWhitelisted`) em `main.ts`
- [x] 1.4 Criar módulo `prisma/` compartilhado com `PrismaService` (se ainda não existir)

## 2. Seed do papel "Estabelecimento"

- [x] 2.1 Criar `prisma/seed.ts` com `upsert` do papel "Estabelecimento" em `Papel`
- [x] 2.2 Configurar script de seed (`migrations.seed` em `prisma.config.ts` — Prisma v7 não usa mais `package.json`) e rodar localmente

## 3. Módulo `estabelecimentos`

- [x] 3.1 Criar `estabelecimentos.module.ts`, `estabelecimentos.controller.ts`, `estabelecimentos.service.ts`
- [x] 3.2 Criar `dto/criar-estabelecimento.dto.ts` (dados pessoais, institucionais e `EnderecoDto` aninhado) com decorators de validação de formato/obrigatoriedade
- [x] 3.3 Registrar `EstabelecimentosModule` em `AppModule`

## 4. Regra de negócio do cadastro

- [x] 4.1 Implementar hash da senha (`bcryptjs`) antes de persistir
- [x] 4.2 Implementar criação de `Endereco` + `Usuario` (papel "Estabelecimento") + `Estabelecimento` dentro de `prisma.$transaction`
- [x] 4.3 Mapear resposta de sucesso sem incluir a senha (hash ou texto)
- [x] 4.4 Capturar violação de unicidade (Prisma `P2002`) e retornar 409 genérico

## 5. Testes

- [x] 5.1 Teste unitário do service: cadastro com dados válidos cria as 3 entidades numa transação
- [x] 5.2 Teste unitário do service: senha nunca aparece na resposta
- [x] 5.3 Teste unitário/e2e: campo obrigatório ausente retorna erro de validação, nada é persistido
- [x] 5.4 Teste unitário/e2e: campo em formato inválido (e-mail, CNPJ, estado) retorna erro de validação
- [x] 5.5 Teste unitário/e2e: CNPJ/e-mail/celular duplicado retorna 409 genérico
- [x] 5.6 Teste e2e: `POST /estabelecimentos` end-to-end com sucesso
