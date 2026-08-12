## 1. Checagem prévia de unicidade

- [x] 1.1 Em `estabelecimentos.service.ts`, antes da `$transaction`, consultar em paralelo (`Promise.all`) 5 `findUnique` independentes, um por coluna única: `usuario.findUnique({ where: { email } })`, `usuario.findUnique({ where: { celularPessoal } })`, `estabelecimento.findUnique({ where: { cnpj } })`, `estabelecimento.findUnique({ where: { emailInstitucional } })`, `estabelecimento.findUnique({ where: { celularInstitucional } })`
- [x] 1.2 A partir dos 5 resultados (`null` ou registro), montar a lista de nomes de campos duplicados (`cnpj`, `emailInstitucional`, `celularInstitucional`, `email`, `celularPessoal`)
- [x] 1.3 Se a lista não estiver vazia, lançar `ConflictException` com `{ message, campos }` (mensagem amigável citando os campos; nenhuma query de criação é executada)

## 2. Resposta de erro estruturada

- [x] 2.1 Definir o formato do payload de conflito (`message: string`, `campos: string[]`) e montar a mensagem amigável em pt-BR a partir da lista de campos duplicados (singular/plural conforme quantidade)
- [x] 2.2 Manter o `catch` de `P2002` existente devolvendo a mensagem genérica atual (sem `campos`), cobrindo a corrida entre duas submissões concorrentes

## 3. Testes

- [x] 3.1 Teste unitário: CNPJ já cadastrado (único campo duplicado) → `ConflictException` com `campos: ['cnpj']`, nenhuma query de criação chamada
- [x] 3.2 Teste unitário: e-mail institucional e celular pessoal duplicados na mesma submissão → `ConflictException` com `campos` contendo ambos, numa única resposta
- [x] 3.3 Teste unitário: nenhum campo duplicado → segue para a transação de criação normalmente
- [x] 3.4 Teste unitário: `P2002` lançado durante a transação (corrida) → `ConflictException` genérica (sem `campos`), como já coberto hoje
- [x] 3.5 Teste e2e: `POST /estabelecimentos` com CNPJ já existente retorna 409 identificando o campo `cnpj`
