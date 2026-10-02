## Why

O cadastro (RF02/RF04) hoje identifica pelo nome exato qual campo já está duplicado, inclusive e-mail pessoal e celular pessoal — dado pessoal de uma pessoa física real. Como o endpoint é público e sem autenticação (`@AllowAnonymous`), qualquer um pode testar valores um de cada vez e descobrir, com certeza, se um e-mail ou celular específico já tem conta na plataforma (enumeração de usuário). CNPJ, e-mail institucional e celular institucional são dado de empresa/ONG, já público via Receita Federal no caso do CNPJ — expor esses continua aceitável. Prioriza-se segurança sobre a granularidade de UX que o requisito original previa.

## What Changes

- Duplicidade de CNPJ, e-mail institucional e celular institucional continua identificada explicitamente na resposta (campo a campo).
- Duplicidade de e-mail pessoal e/ou celular pessoal passa a gerar uma única indicação genérica (`fields: ["personal"]`, mensagem "Personal email or phone is already registered."), idêntica esteja um dos dois duplicado ou os dois ao mesmo tempo — não dá mais pra saber, pela resposta, se foi o e-mail ou o celular pessoal que colidiu.
- `entidades-beneficiarias/cadastro` ganha o requisito de unicidade formalmente documentado (já implementado no código com o mesmo padrão de `estabelecimentos/cadastro` desde a introdução do RF04, mas nunca tinha sido registrado como change própria — gap identificado e corrigido aqui).
- Sem mudança de schema, sem mudança de rota, sem mudança na checagem de unicidade em si (mesmas 5 colunas `@unique` consultadas) — só a granularidade da resposta de erro muda.

## Capabilities

### Modified Capabilities
- `estabelecimentos/cadastro`: revisa o requisito de unicidade — mensagem de duplicidade de dado pessoal (e-mail/celular) deixa de apontar o campo exato.

### Added Capabilities (documentação retroativa, sem mudança de comportamento)
- `entidades-beneficiarias/cadastro`: formaliza o requisito de unicidade (RF04), já implementado, nunca documentado como change própria.

## Impact

- **Backend**: `establishments.service.ts` e `beneficiary-entities.service.ts` — `checkUniqueness()` passa a agrupar `email`/`personalPhone` numa única chave `personal` antes de montar a lista de campos duplicados; `FIELD_LABELS` perde as entradas individuais de e-mail/celular pessoal e ganha `personal: 'personal email or phone'`; `buildDuplicateMessage()` agora capitaliza a primeira letra da frase.
- **Frontend**: fora desta change — sem tela de cadastro ainda.
- **Testes**: cobertura nova garantindo que duplicidade de e-mail pessoal e de celular pessoal produzem a mesma resposta, e que duplicidade simultânea dos dois ainda gera só uma entrada em `fields`.
