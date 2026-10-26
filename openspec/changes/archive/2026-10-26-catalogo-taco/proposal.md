## Why

A 1.1 criou o catálogo de alimentos com um seed provisório de 24 itens, só
para destravar o desenvolvimento. O cadastro de alimento padronizado (2.1)
precisa do catálogo de verdade: os nomes que o estabelecimento vai escolher
no select. A DT12 define que ele vem, uma única vez, da Tabela TACO (4ª ed.,
NEPA/Unicamp), curada para ter nomes naturais e entre 150 e 250 itens. Este é
o item 1.2 de `docs/PLANO-IMPLEMENTACAO.md`.

## What Changes

- **Seed:** `backend/prisma/seed-data/food-catalog.ts` passa de 24 para 234
  itens, cada um ligado a uma das 8 categorias do seed. A lista completa,
  com o número TACO de origem de cada item, está em `catalogo-revisao.md`
  (nesta change) para a revisão da dupla **antes do apply**.
- **Curadoria (decidida nesta proposta):**
  - as variações de preparo (cru, cozido, frito, assado, grelhado) viram um
    item só, com nome natural ("Pão francês", não "Pão, trigo, francês");
  - as variedades próximas se juntam ("Alface" cobre americana, crespa,
    lisa e roxa; "Laranja" cobre baía, pêra, lima e valência);
  - ficam de fora as **bebidas alcoólicas** (cerveja e aguardente) e os
    itens regionais ou raros em doação, para caber no teto de 250;
  - os **alimentos preparados** (estrogonofe, feijoada, salgados etc.) vão
    para **Perecíveis**;
  - os **24 nomes do catálogo provisório continuam na lista**, com os
    mesmos nomes, para nenhum item ficar sobrando nos bancos já semeados.
- **Migration de dados:** "Refeição pronta" muda de "Outros" para
  "Perecíveis", como os demais preparados. O seed não altera registros que
  já existem (`update: {}`), então o ajuste nos bancos já semeados vai numa
  migration só com `UPDATE`.
- **Docs:** a fonte da TACO fica registrada em `docs/MODELO-DE-DADOS.md`.

## Cobertura

- **DT12** — catálogo populado uma vez, por seed, a partir da TACO, com a
  curadoria e o intervalo de 150 a 250 itens.
- **RN40** — seed inicial do catálogo curado a partir da TACO.
- **RN16** (preparação) — os nomes que o alimento vai usar na 2.1.

## Fora desta change

- O cadastro de alimento usar o catálogo (RF14, RN16): 2.1.
- Editar o catálogo pelo painel (RF63–RF66): 1.3.
- Sugerir item novo (RF71): 1.5.
- Dados nutricionais da TACO: nenhum RF usa. Só o nome entra.
- Qualquer mudança de tela ou de rota.

## Perguntas em aberto

- **Revisão da lista.** `catalogo-revisao.md` precisa da aprovação da dupla:
  incluir, tirar ou renomear itens, e conferir a categoria de cada um.
- **Linha 540 da planilha.** O nome está corrompido no arquivo do NEPA
  ("L"). Pela ordem alfabética do grupo "Alimentos preparados" e pela 4ª
  edição em PDF, é "Feijoada", que entrou na lista. Vale conferir no PDF.
- **"Outros" fica vazia.** Nenhum item da TACO cai nela. Ela continua
  disponível para o painel (1.3) e para as sugestões (1.5).

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `listas/padronizadas`: o seed do catálogo deixa de ser provisório e passa
  a ser a lista curada da TACO, e "Refeição pronta" passa a "Perecíveis".

## Impact

- **Backend:** `prisma/seed-data/food-catalog.ts` (dados) e uma migration
  nova, só de dados. Nenhum código de aplicação muda.
- **Ambientes:** o deploy roda `migrate deploy` + seed. Os 24 itens
  existentes ficam como estão (exceto a categoria de "Refeição pronta"), e
  os 210 novos são criados.
- **Dependências:** nenhuma. A planilha da TACO não entra no repositório:
  só a lista curada.
