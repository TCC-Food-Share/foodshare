# Food Share — contexto para o Claude Code

Plataforma web que conecta estabelecimentos com excedentes alimentares a
entidades beneficiárias, com foco em pequenas e médias cidades do interior.
Este é o MVP do projeto (TCC de Sistemas para Internet, IFSP Birigui).

## Antes de codar

Leia, nesta ordem:

1. `docs/REQUISITOS.md` — escopo do MVP e requisitos funcionais/não funcionais
2. `docs/MODELO-DE-DADOS.md` — entidades e onde está o schema real
3. `docs/INFRAESTRUTURA.md` — como o sistema é hospedado e implantado
4. `docs/CONVENCOES.md` — padrões de código e de commit

## Stack

- Backend: NestJS + Prisma + PostgreSQL, tudo em TypeScript
- Frontend: React + TypeScript
- Infra: self-hosted (Oracle Cloud VPS + Coolify)

## Regra de escopo

Só implemente o que está em "Dentro do Escopo" em `docs/REQUISITOS.md`.
Qualquer funcionalidade da lista "Fora do Escopo" (painel administrativo
completo, recuperação de senha, avaliação entre instituições, pagamento,
logística de coleta etc.) fica para depois do MVP — não implemente nem
deixe placeholders complexos para isso.
