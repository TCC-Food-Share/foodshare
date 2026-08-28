## Context

O cadastro de estabelecimento e de entidade beneficiária já existe (RF01/RF03), com `User`, `Address` e `Establishment`/`BeneficiaryEntity` como entidades relacionadas 1:1 (ver `backend/prisma/schema.prisma`). A checagem de unicidade de CNPJ/e-mail/celular no cadastro (RF02/RF04) já existe como padrão para reaproveitar. RF05 abre edição para os mesmos dados; RF06 (fora deste change) vai travar e-mail pessoal, CNPJ e razão social — a decisão deste design (restringir por whitelist) já deixa esses três campos de fora, então RF06 fica reduzido a garantir a trava explicitamente quando for implementado, sem exigir retrabalho aqui.

## Goals / Non-Goals

**Goals:**
- Definir a forma da edição (endpoint por tipo de conta, escopo sempre à conta autenticada, granularidade parcial dos campos).
- Reaproveitar validação de formato e checagem de unicidade já usadas no cadastro, sem duplicar regras.
- Manter a atualização de usuário/endereço/entidade atômica, como no cadastro.

**Non-Goals:**
- Implementar a trava de e-mail pessoal, CNPJ e razão social (RF06) — fica de fora por não estarem na whitelist de campos editáveis, sem necessidade de lógica extra agora.
- Editar nome do responsável ou nome fantasia (decisão registrada no proposal: não fazem parte da lista literal do RF05).
- Qualquer fluxo de confirmação por e-mail/SMS ao alterar contato — fora do escopo do MVP.

## Decisions

**Um endpoint `PATCH` por tipo de conta, sem `id` na rota.**
`PATCH /establishments/me` e `PATCH /beneficiary-entities/me`, resolvendo o registro a editar a partir do usuário autenticado (guard/token), nunca de um parâmetro de rota. Evita checagem extra de "é dono do registro?" — a própria resolução já impede IDOR.
Alternativa considerada: `PATCH /establishments/:id` com checagem de posse — descartada por adicionar uma superfície de erro (checar dono) que o design de "sempre a própria conta" elimina de saída.

**DTO com whitelist de campos editáveis, validado por `class-validator`/`ValidationPipe` com `whitelist: true`.**
O DTO de edição só declara os campos da spec (celular pessoal, celular institucional, e-mail institucional, imagem, descrição, endereço). Campo fora da whitelist (CNPJ, razão social, e-mail pessoal, nome, nome fantasia, senha) não gera erro de validação silenciosamente descartado — o `ValidationPipe` global do projeto já usa `forbidNonWhitelisted: true` (config existente, não introduzida por este change), então enviar um campo não editável rejeita a requisição inteira com 400 (`"property cnpj should not exist"`). Texto original deste documento assumia descarte silencioso — corrigido depois de testar manualmente e ver o 400. Resultado prático é até melhor pro objetivo da spec: cliente recebe feedback explícito de que aquele campo não é editável, em vez de um no-op silencioso.
Alternativa considerada: aceitar qualquer campo e ignorar manualmente os não editáveis no service — descartada por duplicar a whitelist em dois lugares (DTO e service), e por esconder do cliente que o campo foi ignorado.

**`NotFoundException` quando o usuário autenticado não tem `Establishment`/`BeneficiaryEntity` vinculado.**
Consequência direta de resolver o registro pelo `userId` da sessão: se o usuário autenticado for do outro tipo de conta (ex: estabelecimento chamando `PATCH /beneficiary-entities/me`) ou, em tese, não tiver nenhum registro vinculado, a busca por `userId` não acha nada — 404 genérico, sem detalhar o motivo. Confirmado manualmente (estabelecimento chamando o endpoint de entidade beneficiária → 404).

**Edição parcial campo a campo, endereço como sub-objeto tudo-ou-nada.**
Cada campo de contato/imagem/descrição é opcional individualmente no DTO. O endereço é um sub-objeto: se presente, todos os 6 campos (`postalCode`, `street`, `number`, `complement` opcional, `city`, `state`) são obrigatórios dentro dele — mesma validação usada no cadastro. Evita o caso de endereço com campos misturados entre valor novo e antigo.

**Unicidade validada antes do update, reaproveitando a checagem do RF02/RF04.**
Antes de persistir, o service verifica se celular pessoal, celular institucional ou e-mail institucional (quando enviados) já pertencem a outro `User`/`Establishment`/`BeneficiaryEntity` (excluindo o próprio registro sendo editado). Mesmo padrão de consulta usado no cadastro, adaptado para excluir o próprio id.
Alternativa considerada: deixar a constraint `@unique` do Prisma estourar e traduzir o erro `P2002` na camada HTTP — mantido como rede de segurança para condição de corrida, mas não como única validação, pois sozinho não distingue qual campo colidiu tão bem quanto a checagem prévia.

**Atualização com `prisma.$transaction`.**
Update de `User` (celulares/imagem), `Address` (quando enviado) e `Establishment`/`BeneficiaryEntity` (celular institucional/e-mail institucional/descrição) dentro de uma transação — mesmo padrão do cadastro atômico (RF01/RF03).

## Risks / Trade-offs

- [Condição de corrida entre a checagem prévia de unicidade e o update] → mitigado pela constraint `@unique` do Prisma como rede de segurança; erro `P2002` traduzido para a mesma mensagem de conflito de campo.
- [Whitelist do DTO desalinhar da spec se o schema Prisma mudar] → mitigado por manter o DTO como único ponto de verdade dos campos editáveis, revisado junto de qualquer PR que altere `User`/`Address`/`Establishment`/`BeneficiaryEntity`.
- [Front-end enviar endereço parcial por engano] → mitigado pela validação tudo-ou-nada do sub-objeto endereço, com mensagem de erro clara.
