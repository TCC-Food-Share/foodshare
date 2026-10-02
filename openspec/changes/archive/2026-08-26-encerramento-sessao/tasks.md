## 1. Endpoint de logout

- [x] 1.1 Decidido usar `POST /auth/sign-out` (rota nativa do better-auth) direto, sem wrapper — ver `design.md` ("Decisão final") pra por que uma versão anterior empacotou isso em `AppController` e foi revertida
- [x] 1.2 Confirmado que o endpoint exige sessão válida (checagem nativa do better-auth) — nenhuma configuração adicional necessária, `/sign-out` continua fora de `disabledPaths`

## 2. Testes

- [x] 2.1 Verificação manual (`curl`): login → `/me` com sessão válida (200) → `POST /auth/sign-out` com header `Origin` (200) → `/me` com a mesma sessão (401) — cobre os 2 requirements da spec ponta a ponta
- [x] 2.2 Verificação manual: `POST /auth/sign-out` sem sessão ativa rejeita (comportamento nativo do better-auth, sem código nosso)
- [x] 2.3 Verificação manual: `POST /auth/sign-out` via HTTP sem header `Origin` é rejeitado (403, `MISSING_OR_NULL_ORIGIN`) — checagem CSRF nativa; confirmação de que usar a rota nativa direto preserva essa proteção (o wrapper revertido pulava essa checagem, chamando `auth.api.signOut()` programaticamente)
- [x] 2.4 Sem teste unitário de código nosso — não há lógica própria a testar (rota 100% nativa, comportamento coberto pelos próprios testes do better-auth)
