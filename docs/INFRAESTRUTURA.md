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
