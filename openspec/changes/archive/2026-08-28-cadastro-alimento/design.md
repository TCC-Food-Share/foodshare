## Decisão final (revisado depois do archive)

**O mecanismo de revisão ("Revisar") foi removido a pedido da usuária, antes do merge.** Alimento cadastrado recebe automaticamente o status "Ativo" — sem etapa intermediária, mostrado na plataforma normalmente desde a criação. `FoodStatus` seedado só com "Ativo" (não seedar mais "Revisar"). Resto deste documento (`Context` a `Risks/Trade-offs` abaixo) é o histórico de como a change foi originalmente pensada — preservado pra rastreabilidade, não reflete o estado final. Onde ler "Revisar" abaixo, o comportamento real hoje é "Ativo" direto na criação, sem gate nenhum.

RF11 (o requisito de status "Revisar") foi removido de `docs/REQUISITOS.md`, e RF12–RF21 renumerados pra RF11–RF20. As referências a RF11–RF21 no corpo histórico abaixo usam a numeração **antiga** (a que valia no momento em que esta change foi proposta) — não foram atualizadas pra não misturar numeração de épocas diferentes no mesmo texto. Pra saber o requisito atual, usar `docs/REQUISITOS.md` como fonte da verdade, não este arquivo.

## Context

O schema já tinha `Food`/`Category`/`FoodStatus`/`Establishment` relacionados (criados junto do schema completo do TCC), mas incompletos pro RF10 literal: sem valor numérico de quantidade (só `quantityUnit`, a unidade), com um campo `condition` que não corresponde a nenhum RF do MVP, e sem seed nenhum de `Category`/`FoodStatus`.

## Goals / Non-Goals

**Goals:**
- Cadastro de alimento vinculado à sessão autenticada, sempre iniciando com status "Revisar" (RF10 + RF11 — inseparáveis, mesmo fluxo de criação).
- `Category`/`FoodStatus` como lookup fixo, sem endpoint de listagem/CRUD (mesmo padrão de `Role`).

**Non-Goals:**
- Mecanismo de transição Revisar → Ativo — RF11 só define o estado inicial; nenhum RF do MVP descreve quem muda o status depois (nem RF de aprovação, nem painel administrativo — explicitamente Fora do Escopo). Gap conhecido, documentado, não implementado aqui.
- Endpoint de listagem de categorias — RF10 não pede, cliente usa os ids fixos já seedados (mesmo padrão do `roleId` no cadastro, hardcoded no fluxo do frontend).
- RF12–RF14 (listagem, busca, detalhe de alimento) — fora desta change.

## Decisions

**`Food.quantity Decimal @db.Decimal(10, 2)` adicionado, `Food.condition` removido.**
Achado durante o planejamento (schema não cobria o RF10 literal) e decidido com a usuária via pergunta direta antes de implementar. `Decimal` em vez de `Int` — aceita quantidade fracionária (ex: 2.5 kg), mais correto pro domínio de doação de alimento do que só inteiro.

**`Category`/`FoodStatus` seedados, sem endpoint de gerência.**
`docs/MODELO-DE-DADOS.md` já registra que "categorias gerenciáveis" é Fora do Escopo — resolvido tratando `Category` como lookup fixo igual `Role`. Seed com 8 categorias genéricas aprovadas pela usuária: Perecíveis, Não Perecíveis, Hortifruti, Laticínios, Carnes, Pães e Massas, Bebidas, Outros. `FoodStatus` seedado só com "Revisar" e "Ativo" — mínimo que RF10/RF11/RF12 exigem, sem antecipar RF futuro que ainda não existe no MVP.

Nomes de categoria/status em português, não inglês — diferente da regra geral de "código em inglês" (`docs/CONVENCOES.md`): são valores de dado voltados a usuário final (aparecem numa tela, não em código), plataforma é PT-BR única (sem i18n, Fora do Escopo). "Revisar"/"Ativo" além disso são citados literalmente no texto do RF11/RF12 em `docs/REQUISITOS.md` — usar a palavra exata do requisito, não traduzir.

**Resolução do estabelecimento pelo `userId` da sessão, nunca por id no body/rota.**
Mesmo padrão do RF05 — evita superfície de "é dono do quê" e cobre automaticamente conta do tipo errado (entidade beneficiária tentando cadastrar alimento → 404 genérico, sem revelar detalhe).

**`publishedAt` setado automaticamente na criação (`new Date()`), não é campo do DTO.**
RF10 não lista esse campo como input, mas o schema exige (`NOT NULL`, herdado do schema completo do TCC). Simplificação aceita: hoje `publishedAt` = `createdAt` na prática, já que não existe RF que dê sentido a uma data de publicação separada da criação (não tem RF de "quando o alimento vira Ativo"). Revisitar se essa transição virar RF no futuro.

**`quantity` retornado como `string` na resposta, não `number`.**
`Prisma.Decimal` não serializa como número JS sem risco de imprecisão de ponto flutuante — `.toString()` explícito na camada de resposta.

## Risks / Trade-offs

- [Sem endpoint de listagem de categoria, frontend precisa hardcodar os 8 ids/nomes] → aceito: RF10 não pede endpoint de listagem; mesmo padrão já usado pro `roleId` no fluxo de cadastro.
- [`publishedAt` = momento de criação, não "quando ficou visível pro público"] → aceito, ver Decisions acima; sem RF que distinga os dois momentos, não há o que implementar de diferente.
