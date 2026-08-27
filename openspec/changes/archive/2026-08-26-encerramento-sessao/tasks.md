## 1. Endpoint de logout

- [x] 1.1 Implementado como `POST /logout` em `AppController` (não em módulo `auth/` dedicado — ver `design.md`), delegando para `authService.api.signOut({ headers: fromNodeHeaders(request.headers) })`
- [x] 1.2 Confirmado que o endpoint exige sessão válida (via o `AuthGuard` global já registrado) — sem `@AllowAnonymous()`

## 2. Testes

- [x] 2.1 Teste unitário: endpoint chama `auth.api.signOut` com os headers da requisição e retorna sucesso
- [x] 2.2 Teste unitário: endpoint não é decorado com `@AllowAnonymous()` (checa ausência da metadata `PUBLIC` via `Reflect.getMetadata`, com teste de controle confirmando que a checagem realmente detectaria a decoração se ela existisse)
- [x] 2.3 Teste unitário: erro do `auth.api.signOut` é propagado (não mascarado silenciosamente)
- [x] 2.4 Verificação manual (`curl`): login → `/me` com sessão válida (200) → `/logout` (200) → `/me` com a mesma sessão (401) → `/logout` sem sessão nenhuma (401) — cobre os 2 requirements da spec ponta a ponta
