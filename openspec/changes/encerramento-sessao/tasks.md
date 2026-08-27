## 1. Endpoint de logout

- [ ] 1.1 No módulo `auth/` (criado pelo change `autenticacao-login`), adicionar endpoint protegido de logout delegando para `auth.api.signOut({ headers })`
- [ ] 1.2 Confirmar que o endpoint exige sessão válida (via o `AuthGuard` global já registrado) — sem `@AllowAnonymous()`

## 2. Testes

- [ ] 2.1 Teste unitário: endpoint chama `auth.api.signOut` com os headers da requisição e retorna sucesso
- [ ] 2.2 Teste unitário: endpoint não é decorado com `@AllowAnonymous()` (garante que o guard global se aplica)
- [ ] 2.3 Teste unitário: erro do `auth.api.signOut` é propagado (não mascarado silenciosamente)
