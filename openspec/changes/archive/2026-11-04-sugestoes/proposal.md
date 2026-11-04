## Why

As listas padronizadas impedem texto livre nos formulários, então uma instituição que não encontra a opção certa hoje não tem como pedir que ela exista. A tabela `suggestion` existe desde a 1.1, mas nada grava nela nem a lê, e a seção "Sugestões" do painel ainda é um aviso de "em construção".

## What Changes

- **Sugerir (RF71):** estabelecimento e entidade enviam tipo e texto. O texto passa pela validação de conteúdo (RNF07, DT24).
- **Sugestão repetida:** texto igual a uma opção da lista, ou a uma sugestão pendente do mesmo tipo, sem diferenciar maiúsculas nem acentos, responde `409`, e o diálogo avisa.
- **"Sugerir nova opção" nos selects (RN38):** a ação fica no select com busca e abre um diálogo curto sobre o formulário, que continua intacto (RN39). O diálogo traz Tipo e Texto, com o tipo do campo de origem já escolhido, mas trocável, o que cobre categoria e motivo.
- **Unidade no modal de alimento:** passa a ser select com busca, para receber a ação, como pedem a RN38 e `docs/CONVENCOES.md`.
- **Decidir (RF49):** tela "Sugestões" no painel, com filtros por tipo e status.
  - Aprovar cria a opção na lista correspondente, na mesma transação, com ajuste de texto. Item do catálogo exige categoria. Unidade exige sigla e indicação de fração.
  - Recusar registra a sugestão como `Recusada`.
  - Uma sugestão já decidida não pode ser decidida de novo.
- **Auditoria (RNF14, RN46):** aprovar e recusar gravam auditoria, e a opção criada grava também a linha normal da lista.
- As decisões que os documentos não cobriam viram a **DT25** em `docs/REQUISITOS.md`.

**Cobre:** RF49, RF71, RN38 (ação nos selects), RN39, RNF07 (texto da sugestão) e RNF14 (decisões), usando RN37 e DT11.

### Fora desta change

- Select de motivo de cancelamento: chega na 3.2 (`cancelar-pedido`), já usando a mesma ação.
- Limpeza das sugestões na exclusão permanente de instituição: 5.3 (`admin-exclusoes-instituicoes`), como o plano já registra.

### Limite temporário

Até a 3.2, a entidade não tem nenhum select de lista padronizada na tela, então a ação só aparece para o estabelecimento, no modal de alimento. A rota já aceita os dois papéis.

### Fora de propósito (RN39, DT25)

- Quem sugere não acompanha a decisão: não há tela, e-mail nem notificação. A pessoa vê a opção nova no próximo cadastro.
- Recusa não tem motivo.
- Aprovar não troca a opção de cadastros já feitos.
- Sugestão recusada pode ser enviada de novo.

## Capabilities

### New Capabilities

- `listas/sugestoes`: instituição envia sugestão pelo diálogo, sem interromper o formulário.
- `admin/sugestoes`: administrador lista, aprova e recusa sugestões.

### Modified Capabilities

- `moderacao/textos-livres`: o texto da sugestão entra na lista de campos validados.
- `alimentos/cadastro`: unidade vira select com busca, e os selects do modal ganham "Sugerir nova opção".
- `admin/painel`: a seção "Sugestões" deixa de ser aviso de "em construção".

## Impact

- **Backend:** módulo novo `suggestions/` e controller em `admin/suggestions/`; os services das listas passam a expor a criação dentro de uma transação recebida, reaproveitada na aprovação.
- **Frontend:** `SearchableSelect` ganha a ação opcional; diálogo novo em `features/suggestions/`; página e diálogo de decisão em `features/admin/suggestions/`; `AdminTable` e `useAdminListParams` passam a aceitar filtros.
- **Banco:** sem migration. Model e índice já existem desde a 1.1.
- **Docs:** DT25 em `docs/REQUISITOS.md` e ✅ em `docs/PLANO-IMPLEMENTACAO.md`.
- **Dependências:** nenhuma nova.

## Perguntas em aberto

Nenhuma. Sigla e fração informadas na aprovação, diálogo com select de tipo e recusa de sugestão repetida foram confirmados na proposta.
