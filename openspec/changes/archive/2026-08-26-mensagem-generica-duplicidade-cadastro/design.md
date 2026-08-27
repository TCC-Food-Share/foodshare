## Context

O cadastro (RF02/RF04) checa unicidade de 5 campos antes de criar a conta: CNPJ, e-mail institucional, celular institucional, e-mail pessoal e celular pessoal. A implementação original (RF02) reporta explicitamente qual desses campos colidiu, de propósito — pra o usuário saber o que corrigir no formulário. É endpoint público, sem autenticação.

## Goals / Non-Goals

**Goals:**
- Impedir que alguém descubra, testando um e-mail ou celular pessoal por vez num endpoint público, se aquele dado já tem conta na plataforma.
- Manter a granularidade explícita onde o dado não é pessoal (CNPJ, e-mail/celular institucional) — não tem o mesmo risco de privacidade.

**Non-Goals:**
- Implementar confirmação de conta por e-mail (padrão usado por GitHub e afins: resposta do cadastro é sempre a mesma, a diferença aparece só no conteúdo do e-mail enviado). Foi cogitado primeiro, mas exige envio de e-mail transacional — infraestrutura que não existe no projeto (`.env` não tem nenhuma credencial de SMTP/serviço de e-mail) — e cadastro deixar de ser síncrono (hoje `POST /establishments` cria tudo e devolve o recurso na hora; o padrão de confirmação exige um estado "pendente" até o clique no link). Isso é feature nova, não ajuste de mensagem de erro — fica pra um RF futuro se o projeto adotar envio de e-mail.

## Decisions

**Agrupar e-mail pessoal e celular pessoal numa chave `personal` só, antes de montar a lista de campos duplicados.**
```ts
const duplicateFields: string[] = [];
if (cnpjDup) duplicateFields.push('cnpj');
if (institutionalEmailDup) duplicateFields.push('institutionalEmail');
if (institutionalPhoneDup) duplicateFields.push('institutionalPhone');
if (personalEmailDup || personalPhoneDup) duplicateFields.push('personal');
```
Resultado: resposta idêntica testando e-mail pessoal duplicado ou celular pessoal duplicado — quem tenta enumerar não consegue diferenciar os dois casos, nem saber se testou os dois ao mesmo tempo ou só um.

CNPJ, e-mail institucional e celular institucional continuam explícitos: CNPJ já é público via Receita Federal (não tem segredo em confirmar que aquele CNPJ está na plataforma), e e-mail/celular institucional é contato de pessoa jurídica, não de pessoa física — risco de privacidade bem menor que dado pessoal.

Alternativa considerada: mensagem 100% genérica pra qualquer duplicidade (nenhum campo citado, nem CNPJ). Descartada — CNPJ não tem o mesmo risco de privacidade de e-mail/celular pessoal, e manter explícito ajuda o usuário a corrigir o formulário sem custo de segurança adicional.

## Risks / Trade-offs

- [Usuário não sabe se foi o e-mail ou o celular pessoal que colidiu, precisa checar os dois manualmente] → aceito: é o objetivo da mudança — trocar um pouco de UX por não vazar dado pessoal de terceiro. Formulário de cadastro tem só esses dois campos pessoais, custo de checar os dois é baixo.
