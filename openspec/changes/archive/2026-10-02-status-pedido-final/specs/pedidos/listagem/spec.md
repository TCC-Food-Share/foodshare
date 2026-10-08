## MODIFIED Requirements

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
O sistema SHALL paginar a listagem por meio dos parâmetros `page` (começando em 1) e `pageSize`. Na ausência dos parâmetros, o sistema SHALL usar `page` igual a 1 e `pageSize` igual a 20; o sistema SHALL limitar `pageSize` a no máximo 50. A listagem SHALL ser ordenada da criação do pedido mais recente para a mais antiga. A paginação e a ordenação SHALL ser aplicadas sobre o resultado já filtrado por status, quando houver. A resposta SHALL incluir, além dos itens da página, o total de pedidos que atendem ao recorte e ao filtro aplicados e os valores de `page` e `pageSize` aplicados.

#### Scenario: Listagem sem parâmetros de paginação
- **WHEN** o solicitante pede a listagem sem informar `page` nem `pageSize`
- **THEN** o sistema retorna a primeira página com até 20 pedidos, ordenados do mais recente para o mais antigo, e informa `total`, `page` igual a 1 e `pageSize` igual a 20

#### Scenario: pageSize acima do teto permitido
- **WHEN** o solicitante pede a listagem com `pageSize` maior que 50
- **THEN** o sistema retorna no máximo 50 itens e informa `pageSize` igual a 50

#### Scenario: Parâmetro de paginação inválido
- **WHEN** o solicitante pede a listagem com `page` ou `pageSize` não numérico, igual a zero ou negativo
- **THEN** o sistema rejeita a requisição e informa qual parâmetro é inválido, sem retornar a listagem

#### Scenario: Página além do total de resultados
- **WHEN** o `page` solicitado está além da última página com resultados
- **THEN** o sistema retorna uma lista de itens vazia e informa o `total` real, sem erro

#### Scenario: Total reflete o filtro de status
- **WHEN** o solicitante tem 3 pedidos "Em andamento" e pede a listagem com `status` igual a "Em andamento" e `pageSize` igual a 2
- **THEN** o sistema retorna 2 itens na primeira página e informa `total` igual a 3
