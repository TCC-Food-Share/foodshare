## Why

O painel ainda mostra "em construção" na seção "Alimentos": o administrador não consegue ver os alimentos da
plataforma, corrigir um cadastro errado nem apagar de vez um alimento de teste ou indevido (RF50–RF53). É o item 5.4 do
plano, que depende da 2.2 (`meus-alimentos`) e da 5.1 (`admin-administradores`), ambas em `develop`.

## What Changes

Cobre **RF50, RF51, RF52 e RF53**, com as decisões novas **DT57 a DT60** (abaixo). Usa a RN03, a RN16, a RN20, a RN24,
a RN41, a RN46, a DT21, a DT23, a DT24 e a DT26, que já valem, e a ordem de exclusão "Alimento: pedidos → alimento" de
`docs/MODELO-DE-DADOS.md`.

### Backend (módulo novo `admin/foods`, rotas `/admin/foods`)

- **Listagem (RF52, DT60):** `GET /admin/foods`, paginada (DT23), com todos os alimentos em qualquer status, inclusive
  os excluídos logicamente. Filtros de status (`Ativo`, `Reservado`, `Inativo`) e de situação (ativos ou excluídos);
  busca num campo único que casa sem acento o nome do alimento, a categoria, a razão social e o nome fantasia do
  estabelecimento e as datas de vencimento e de publicação em `dd/mm/aaaa`; ordenação por campo, com padrão pela data
  de publicação mais recente. Cada linha diz se o alimento e se o estabelecimento estão excluídos.
- **Detalhe (RF53):** `GET /admin/foods/:id`, para qualquer alimento, com todos os campos do RF53, o campo deletado do
  alimento e do estabelecimento e a contagem de pedidos por status.
- **Edição (RF50, DT57, DT58):** `PATCH /admin/foods/:id`, multipart, com qualquer campo do RF50 (imagem, item do
  catálogo, quantidade, unidade, tipo de solicitação, descrição, observações, vencimento e publicação).
  - Só vale para alimento `Ativo`, não excluído e sem pedido `Em andamento` (a mesma trava de estado da RN20). Fora
    disso, `409` com `code` (`FOOD_DELETED`, `FOOD_NOT_ACTIVE` ou `FOOD_HAS_ORDERS_IN_PROGRESS`).
  - Efeitos nos pedidos `Pendente`, na mesma transação: troca de item do catálogo ou de unidade rejeita todos; troca
    de tipo rejeita só os incompatíveis (parciais em "Somente total", totais em "Somente parcial"); troca de
    quantidade aplica a RN20 nos que sobram.
  - Valida a quantidade contra a unidade e o tipo finais (RN03, DT21), o vencimento alterado pela DT26 e a publicação
    alterada, que não pode ficar no futuro. Descrição e observações usam `@NoProhibitedContent()` (DT24). A imagem
    segue o padrão da 0.3 (`@ImageUpload()`, pasta `foods`), com a anterior apagada depois do commit.
  - `GET /admin/foods/:id/edit-impact` devolve, para os valores pretendidos, quantos pedidos pendentes terão a
    quantidade atualizada e quantos serão rejeitados, para a tela avisar antes de salvar.
- **Exclusão permanente (RF51, DT59):** `DELETE /admin/foods/:id`, resposta `204`, para qualquer alimento, inclusive
  com pedido em aberto. Numa transação: trava o alimento e os pedidos (em ordem de id), apaga os pedidos e o alimento;
  a imagem sai do MinIO depois do commit.
- **Auditoria (RN46):** `food.update` (campos alterados, com valor anterior e novo, e quantos pedidos foram
  atualizados e rejeitados) e `food.delete` (nome do alimento, estabelecimento e quantos pedidos foram apagados, por
  status).

### Frontend (`features/admin/foods/`)

- **Seção "Alimentos":** tabela administrativa com busca, filtros de status e situação, ordenação e itens por página;
  colunas de imagem, nome, categoria, quantidade com unidade, tipo de solicitação, status, estabelecimento, vencimento,
  publicação e situação. Alimento excluído mostra o selo "Excluído"; estabelecimento excluído aparece destacado
  (RF53). Ações "Ver", "Editar" (só quando a edição é permitida) e "Excluir permanentemente".
- **Detalhe** (`/admin/alimentos/:id`): todos os dados do RF53, com um aviso destacado quando o estabelecimento ou o
  próprio alimento estão excluídos.
- **Edição** (`/admin/alimentos/:id/editar`): formulário com os campos do RF50, selects com busca nas listas
  padronizadas, troca opcional da imagem e, se houver pedidos pendentes afetados, um diálogo de confirmação com as
  contagens antes de salvar. Mensagem de sucesso ao concluir (RF50).
