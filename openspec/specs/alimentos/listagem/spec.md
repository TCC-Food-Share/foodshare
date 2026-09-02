# alimentos/listagem Specification

## Purpose

Permitir que um usuário autenticado visualize a listagem paginada dos alimentos disponíveis na plataforma — cadastrados por qualquer estabelecimento —, viabilizando os fluxos seguintes do MVP que partem de uma lista de alimentos (busca e pedido de doação).

## Requirements

### Requirement: Listagem de alimentos disponíveis para usuário autenticado
O sistema SHALL permitir que qualquer usuário autenticado (estabelecimento ou entidade beneficiária) obtenha a listagem dos alimentos disponíveis na plataforma. Um alimento é considerado disponível quando tem status "Ativo", não está excluído logicamente e ainda não venceu (data de vencimento a partir da data atual). A listagem abrange alimentos de qualquer estabelecimento, sem recorte por quem cadastrou, e cada item traz os mesmos dados retornados no cadastro do alimento (imagem, nome, categoria, quantidade e unidade, descrição, data de vencimento, status e estabelecimento de origem).

#### Scenario: Usuário autenticado obtém a listagem
- **WHEN** um usuário autenticado solicita a listagem de alimentos
- **THEN** o sistema retorna a página de alimentos disponíveis, cada um com seus dados completos

#### Scenario: Requisição sem sessão autenticada
- **WHEN** a listagem de alimentos é solicitada sem sessão autenticada válida
- **THEN** o sistema nega o acesso e não retorna nenhum alimento

#### Scenario: Alimento indisponível não aparece
- **WHEN** existe um alimento excluído logicamente, ou com data de vencimento já passada, ou com status diferente de "Ativo"
- **THEN** esse alimento não aparece na listagem

#### Scenario: Alimento que vence no dia atual ainda aparece
- **WHEN** existe um alimento disponível cuja data de vencimento é a data de hoje
- **THEN** esse alimento aparece na listagem

#### Scenario: Listagem abrange todos os estabelecimentos
- **WHEN** há alimentos disponíveis cadastrados por estabelecimentos diferentes
- **THEN** a listagem inclui alimentos de todos eles, independentemente de qual estabelecimento fez a requisição

#### Scenario: Papel do usuário não altera a listagem
- **WHEN** um estabelecimento e uma entidade beneficiária solicitam a listagem no mesmo momento
- **THEN** ambos recebem o mesmo conjunto de alimentos disponíveis

### Requirement: Paginação e ordenação da listagem
O sistema SHALL paginar a listagem de alimentos por meio dos parâmetros `page` (número da página, começando em 1) e `pageSize` (quantidade de itens por página). Na ausência dos parâmetros, o sistema SHALL usar `page` igual a 1 e `pageSize` igual a 20; o sistema SHALL limitar `pageSize` a no máximo 50. A listagem SHALL ser ordenada da publicação mais recente para a mais antiga. A resposta SHALL incluir, além dos itens da página, o total de alimentos disponíveis e os valores de `page` e `pageSize` aplicados.

#### Scenario: Listagem sem parâmetros de paginação
- **WHEN** um usuário autenticado solicita a listagem sem informar `page` nem `pageSize`
- **THEN** o sistema retorna a primeira página com até 20 alimentos, ordenados da publicação mais recente para a mais antiga, e informa `total`, `page` igual a 1 e `pageSize` igual a 20

#### Scenario: Página além do total de resultados
- **WHEN** o `page` solicitado está além da última página com resultados
- **THEN** o sistema retorna uma lista de itens vazia e informa o `total` real, sem erro

#### Scenario: pageSize acima do teto permitido
- **WHEN** um usuário solicita a listagem com `pageSize` maior que 50
- **THEN** o sistema retorna no máximo 50 itens e informa `pageSize` igual a 50

#### Scenario: Parâmetro de paginação inválido
- **WHEN** um usuário solicita a listagem com `page` ou `pageSize` não numérico, igual a zero ou negativo
- **THEN** o sistema rejeita a requisição e informa qual parâmetro é inválido, sem retornar a listagem
