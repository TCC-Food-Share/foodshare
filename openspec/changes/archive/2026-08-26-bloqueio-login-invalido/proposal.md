## Why

O login (RF07, change `autenticacao-login`) autentica credenciais corretas, mas não trata explicitamente o caso de credenciais erradas nem o de uma conta excluída logicamente (`User.deleted = true`) tentando entrar. RF08 fecha essa lacuna: sem ela, um e-mail errado, uma senha errada ou uma conta desativada poderiam vazar informação (ex.: "e-mail não encontrado" vs "senha errada" revela quais e-mails existem) ou, pior, autenticar uma conta que não deveria mais ter acesso.

## What Changes

- Login com e-mail não cadastrado ou senha incorreta é rejeitado com uma mensagem genérica única (não revela qual dos dois campos está errado), sem emitir sessão.
- Login com credenciais corretas de uma conta com `deleted = true` é rejeitado do mesmo jeito, mesmo com a senha certa, sem emitir sessão.
- Implementado como um hook do better-auth (`hooks.before` interceptando `/sign-in/email` — path interno do better-auth, sem o prefixo `/auth` que o NestJS usa por fora) que verifica `deleted` no `User` resolvido antes de deixar a autenticação prosseguir — sem depender do plugin de admin/ban do better-auth (que traria escopo de administração fora do MVP).

## Capabilities

### New Capabilities
- (nenhuma)

### Modified Capabilities
- (nenhuma — este change adiciona requisitos novos à capability `auth/login` introduzida pelo change `autenticacao-login`; nenhum requisito existente daquele change muda de texto, ver `specs/auth/login/spec.md` deste change com `## ADDED Requirements`)

## Impact

- Backend: módulo `auth/` (criado pelo change `autenticacao-login`) ganha um `hooks.before` na instância do better-auth para checar `deleted` antes do sign-in.
- Nenhuma mudança de schema — usa a coluna `User.deleted` já existente.
- Depende do change `autenticacao-login` estar implementado antes (o hook é configurado na mesma instância do better-auth criada por ele).
