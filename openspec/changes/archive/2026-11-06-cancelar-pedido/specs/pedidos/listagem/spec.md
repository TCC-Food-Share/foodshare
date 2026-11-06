## MODIFIED Requirements

### Requirement: Listagem dos próprios pedidos pelo solicitante

O sistema SHALL permitir que um usuário autenticado obtenha a listagem dos pedidos vinculados a ele: para um estabelecimento, os pedidos cujo estabelecimento de origem é o dele; para uma entidade beneficiária, os pedidos criados por ela. O recorte SHALL ser resolvido pela sessão, nunca informado pelo cliente. Pedidos de outras instituições NÃO aparecem. Pedidos excluídos logicamente NÃO aparecem. Cada item da listagem traz `id`, `quantity`, `orderDate`, `status`, o alimento vinculado, o estabelecimento de origem, a entidade beneficiária, o motivo do cancelamento (`cancellationReason`, com identificador e nome) e quem cancelou (`cancelledBy`). Os dois últimos SHALL vir preenchidos só nos pedidos "Cancelado", e nulos nos demais.

#### Scenario: Estabelecimento lista seus pedidos

- **WHEN** um estabelecimento autenticado solicita a listagem de pedidos
- **THEN** o sistema retorna os pedidos cujo estabelecimento de origem é o da sessão, e nenhum pedido de outro estabelecimento

#### Scenario: Entidade beneficiária lista seus pedidos

- **WHEN** uma entidade beneficiária autenticada solicita a listagem de pedidos
- **THEN** o sistema retorna os pedidos criados por ela, e nenhum pedido de outra entidade

#### Scenario: Requisição sem autenticação

- **WHEN** a listagem de pedidos é solicitada sem sessão autenticada válida
- **THEN** o sistema nega o acesso e não retorna nenhum pedido

#### Scenario: Conta autenticada não é estabelecimento nem entidade beneficiária

- **WHEN** uma conta que não tem estabelecimento nem entidade beneficiária vinculada solicita a listagem
- **THEN** o sistema responde que não há instituição vinculada e não retorna listagem

#### Scenario: Pedido excluído logicamente não aparece

- **WHEN** o solicitante tem um pedido marcado como excluído logicamente
- **THEN** esse pedido não aparece na listagem

#### Scenario: Pedido cancelado traz motivo e quem cancelou

- **WHEN** a entidade cancelou um pedido com o motivo "Solicitação feita por engano" e o estabelecimento solicita a listagem
- **THEN** o item desse pedido traz o motivo "Solicitação feita por engano" e `cancelledBy` igual a `BENEFICIARY_ENTITY`

#### Scenario: Pedido não cancelado não traz motivo

- **WHEN** o solicitante lista pedidos "Pendente", "Em andamento", "Rejeitado" ou "Doado"
- **THEN** esses itens trazem `cancellationReason` e `cancelledBy` nulos

## ADDED Requirements

### Requirement: Aba "Cancelado" mostra o motivo e quem cancelou

A tela de listagem de pedidos SHALL mostrar, na aba "Cancelado", o motivo do cancelamento e quem cancelou cada pedido, do ponto de vista de quem está vendo: "Você" quando a própria instituição cancelou, "Estabelecimento" ou "Entidade" quando foi a outra parte. Os valores de quem cancelou reservados a outras changes (administrador e sistema) SHALL ter rótulo próprio, sem citar "administrador" na tela da instituição. As outras abas SHALL NOT mostrar essas informações.

#### Scenario: Entidade vê pedido cancelado pelo estabelecimento

- **WHEN** a entidade abre a aba "Cancelado" e há um pedido cancelado pelo estabelecimento com o motivo "Alimento não está mais disponível"
- **THEN** a linha desse pedido mostra o motivo "Alimento não está mais disponível" e "Estabelecimento" como quem cancelou

#### Scenario: Instituição vê o próprio cancelamento

- **WHEN** o estabelecimento abre a aba "Cancelado" e há um pedido que ele mesmo cancelou
- **THEN** a linha desse pedido mostra o motivo e "Você" como quem cancelou

#### Scenario: Aba "Cancelado" em tela estreita

- **WHEN** a aba "Cancelado" é aberta numa tela de celular, que mostra os pedidos em cards
- **THEN** cada card de pedido cancelado mostra o motivo e quem cancelou
