## Context

O login em si (RF07, change `autenticacao-login`) já existe como capability `auth/login`, com a instância do better-auth configurada em `backend/src/auth/`. Por padrão, o better-auth já rejeita e-mail/senha incorretos com um erro genérico (não distingue "e-mail não existe" de "senha errada" na mensagem) — isso já vem de fábrica. O que falta é especificamente o caso de conta com `User.deleted = true`, que o better-auth não conhece (é um conceito só nosso).

## Goals / Non-Goals

**Goals:**
- Bloquear login de conta excluída logicamente sem introduzir um segundo sistema de "usuário banido" (ex.: plugin de admin do better-auth).
- Confirmar/garantir (com teste) que a rejeição por credencial errada já é genérica o bastante por padrão.

**Non-Goals:**
- Qualquer fluxo de reativação de conta excluída — não existe exclusão lógica autoatendida no MVP (fora do escopo, ver `docs/REQUISITOS.md`); `deletado` só é usado aqui para o caso de já existir uma conta marcada assim (ex.: via ação administrativa futura).

## Decisions

**Checagem de `deleted` via `hooks.before` na instância do better-auth, interceptando `/sign-in/email` (path interno do better-auth). Lógica extraída pra `backend/src/auth/reject-deleted-user.hook.ts`, testável isoladamente sem tocar no runtime ESM do better-auth.**
```ts
// reject-deleted-user.hook.ts
export async function rejectDeletedUserOnSignIn(ctx, prisma) {
  if (ctx.path !== "/sign-in/email") return;
  const email = ctx.body?.email;
  const user = email ? await prisma.user.findUnique({ where: { email } }) : null;
  if (user?.deleted) {
    throw APIError.from("UNAUTHORIZED", BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD);
  }
}

// auth.instance.ts
hooks: {
  before: createAuthMiddleware((ctx) => rejectDeletedUserOnSignIn(ctx, prisma)),
}
```
A mensagem de erro reusa a constante `BASE_ERROR_CODES.INVALID_EMAIL_OR_PASSWORD` do próprio better-auth (a mesma que ele usa para credencial incorreta), em vez de escrever um texto novo — garante que o texto é byte-idêntico ao caso de senha errada, mesmo se o better-auth mudar a mensagem numa versão futura. Do ponto de vista de quem tenta logar, uma conta excluída logicamente é indistinguível de uma senha errada (evita confirmar a um atacante que aquele e-mail existe e está apenas desativado). Confirmado manualmente comparando as duas respostas byte a byte (ver `tasks.md`, seção 2).
Alternativa considerada: plugin de admin do better-auth (`banned`/`banReason`/`banExpires`) — descartado por trazer conceito e superfície de administração de usuários (banimento por admin) que não faz parte do MVP; nosso `deletado` é um conceito diferente (exclusão lógica, não banimento) e mais simples de checar direto.

## Risks / Trade-offs

- [Checar `deletado` antes da senha ser validada poderia, em teoria, vazar timing diferente entre "conta excluída" e "senha errada"] → aceito: risco de timing attack é baixo nesse contexto (não há dado sensível de alto valor além do já protegido por HTTPS/rate limiting de infraestrutura, fora do escopo deste change) e a mensagem retornada é idêntica nos dois casos.
