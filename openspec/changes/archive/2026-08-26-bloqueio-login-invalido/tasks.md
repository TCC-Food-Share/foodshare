## 1. Bloqueio de conta excluída logicamente

- [x] 1.1 Em `backend/src/auth/auth.instance.ts` (criado pelo change `autenticacao-login`), adicionar `hooks.before` com `createAuthMiddleware`, interceptando `ctx.path === "/sign-in/email"` (path interno do better-auth, sem o prefixo `/auth`)
- [x] 1.2 No hook, buscar o `User` pelo e-mail informado (`ctx.body.email`) e, se `deleted === true`, lançar `APIError.from("UNAUTHORIZED", BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD)` antes de deixar o better-auth prosseguir com a validação da senha — reusa a constante de erro do próprio better-auth em vez de escrever uma mensagem nova, garantindo texto idêntico ao de credencial incorreta

## 2. Confirmação do comportamento padrão de credencial inválida

- [x] 2.1 Confirmado manualmente (`POST /auth/sign-in/email` com e-mail não cadastrado): retorna `{"message":"Invalid email or password","code":"INVALID_EMAIL_OR_PASSWORD"}`, 401 — comportamento padrão do better-auth, sem necessidade de código novo
- [x] 2.2 Confirmado manualmente (mesmo endpoint, e-mail existente com senha incorreta): retorna a mesma mensagem/código do item 2.1 — verificação manual em vez de teste automatizado porque isso testaria o better-auth em si (dependeria de banco real), fora do escopo de teste unitário deste projeto

## 3. Testes

- [x] 3.1 Teste unitário: hook rejeita quando `User.deleted === true`, sem chamar adiante a validação de senha do better-auth
- [x] 3.2 Teste unitário: hook não interfere quando `ctx.path` não é `/sign-in/email` (deixa outras rotas do better-auth passarem)
- [x] 3.3 Teste unitário: hook não bloqueia quando `User.deleted === false` (ou usuário não encontrado — deixa o better-auth tratar credencial inválida normalmente)
- [x] 3.4 Teste unitário: mensagem de erro lançada pelo hook é idêntica à mensagem genérica de credencial inválida do better-auth (evita vazar que a conta existe e está só desativada) — confirmado também manualmente em runtime (item 2.2), comparando byte a byte a resposta dos dois cenários
