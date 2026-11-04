# pedidos/listagem Specification

## Purpose

Permitir que um estabelecimento ou uma entidade beneficiária autenticada liste os próprios pedidos — recorte pela sessão —, de forma paginada e ordenada da criação mais recente para a mais antiga, com filtro opcional por status, viabilizando o acompanhamento dos pedidos separados por status (RF27).

## Requirements

### Requirement: Listagem dos próprios pedidos pelo solicitante

O sistema SHALL permitir que um usuário autenticado obtenha a listagem dos pedidos vinculados a ele: para um estabelecimento, os pedidos cujo estabelecimento de origem é o dele; para uma entidade beneficiária, os pedidos criados por ela. O recorte SHALL ser resolvido pela sessão, nunca informado pelo cliente. Pedidos de outras instituições NÃO aparecem. Pedidos excluídos logicamente NÃO aparecem. Cada item da listagem traz `id`, `quantity`, `orderDate`, `status`, o alimento vinculado, o estabelecimento de origem e a entidade beneficiária.

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

### Requirement: Filtro opcional por status

O sistema SHALL aceitar um parâmetro opcional `status` que restringe a listagem aos pedidos com aquele status. O valor SHALL ser um dos status de pedido válidos: "Pendente", "Em andamento", "Rejeitado", "Doado" ou "Cancelado". Parâmetro ausente SHALL retornar pedidos de todos os status. Valor fora da lista de status válidos — inclusive os nomes antigos "Aceito" e "Recebido" — SHALL ser rejeitado como parâmetro inválido, sem retornar a listagem.

#### Scenario: Listagem filtrada por status

- **WHEN** o solicitante pede a listagem com `status` igual a "Em andamento"
- **THEN** o sistema retorna apenas os pedidos do solicitante com status "Em andamento"

#### Scenario: Listagem filtrada por "Cancelado"

- **WHEN** o solicitante pede a listagem com `status` igual a "Cancelado"
- **THEN** o sistema aceita o filtro e retorna apenas os pedidos do solicitante com status "Cancelado" (lista vazia e `total` igual a 0 se não houver nenhum)

#### Scenario: Listagem sem filtro de status

- **WHEN** o solicitante pede a listagem sem informar `status`
- **THEN** o sistema retorna os pedidos do solicitante em todos os status

#### Scenario: Status inválido

- **WHEN** o solicitante pede a listagem com `status` igual a um valor que não é um status de pedido válido
- **THEN** o sistema rejeita a requisição informando que o parâmetro é inválido, sem retornar a listagem

#### Scenario: Nome de status do MVP

- **WHEN** o solicitante pede a listagem com `status` igual a "Aceito" ou "Recebido"
- **THEN** o sistema rejeita a requisição informando que o parâmetro é inválido, sem retornar a listagem

#### Scenario: Filtro sem resultados

- **WHEN** o solicitante pede a listagem com um `status` válido para o qual ele não tem nenhum pedido
- **THEN** o sistema retorna uma lista de itens vazia e `total` igual a 0, sem erro

### Requirement: Paginação e ordenação da listagem de pedidos

O sistema SHALL paginar a listagem por meio dos parâmetros `page` (começando em 1) e `pageSize`, que aceita 10, 20, 50 ou 100. Na ausência dos parâmetros, o sistema SHALL usar `page` igual a 1 e `pageSize` igual a 10. Qualquer outro valor de `pageSize` SHALL ser rejeitado. A listagem SHALL ser ordenada da criação do pedido mais recente para a mais antiga. A paginação e a ordenação SHALL ser aplicadas sobre o resultado já filtrado por status, quando houver. A resposta SHALL incluir, além dos itens da página, o total de pedidos que atendem aos critérios aplicados e os valores de `page` e `pageSize` aplicados. A tela SHALL oferecer um select "Itens por página" com os quatro valores; trocar o valor SHALL voltar para a primeira página e manter a escolha no endereço da página.

#### Scenario: Listagem sem parâmetros de paginação

- **WHEN** o solicitante pede a listagem sem informar `page` nem `pageSize`
- **THEN** o sistema retorna a primeira página com até 10 pedidos, e informa `total`, `page` igual a 1 e `pageSize` igual a 10

#### Scenario: Escolha de itens por página

- **WHEN** o solicitante pede a listagem com `pageSize` igual a 100
- **THEN** o sistema retorna até 100 pedidos e informa `pageSize` igual a 100

#### Scenario: pageSize fora dos valores permitidos

- **WHEN** o solicitante pede a listagem com `pageSize` igual a 30
- **THEN** o sistema rejeita a requisição, sem retornar a listagem

#### Scenario: Parâmetro de paginação inválido

- **WHEN** o solicitante pede a listagem com `page` ou `pageSize` não numérico, igual a zero ou negativo
- **THEN** o sistema rejeita a requisição e informa qual parâmetro é inválido, sem retornar a listagem

#### Scenario: Página além do total de resultados

- **WHEN** o `page` solicitado está além da última página com resultados
- **THEN** o sistema retorna uma lista de itens vazia e informa o `total` real, sem erro

#### Scenario: Select de itens por página na tela

- **WHEN** o usuário escolhe 50 no select "Itens por página"
- **THEN** a listagem passa a mostrar até 50 pedidos, volta para a primeira página, e a escolha fica no endereço da página

#### Scenario: Total reflete o filtro de status

- **WHEN** o solicitante tem 12 pedidos "Em andamento" e pede a listagem com `status` igual a "Em andamento" e `pageSize` igual a 10
- **THEN** o sistema retorna 10 itens na primeira página e informa `total` igual a 12
