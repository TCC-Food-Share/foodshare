## Context

- `prisma/seed-data/food-catalog.ts` tem 24 itens provisórios
  `{ name, category }`. O seed faz `upsert` por nome com `update: {}` e
  falha se a categoria de um item não existir (1.1, design D6).
- Os bancos local, de staging e de produção podem já ter os 24 itens. Nenhum
  `Food` aponta para o catálogo ainda: isso só começa na 2.1.
- A fonte é a planilha da TACO publicada pelo NEPA/Unicamp
  (`nepa.unicamp.br/publicacoes/tabela-taco-excel/`), com 597 alimentos em
  15 grupos. As abas internas se chamam "taco3", mas o número de itens e os
  nomes batem com a 4ª edição (2011). O NEPA permite reproduzir citando a
  fonte.
- Categorias do seed: Perecíveis, Não Perecíveis, Hortifruti, Laticínios,
  Carnes, Pães e Massas, Bebidas e Outros.

## Goals / Non-Goals

**Goals:**

- Um catálogo de 150 a 250 nomes que um estabelecimento reconhece na hora.
- Nenhum item provisório sobrando ou duplicado nos bancos já semeados.
- Uma lista que a dupla consiga revisar linha a linha antes do apply.

**Non-Goals:**

- Dados nutricionais.
- Script de importação versionado: a curadoria é feita uma vez (DT12), e o
  que fica no repositório é a lista curada.

## Decisions

### D1. Regras de curadoria

1. **Variações de preparo viram um item.** "Arroz, tipo 1, cozido" e
   "Arroz, tipo 1, cru" → "Arroz branco".
2. **Nome natural em vez do formato da TACO.** "Pão, trigo, francês" →
   "Pão francês"; "Carne, bovina, patinho, sem gordura, cru" → "Patinho".
3. **Variedades próximas se juntam** quando a diferença não importa para
   quem doa: "Alface" (americana, crespa, lisa, roxa), "Laranja" (baía,
   pêra, lima, valência), "Pimentão" (amarelo, verde, vermelho).
4. **Saem:**
   - as bebidas alcoólicas (TACO 472 e 474), por decisão da proposta;
   - os itens regionais ou raros em doação no interior de SP (ex.: tacacá,
     maniçoba, jurubeba, tucumã);
   - os ingredientes de uso mínimo (ex.: glicose de milho, chantilly
     spray).
5. **Os 24 nomes provisórios ficam exatamente iguais**, mesmo quando a
   regra 3 sugeriria outro nome (ex.: "Banana prata" convive com "Banana
   nanica" e "Banana maçã").
6. **Fora da TACO:** só "Refeição pronta", que já existia no provisório.
   "Bolo simples" e "Café" juntam itens da TACO.

### D2. Grupo da TACO → categoria

| Grupo da TACO                         | Categoria                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Cereais e derivados                   | Pães e Massas (pães, biscoitos, bolos, massas) ou Não Perecíveis (grãos, farinhas, flocos)              |
| Verduras, hortaliças e derivados      | Hortifruti; conservas e farinhas → Não Perecíveis; pão de queijo e biscoito de polvilho → Pães e Massas |
| Frutas e derivados                    | Hortifruti; doces e frutas em calda → Não Perecíveis; polpas congeladas → Perecíveis; sucos → Bebidas   |
| Gorduras e óleos                      | Óleos e azeites → Não Perecíveis; manteiga → Laticínios; margarina → Perecíveis                         |
| Pescados e frutos do mar              | Carnes; enlatados → Não Perecíveis                                                                      |
| Carnes e derivados                    | Carnes; salgados (coxinha, empada, quibe, croquete) → Perecíveis                                        |
| Leite e derivados                     | Laticínios                                                                                              |
| Bebidas (sem as alcoólicas)           | Bebidas                                                                                                 |
| Ovos e derivados                      | Perecíveis                                                                                              |
| Produtos açucarados                   | Não Perecíveis                                                                                          |
| Miscelâneas / Outros industrializados | Não Perecíveis; fermento biológico → Perecíveis                                                         |
| Alimentos preparados                  | Perecíveis (decisão da proposta)                                                                        |
| Leguminosas e derivados               | Não Perecíveis; tofu → Perecíveis; bebida de soja → Bebidas                                             |
| Nozes e sementes                      | Não Perecíveis; coco → Hortifruti                                                                       |

A lista resultante, item a item, está em `catalogo-revisao.md`.

### D3. "Refeição pronta" muda de categoria por migration

O seed não sobrescreve registro existente (`update: {}`), de propósito: o
administrador poderá editar o catálogo na 1.3. Para os bancos que já têm o
item provisório em "Outros", uma migration só de dados faz:

```sql
UPDATE "food_catalog_item"
SET "categoryId" = (SELECT "id" FROM "category" WHERE "name" = 'Perecíveis')
WHERE "name" = 'Refeição pronta';
```

- Em banco novo, a migration roda antes do seed e não encontra linha
  nenhuma; o seed cria o item já em "Perecíveis".
- Nos bancos já semeados, ela corrige a linha.

_Alternativa:_ o seed atualizar a categoria dos itens do catálogo.
Rejeitada: passaria a desfazer edições do administrador a cada deploy.

### D4. Formato do arquivo

O `food-catalog.ts` continua `{ name, category }[]`, agrupado por
categoria e em ordem alfabética dentro de cada grupo, para a revisão no
diff ficar legível. O número da TACO não vai para o código: ele fica em
`catalogo-revisao.md`, arquivado com a change.

## Risks / Trade-offs

- **[Lista longa demais para revisar com cuidado]** → Agrupada por
  categoria, com o número da TACO ao lado, para a dupla conferir só o que
  quiser.
- **[A planilha tem o nome corrompido na linha 540]** → Conferir no PDF da
  4ª edição que é "Feijoada" antes do apply.
- **[Nome do catálogo colide com um sinônimo regional]** ("Mandioca" ×
  "Aipim", "Mexerica" × "Tangerina") → A busca é por trecho, então quem
  procura "tangerina" não acha "Mexerica". A sugestão de opção nova (1.5)
  cobre o resto; a dupla pode trocar nomes na revisão.

## Migration Plan

1. Migration de dados `catalogo_taco_refeicao_pronta` (D3).
2. Seed com a lista nova. No local: o seed sobre o banco atual. No staging
   e na produção: o deploy (`migrate deploy` + seed).
3. Rollback: reverter o PR. Os itens novos ficam no banco, sem uso, até a
   2.1; nada depende deles.

## Open Questions

- Aprovação de `catalogo-revisao.md` pela dupla.
