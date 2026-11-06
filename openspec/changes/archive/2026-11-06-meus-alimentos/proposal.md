## Why

O estabelecimento hoje só cadastra alimentos: não consegue ver os que publicou,
corrigir validade ou quantidade, tirar um alimento do ar nem reativá-lo. A
máquina de estados do alimento (`docs/REQUISITOS.md`) depende dessas ações, e o
cadastro padronizado (2.1), do qual esta change depende, já está pronto.

## What Changes

- **Listagem do estabelecimento (`GET /foods/mine`)**: status, busca e ordenação
  por campo, paginada, com a contagem de pedidos em aberto de cada alimento (RF19).
- **Edição (`PATCH /foods/:id`)**: só validade e quantidade, em alimento `Ativo` sem
  pedido `Em andamento` (RF15, RN20). Ao mudar a quantidade, pedidos `Pendente` do
  tipo total acompanham o estoque e registram `quantityUpdatedAt`; pedidos parciais
  que não cabem mais viram `Rejeitado`.
- **Prévia do efeito da edição (`GET /foods/mine/:id/quantity-impact`)**, para o
  diálogo dizer quantos pedidos serão afetados.
- **Desativar (`PATCH /foods/:id/deactivate`)** (RF18, RN21), **reativar
  (`PATCH /foods/:id/reactivate`)** (RF17, RN22) e **excluir logicamente
  (`DELETE /foods/:id`)**, com motivo obrigatório se houver pedido `Em andamento`
  (RF16, RN23, RN24).
- **Antecipação da 3.1:** `Order.type` entra nesta change, porque a RN20 precisa
  dele. Ao criar o pedido, o tipo é derivado da quantidade. `Order.quantityUpdatedAt`
  e o índice `(foodId, statusId)` também entram.
- **Concorrência em pedidos:** criação e aceite passam a travar a linha do alimento,
  na mesma ordem das ações acima, para não haver impasse nem leitura de quantidade
  antiga.
- **Detalhe (`GET /foods/:id`)**: o dono vê o próprio alimento não excluído em
  qualquer status, mesmo vencido, para a ação "Ver" da tela.
- **Frontend**: tela "Meus Alimentos" em `/meus-alimentos`, com abas
  Ativo/Reservado/Inativo, ações por linha conforme o estado e diálogos que dizem
  quantos pedidos serão afetados.

- **Correções encontradas na verificação:**
  - quantidade acima de 99.999.999,99 causava erro `500` no cadastro e na edição. Agora é
    recusada com `400`, e o formulário avisa no campo;
  - o app ficava carregando para sempre quando a consulta da sessão (`GET /me`) falhava com algo
    diferente de `401`, como `429` ou falta de conexão. Agora mostra uma tela de erro com
    "Tentar novamente". O problema existia antes desta change.

### Requisitos cobertos

- **RF:** RF15, RF16, RF17, RF18, RF19 e, em parte, RF21 (detalhe para o dono).
- **RN:** RN20, RN21, RN22, RN23, RN24. Usa RN10, RN19, RN38 e DT21.
- **DT novas** (decididas na revisão desta proposta, entram em `docs/REQUISITOS.md`):
  - **DT26:** editar e reativar recusam data de vencimento no passado (`400`,
    `code: EXPIRATION_DATE_IN_PAST`). O cadastro (RF14) não muda.
  - **DT27:** a exclusão lógica de um alimento não devolve a quantidade dos pedidos
    `Em andamento` cancelados nem altera o status dele. A RN09 vale para o
    cancelamento comum (RF26), não para esta exclusão.
  - **DT28:** `Order.type` entra na 2.2. Até a 3.1, o tipo é derivado na criação do
    pedido.
  - **DT29:** o estabelecimento dono vê o detalhe do próprio alimento não excluído em
    qualquer status.

### Divergências do protótipo ("Meus Alimentos (Doador)")

- Abas Ativo/Reservado/Inativo em vez de Todos/Ativos/Encerrados: "Encerrado" não é
  status (DT02), e o RF19 separa por status.
- Sem os cartões de indicadores: nenhum RF pede. As contagens ficam nas abas.
- Sem o select "Categoria": o RF19 pede busca por categoria, atendida pelo campo
  de busca.
- Coluna "Publicação" a mais, porque o RF19 pede busca e ordenação por esse campo.

## Fora desta change

- Validação da quantidade pelo tipo de solicitação (RN03), aceite com `Reservado` e
  rejeições automáticas (RN07), confirmação (RN08), `Order.acceptedAt`, e as opções do
  modal "Solicitar doação": **3.1**. Por isso, até a 3.1 o aceite não leva alimento a
  `Reservado`, e essa aba só mostra dados criados direto no banco.
- Cancelamento comum de pedido (RF26, RN09) e aba Cancelado com o motivo: **3.2**.
- Aviso "Quantidade atualizada pelo estabelecimento em …" no detalhe do pedido: **3.3**.
  Aqui o campo só é gravado.
- Edição e exclusão permanente de alimento pelo administrador (RF50, RF51): **5.4**.
- Cancelamento de pedidos de alimentos vencidos (RF72, RN11): **6.1**.

## Capabilities

### New Capabilities

- `alimentos/meus-alimentos`: listagem dos alimentos do próprio estabelecimento e tela "Meus Alimentos".
- `alimentos/gestao`: edição, desativação, reativação e exclusão lógica, com os efeitos sobre os pedidos.

### Modified Capabilities

- `alimentos/detalhe`: o dono vê o próprio alimento não excluído em qualquer status.
- `pedidos/solicitacao`: o pedido passa a registrar o tipo, e a criação confere o alimento sob trava.
- `pedidos/aceite`: o aceite usa a quantidade atual do pedido, conferida sob trava.
- `alimentos/cadastro`: quantidade máxima no cadastro, na edição e na reativação.
- `auth/login`: o frontend trata a falha ao carregar a sessão.

## Impact

- **Banco:** migration em `Order` (`type`, `quantityUpdatedAt`, índice
  `(foodId, statusId)`), com preenchimento dos pedidos que já existem.
- **Backend:** `foods/` (rotas, service, DTOs, constantes) e `orders/orders.service.ts`
  (`create`, `accept`).
- **Frontend:** `features/foods/` (tela, diálogos, API, rótulos de status),
  `features/catalog/catalog-api.ts` (motivos de cancelamento), `app/router.tsx` e
  `components/layout/nav-items.ts`.
- **Depende de `sugestoes` (1.5):** o select de motivo usa a ação "Sugerir nova
  opção" (RN38), já em `develop`.
- **Docs:** `REQUISITOS.md` (DT26–DT29), `MODELO-DE-DADOS.md` e
  `PLANO-IMPLEMENTACAO.md` (2.2 e 3.1).