- **Diálogo de exclusão permanente:** alerta de irreversível, quantos pedidos de cada status serão apagados e o campo
  onde o administrador digita "EXCLUIR" para liberar o botão (DT59, como a DT55).

### Documentação

- `docs/REQUISITOS.md`: DT57 a DT60 novas, citadas nas observações do RF50 a RF53.
- `docs/MODELO-DE-DADOS.md`: a ordem "Alimento" das exclusões permanentes passa a dizer que o alimento e os pedidos são
  travados antes e que a imagem sai do MinIO depois do commit.
- `docs/PLANO-IMPLEMENTACAO.md`: item 5.4 marcado ✅ ao fim.

**Decisões tomadas com a dupla antes da proposta:**

- **DT57:** o administrador edita só alimento `Ativo`, não excluído e sem pedido `Em andamento`, como na RN20, mas
  pode mudar todos os campos do RF50. Mudar a quantidade aplica nos pedidos `Pendente` os mesmos efeitos da RN20.
  Alimento `Reservado`, `Inativo` ou excluído só pode ser visto ou excluído permanentemente.
- **DT58:** na edição pelo administrador, trocar o item do catálogo ou a unidade de medida rejeita todos os pedidos
  `Pendente` do alimento, porque eles pediram outra coisa. Trocar o tipo de solicitação rejeita só os incompatíveis:
  os parciais quando o tipo vira "Somente total" e os totais quando vira "Somente parcial". A tela mostra antes
  quantos pedidos serão rejeitados ou atualizados.
- **DT59:** a exclusão permanente de alimento (RF51) vale para qualquer alimento, inclusive com pedido `Pendente` ou
  `Em andamento`: os pedidos são apagados junto e o estoque some com o alimento, sem inconsistência do outro lado. O
  diálogo mostra quantos pedidos de cada status serão apagados e exige digitar "EXCLUIR", como na DT55.
- **DT60:** a listagem do painel (RF52) inclui os alimentos excluídos logicamente, com filtro de situação (ativos ou
  excluídos, padrão todos) e o selo "Excluído", como a DT53 faz com as instituições.

**Detalhes sem RF, RN ou DT, confirmados com a dupla e registrados junto da DT57:**

1. **Data de publicação no futuro:** recusada com `400` e `code: PUBLISHED_AT_IN_FUTURE`. Uma data no passado é aceita.
   A nova data é gravada como meia-noite de Brasília daquele dia.
2. **"Status desativado" do estabelecimento (RF53):** estabelecimento não tem status, só o campo deletado. O destaque
   visual vale para estabelecimento excluído logicamente.
3. **Alimento excluído na edição:** `409` com `code: FOOD_DELETED` (código novo), em vez do `404` que o estabelecimento
   recebe, porque o administrador vê o alimento excluído.
4. **Select de item do catálogo e de unidade na edição:** sem a ação "Sugerir nova opção" (RN38), porque o
   administrador mantém as listas direto pelo painel.
5. **Observações:** o administrador pode apagar o campo, que volta a `null`.

### Fora desta change

- Pedidos no painel (RF54–RF56): 5.5.
- Alterar o status de um alimento ou de um pedido pelo painel: não há RF; os pedidos só mudam pelos efeitos da DT58 e
  da RN20.
- Exclusão lógica ou restauração de alimento pelo administrador: não há RF (o RF50 não lista o campo deletado).
- Avisar o estabelecimento ou a entidade por e-mail sobre a edição ou a exclusão: fora do escopo (RN45).
- Revisão manual de alimentos: não existe (DT16).

## Capabilities

### New Capabilities

- `admin/alimentos`: listagem, detalhe, edição e exclusão permanente de alimentos pelo painel, com auditoria e as telas
  correspondentes (RF50–RF53, DT57–DT60).

### Modified Capabilities

- `admin/painel`: a seção "Alimentos" deixa de mostrar o aviso de "em construção" e passa a mostrar a gestão de
  alimentos.

## Impact

- **Backend:** módulo novo `admin/foods` (controller, service, DTOs, erros), registrado no `AdminModule`. Reusa
  `lockFood`, `applyNewQuantityToPendingOrders` e `checkFoodQuantity` de `foods/`, `ImageStorageService`, `AuditService`
  e o `lockOrders` hoje privado de `admin-institutions.service.ts`, que passa a ser compartilhado. Códigos novos
  `FOOD_DELETED` e `PUBLISHED_AT_IN_FUTURE`.
- **Frontend:** `features/admin/foods/` (página de listagem, detalhe, edição, diálogos e `foods-api`), rotas novas sob
  `/admin/alimentos` e a entrada em `ADMIN_LIST_PAGES`. Reusa `AdminTable`, `SearchableSelect`, o seletor de imagem e os
  rótulos de status e de tipo de solicitação de `features/foods/`.
- **Banco:** sem migration.
- **Sem variável de ambiente nova.**
