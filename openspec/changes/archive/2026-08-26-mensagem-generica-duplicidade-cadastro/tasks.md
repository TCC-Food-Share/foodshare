## 1. Mensagem genérica pra duplicidade de dado pessoal

- [x] 1.1 Em `backend/src/establishments/establishments.service.ts`, agrupar `email` e `personalPhone` numa chave só (`personal`) em `checkUniqueness()`, antes de qualquer um dos dois virar entrada em `duplicateFields`
- [x] 1.2 Atualizar `FIELD_LABELS`: remover `email`/`personalPhone` individuais, adicionar `personal: 'personal email or phone'`
- [x] 1.3 Capitalizar a primeira letra da mensagem final em `buildDuplicateMessage()`
- [x] 1.4 Espelhar 1.1–1.3 em `backend/src/beneficiary-entities/beneficiary-entities.service.ts`

## 2. Documentação retroativa da unicidade em entidades-beneficiarias

- [x] 2.1 Adicionar `## ADDED Requirements` com a unicidade de CNPJ/e-mail/celular pra `entidades-beneficiarias/cadastro` (já implementado, nunca documentado)

## 3. Testes

- [x] 3.1 Teste unitário (establishments e beneficiary-entities): duplicidade só de e-mail pessoal gera `fields: ["personal"]`
- [x] 3.2 Teste unitário: duplicidade de e-mail pessoal e celular pessoal ao mesmo tempo ainda gera uma única entrada `"personal"` em `fields`, não duas
- [x] 3.3 Teste unitário: duplicidade de CNPJ/e-mail institucional/celular institucional continua identificada campo a campo
- [x] 3.4 Verificação manual (`curl`): e-mail pessoal duplicado e celular pessoal duplicado retornam resposta byte-idêntica
