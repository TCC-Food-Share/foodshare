# Infraestrutura

## Ambientes

- **Local (cada dev)**: PostgreSQL via Docker.
- **Staging/homologação (compartilhado)**: VPS Oracle Cloud com Coolify,
  usada por ambos durante o desenvolvimento.

## Armazenamento de arquivos

- MinIO self-hosted.
- Em staging, o MinIO funciona sem domínio público — o Coolify (versão
  4.1.2, Service Stack).

## Domínio e deploy

- Domínio: `foodshare.com.br`, gerenciado na Cloudflare (modo DNS-only).
- Staging (branch `develop`): front em `app.staging.foodshare.com.br`, API em
  `api.staging.foodshare.com.br` — dois serviços no Coolify.

## Frontend ↔ API (origens)

O front e a API ficam em **subdomínios distintos** no staging/prod (mesmo site
registrável `foodshare.com.br`). Isso exige config nos dois lados — já no código
(change `deploy-cross-origin`), só falta as variáveis por ambiente:

| Var | Onde | Dev | Staging |
| --- | ---- | --- | ------- |
| `BETTER_AUTH_URL` | serviço API | `http://localhost:3000` | `https://api.staging.foodshare.com.br` |
| `TRUSTED_ORIGINS` | serviço API | `http://localhost:5173` (default) | `https://app.staging.foodshare.com.br` |
| `COOKIE_DOMAIN` | serviço API | *(vazio)* | `.staging.foodshare.com.br` |
| `VITE_API_URL` | serviço front (build) | `/api` (proxy do Vite) | `https://api.staging.foodshare.com.br` |

- `TRUSTED_ORIGINS` (lista por vírgula) alimenta o originCheck do better-auth **e**
  o CORS do NestJS (`main.ts`).
- `COOKIE_DOMAIN` (com ponto inicial) adiciona o atributo `Domain` ao cookie de
  sessão para ele valer nos dois subdomínios. Vazio = cookie host-only (dev).
- O cookie de sessão vai `secure` quando `BETTER_AUTH_URL` é `https://` → o
  staging **precisa** servir HTTPS.
- Em dev nada disso dispara: o proxy do Vite (`server.proxy` em `vite.config.ts`)
  deixa front e API na mesma origem no browser.
- Alternativa que dispensa CORS/cookie: rotear `app.staging.foodshare.com.br/api`
  para o backend (mesmo host). Aí `VITE_API_URL=/api`.

## Frontend — detalhe de build

- O frontend usa `vite@^7` com `@vitejs/plugin-react@^5`. Essa combinação
  foi escolhida propositalmente: as versões mais novas (`vite@^8` /
  `@vitejs/plugin-react@^6`) têm um bug de binário nativo do Rolldown em
  build ARM64 na VPS. **Não faça upgrade dessas duas dependências** sem
  validar antes que o build ARM64 continua funcionando no Coolify.

## Regra geral

Qualquer sugestão de infraestrutura deve ser compatível com Docker +
Coolify self-hosted. Não proponha serviços gerenciados de terceiros
(banco, storage, hosting) como alternativa "mais simples" — essa decisão
já foi tomada conscientemente.
