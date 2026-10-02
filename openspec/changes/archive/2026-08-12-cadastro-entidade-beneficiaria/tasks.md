## 1. Seed do papel "EntidadeBeneficiaria"

- [x] 1.1 Adicionar `upsert` do papel "EntidadeBeneficiaria" em `prisma/seed.ts` (mesmo script já usado pra "Estabelecimento")
- [x] 1.2 Rodar seed localmente e confirmar os dois papéis presentes em `Papel`

## 2. Módulo `entidades-beneficiarias`

- [x] 2.1 Criar `entidades-beneficiarias.module.ts`, `entidades-beneficiarias.controller.ts`, `entidades-beneficiarias.service.ts`
- [x] 2.2 Criar `dto/criar-entidade-beneficiaria.dto.ts` (dados pessoais, institucionais) reaproveitando `EnderecoDto` já existente em `estabelecimentos/dto`, com decorators de validação de formato/obrigatoriedade
- [x] 2.3 Registrar `EntidadesBeneficiariasModule` em `AppModule`

## 3. Regra de negócio do cadastro

- [x] 3.1 Implementar hash da senha (`bcryptjs`) antes de persistir
- [x] 3.2 Implementar criação de `Endereco` + `Usuario` (papel "EntidadeBeneficiaria") + `EntidadeBeneficiaria` dentro de `prisma.$transaction`
- [x] 3.3 Mapear resposta de sucesso sem incluir a senha (hash ou texto)
- [x] 3.4 Capturar violação de unicidade (Prisma `P2002`) e retornar 409 genérico

## 4. Testes

- [x] 4.1 Teste unitário do service: cadastro com dados válidos cria as 3 entidades numa transação
- [x] 4.2 Teste unitário do service: senha nunca aparece na resposta
- [x] 4.3 Teste unitário/e2e: campo obrigatório ausente retorna erro de validação, nada é persistido
- [x] 4.4 Teste unitário/e2e: campo em formato inválido (e-mail, CNPJ, estado) retorna erro de validação
- [x] 4.5 Teste unitário/e2e: CNPJ/e-mail/celular duplicado retorna 409 genérico
- [x] 4.6 Teste e2e: `POST /entidades-beneficiarias` end-to-end com sucesso
