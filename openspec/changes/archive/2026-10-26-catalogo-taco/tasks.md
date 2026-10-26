## 1. Revisão (antes de qualquer código)

- [x] 1.1 Aplicar em `catalogo-revisao.md` os ajustes que a dupla pedir na
      revisão (incluir, tirar, renomear ou mudar a categoria de itens) e
      conferir que o total continua entre 150 e 250.
- [x] 1.2 Conferir no PDF da 4ª edição que o item 540 da TACO é "Feijoada"
      (design, "Risks").

## 2. Dados (backend)

- [x] 2.1 Gerar `backend/prisma/seed-data/food-catalog.ts` a partir de
      `catalogo-revisao.md`: `{ name, category }[]`, agrupado por categoria
      e em ordem alfabética dentro de cada grupo (design D4).
- [x] 2.2 Conferir que os 24 nomes do catálogo provisório estão no arquivo,
      com o mesmo texto, e que não há nomes repetidos ignorando maiúsculas e
      acentos.
- [x] 2.3 Criar com `prisma migrate dev --create-only --name
  catalogo_taco_refeicao_pronta` a migration só com o `UPDATE` de
      "Refeição pronta" para "Perecíveis" (design D3) e aplicá-la.

## 3. Verificação (backend)

- [x] 3.1 Rodar o seed sobre o banco local (que já tem os 24 provisórios) e
      conferir no banco: total de itens igual ao da lista, nenhum item sem
      categoria e "Refeição pronta" em "Perecíveis".
- [x] 3.2 Rodar o seed de novo e conferir que o total não muda.
- [x] 3.3 Com a API local e uma instituição logada: `GET
  /catalog/food-items?search=pao frances` traz só "Pão francês";
      `?search=cerveja` não traz nada; "Feijoada" vem com a categoria
      "Perecíveis".
- [x] 3.4 Rodar `npm test`, `npm run lint:check` e `npm run build` no
      backend.

## 4. Fechamento

- [x] 4.1 Registrar em `docs/MODELO-DE-DADOS.md` (seção "Seed") a fonte da
      TACO, o total de itens e a correção de "Refeição pronta" por
      migration.
- [x] 4.2 Marcar ✅ o item 1.2 em `docs/PLANO-IMPLEMENTACAO.md`.
