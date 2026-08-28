# Modelo de dados

A fonte da verdade do modelo de dados é `prisma/schema.prisma` — não
duplique o schema aqui. Este arquivo é só um resumo de navegação.

## Entidades envolvidas no escopo do MVP

Com base nos requisitos funcionais do MVP (`docs/REQUISITOS.md`), o
schema precisa cobrir pelo menos:

- **Estabelecimento** — dados cadastrais (RF01, RF02, RF05, RF06)
- **EntidadeBeneficiaria** — dados cadastrais (RF03, RF04, RF05, RF06)
- **Alimento** — vinculado a um Estabelecimento, com status (`Ativo`
  etc.) (RF10, RF11, RF12, RF13)
- **Pedido** — vinculado a um Alimento e a uma EntidadeBeneficiaria, com
  status (RF14–RF20)

Entidades administrativas, categorias gerenciáveis e motivos de
cancelamento padronizados fazem parte do schema completo do TCC, mas
estão fora do escopo do MVP — não são necessárias para esta fase.

## Convenção

- Toda alteração de schema passa por `prisma migrate dev` em ambiente
  local antes de subir para o staging na VPS.
- Não crie tabelas/campos para funcionalidades fora do escopo do MVP
  (ver `docs/REQUISITOS.md`) só porque aparecem no schema completo do TCC.
