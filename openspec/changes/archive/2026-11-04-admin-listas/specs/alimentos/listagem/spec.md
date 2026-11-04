## MODIFIED Requirements

### Requirement: Paginação e ordenação da listagem

O sistema SHALL paginar a listagem por meio dos parâmetros `page` (começando em 1) e `pageSize`, que aceita 10, 20, 50 ou 100. Na ausência dos parâmetros, o sistema SHALL usar `page` igual a 1 e `pageSize` igual a 10. Qualquer outro valor de `pageSize` SHALL ser rejeitado. A listagem SHALL ser ordenada da publicação mais recente para a mais antiga. A paginação e a ordenação SHALL ser aplicadas sobre o resultado já filtrado pelos parâmetros de busca, quando houver. A resposta SHALL incluir, além dos itens da página, o total de alimentos que atendem aos critérios aplicados e os valores de `page` e `pageSize` aplicados. A tela SHALL oferecer um select "Itens por página" com os quatro valores; trocar o valor SHALL voltar para a primeira página e manter a escolha no endereço da página.

#### Scenario: Listagem sem parâmetros de paginação

- **WHEN** um usuário autenticado solicita a listagem sem informar `page` nem `pageSize`
- **THEN** o sistema retorna a primeira página com até 10 alimentos, e informa `total`, `page` igual a 1 e `pageSize` igual a 10

#### Scenario: Escolha de itens por página

- **WHEN** um usuário autenticado solicita a listagem com `pageSize` igual a 100
- **THEN** o sistema retorna até 100 alimentos e informa `pageSize` igual a 100

#### Scenario: pageSize fora dos valores permitidos

- **WHEN** um usuário autenticado solicita a listagem com `pageSize` igual a 30
- **THEN** o sistema rejeita a requisição, sem retornar a listagem

#### Scenario: Parâmetro de paginação inválido

- **WHEN** um usuário autenticado solicita a listagem com `page` ou `pageSize` não numérico, igual a zero ou negativo
- **THEN** o sistema rejeita a requisição e informa qual parâmetro é inválido, sem retornar a listagem

#### Scenario: Página além do total de resultados

- **WHEN** o `page` solicitado está além da última página com resultados
- **THEN** o sistema retorna uma lista de itens vazia e informa o `total` real, sem erro

#### Scenario: Select de itens por página na tela

- **WHEN** o usuário escolhe 50 no select "Itens por página"
- **THEN** a listagem passa a mostrar até 50 alimentos, volta para a primeira página, e a escolha fica no endereço da página

#### Scenario: Total reflete o filtro de busca

- **WHEN** o usuário solicita a listagem com um filtro de busca que casa com 12 alimentos disponíveis, com `pageSize` igual a 10
- **THEN** o sistema retorna 10 itens na primeira página e informa `total` igual a 12
