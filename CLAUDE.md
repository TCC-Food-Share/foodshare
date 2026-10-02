# Food Share — contexto para o Claude Code

Plataforma web que conecta estabelecimentos com excedente de alimentos a
entidades beneficiárias (ONGs, abrigos, igrejas etc.), com foco em pequenas
e médias cidades do interior. TCC de Sistemas para Internet, IFSP Birigui.

**O MVP está concluído. O projeto agora está construindo a versão final**,
com o escopo completo.

## Antes de codar

Leia, nesta ordem:

1. `docs/REQUISITOS.md` — escopo, RF/RNF, máquinas de estado, regras de negócio (RN) e decisões (DT). **Fonte da verdade.**
2. `docs/MODELO-DE-DADOS.md` — o que muda no schema e por quê.
3. `docs/INFRAESTRUTURA.md` — ambientes, MinIO, Resend, n8n, tarefas agendadas e variáveis.
4. `docs/CONVENCOES.md` — padrões de código, concorrência, erros e fluxo do OpenSpec.
5. `docs/PLANO-IMPLEMENTACAO.md` — ordem das changes e o que cada uma entrega. Retome do primeiro item ⬜.
6. `docs/PENDENCIAS.md` — o que ficou para depois, de propósito.
7. `docs/COMMITS.md` e `docs/BRANCHES.md` — antes de commitar ou criar branch.

## O que é histórico (não usar como fonte)

- `docs/mvp/` — a documentação do MVP, guardada só como registro. O escopo
  reduzido, a numeração RF01–RF20 e as regras de "fora do escopo" de lá
  **não valem mais**.
- `openspec/changes/archive/` e branches antigas citam a numeração do MVP.
  Para traduzir, use a coluna "Código no MVP" de `docs/REQUISITOS.md`.
- `openspec/specs/` descreve o estado do MVP. Cada change nova altera as
  specs que tocar. Se uma spec conflitar com `docs/REQUISITOS.md`, vale o
  `REQUISITOS.md`, e a change corrige a spec.

## Stack

- Backend: NestJS + Prisma + PostgreSQL + better-auth, em TypeScript.
- Frontend: React 19 + Vite 7 + Tailwind v4 + shadcn/ui, em TypeScript.
- Infra: self-hosted (VPS Oracle Cloud ARM64 + Coolify), MinIO, Resend
  (e-mail) e n8n (WhatsApp).

## Regras de escopo

- Implemente o que está em `docs/REQUISITOS.md`, na ordem de
  `docs/PLANO-IMPLEMENTACAO.md`, uma change por vez.
- O que está "Fora do escopo" em `docs/REQUISITOS.md` (multilíngue,
  avaliação entre instituições, pagamento, logística, aprovação manual de
  alimentos, e-mails além da recuperação de senha) não entra, nem como
  placeholder.
- Se um requisito, regra ou decisão não cobrir um caso, **pergunte antes de
  decidir**. Não invente regra de negócio.
- Ao terminar uma change, marque ✅ no `docs/PLANO-IMPLEMENTACAO.md`.
