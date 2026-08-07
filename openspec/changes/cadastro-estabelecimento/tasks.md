## 1. Dependências e infra do módulo

- [ ] 1.1 Adicionar `class-validator` e `class-transformer` ao backend
- [ ] 1.2 Adicionar `bcryptjs` (e `@types/bcryptjs`) ao backend
- [ ] 1.3 Habilitar `ValidationPipe` global (com `whitelist`/`forbidNonWhitelisted`) em `main.ts`
- [ ] 1.4 Criar módulo `prisma/` compartilhado com `PrismaService` (se ainda não existir)

## 2. Seed do papel "Estabelecimento"

- [ ] 2.1 Criar `prisma/seed.ts` com `upsert` do papel "Estabelecimento" em `Papel`
- [ ] 2.2 Configurar script de seed (`prisma.seed` no `package.json`) e rodar localmente

## 3. Módulo `estabelecimentos`

- [ ] 3.1 Criar `estabelecimentos.module.ts`, `estabelecimentos.controller.ts`, `estabelecimentos.service.ts`
- [ ] 3.2 Criar `dto/criar-estabelecimento.dto.ts` (dados pessoais, institucionais e `EnderecoDto` aninhado) com decorators de validação de formato/obrigatoriedade
- [ ] 3.3 Registrar `EstabelecimentosModule` em `AppModule`

## 4. Regra de negócio do cadastro

- [ ] 4.1 Implementar hash da senha (`bcryptjs`) antes de persistir
- [ ] 4.2 Implementar criação de `Endereco` + `Usuario` (papel "Estabelecimento") + `Estabelecimento` dentro de `prisma.$transaction`
- [ ] 4.3 Mapear resposta de sucesso sem incluir a senha (hash ou texto)
- [ ] 4.4 Capturar violação de unicidade (Prisma `P2002`) e retornar 409 genérico

## 5. Testes

- [ ] 5.1 Teste unitário do service: cadastro com dados válidos cria as 3 entidades numa transação
- [ ] 5.2 Teste unitário do service: senha nunca aparece na resposta
- [ ] 5.3 Teste unitário/e2e: campo obrigatório ausente retorna erro de validação, nada é persistido
- [ ] 5.4 Teste unitário/e2e: campo em formato inválido (e-mail, CNPJ, estado) retorna erro de validação
- [ ] 5.5 Teste unitário/e2e: CNPJ/e-mail/celular duplicado retorna 409 genérico
- [ ] 5.6 Teste e2e: `POST /estabelecimentos` end-to-end com sucesso
