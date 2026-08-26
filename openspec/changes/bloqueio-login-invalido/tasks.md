## 1. Bloqueio de conta excluída logicamente

- [ ] 1.1 Em `backend/src/auth/auth.instance.ts` (criado pelo change `autenticacao-login`), adicionar `hooks.before` com `createAuthMiddleware`, interceptando `ctx.path === "/sign-in/email"` (path interno do better-auth, sem o prefixo `/auth`)
- [ ] 1.2 No hook, buscar o `User` pelo e-mail informado (`ctx.body.email`) e, se `deleted === true`, lançar `APIError("UNAUTHORIZED", { message: <mensagem genérica> })` antes de deixar o better-auth prosseguir com a validação da senha

## 2. Confirmação do comportamento padrão de credencial inválida

- [ ] 2.1 Confirmar (com teste) que login com e-mail não cadastrado retorna a mesma mensagem de erro genérica usada para senha incorreta
- [ ] 2.2 Confirmar (com teste) que login com senha incorreta para e-mail existente retorna essa mesma mensagem genérica

## 3. Testes

- [ ] 3.1 Teste unitário: hook rejeita quando `User.deleted === true`, sem chamar adiante a validação de senha do better-auth
- [ ] 3.2 Teste unitário: hook não interfere quando `ctx.path` não é `/sign-in/email` (deixa outras rotas do better-auth passarem)
- [ ] 3.3 Teste unitário: hook não bloqueia quando `User.deleted === false` (ou usuário não encontrado — deixa o better-auth tratar credencial inválida normalmente)
- [ ] 3.4 Teste unitário: mensagem de erro lançada pelo hook é idêntica à mensagem genérica de credencial inválida do better-auth (evita vazar que a conta existe e está só desativada)
