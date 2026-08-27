## Why

Login (RF07) autentica e emite sessão, mas nada hoje encerra essa sessão. Sem logout, um usuário autenticado em um dispositivo compartilhado (ex.: computador de uso comum numa entidade beneficiária pequena) não tem como sair da conta — a sessão fica válida até expirar sozinha.

## What Changes

- Endpoint autenticado de logout: encerra a sessão atual, tornando-a inválida para requisições futuras.
- Usa a invalidação de sessão nativa do better-auth (`auth.api.signOut`), sem lógica própria de expiração/blacklist.

## Capabilities

### New Capabilities
- `auth/logout`: permite que um usuário autenticado encerre a própria sessão a qualquer momento.

### Modified Capabilities
- (nenhuma)

## Impact

- Backend: novo endpoint no módulo `auth/` (criado pelo change `autenticacao-login`) delegando para `auth.api.signOut`.
- Depende do change `autenticacao-login` estar implementado antes (usa a mesma instância do better-auth e o mesmo guard).
- Nenhuma mudança de schema — usa as tabelas de sessão já criadas pelo better-auth no change `autenticacao-login`.
