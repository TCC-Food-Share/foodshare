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

### Requirement: Busca de alimentos por nome, categoria e localização
O sistema SHALL permitir que o usuário autenticado refine a listagem de alimentos por meio dos parâmetros opcionais `name`, `categoryId`, `city` e `state`:

- `name` — casa alimentos cujo nome contém o trecho informado, ignorando diferenças de caixa e de acentuação (ex: "feijao" encontra "Feijão").
- `categoryId` — casa alimentos da categoria indicada (identificador da lista fixa de categorias).
- `city` — casa alimentos cujo estabelecimento de origem tem o município do endereço contendo o trecho informado, ignorando caixa e acentuação.
- `state` — casa alimentos cujo estabelecimento de origem tem a UF do endereço exatamente igual à informada (2 letras).

Os parâmetros informados SHALL ser combinados por E (todos precisam casar). A busca SHALL ser aplicada sempre dentro do conjunto de alimentos disponíveis (status "Ativo", não excluído, não vencido) — um filtro nunca traz alimento indisponível. Parâmetro ausente, vazio ou só com espaços SHALL ser ignorado.

#### Scenario: Busca por nome, ignorando caixa e acento
- **WHEN** o usuário solicita a listagem com `name` igual a "feijao"
- **THEN** o sistema retorna os alimentos disponíveis cujo nome contém "feijão" (ou "Feijao", "FEIJÃO" etc.), e nenhum outro

#### Scenario: Busca por categoria
- **WHEN** o usuário solicita a listagem com `categoryId` de uma categoria existente
- **THEN** o sistema retorna apenas os alimentos disponíveis daquela categoria

#### Scenario: Busca por localização
- **WHEN** o usuário solicita a listagem com `city` igual a "birigui" e `state` igual a "SP"
- **THEN** o sistema retorna apenas os alimentos disponíveis cujo estabelecimento de origem tem o município contendo "birigui" e a UF igual a "SP"

#### Scenario: Filtros combinados
- **WHEN** o usuário solicita a listagem com `name` e `categoryId` ao mesmo tempo
- **THEN** o sistema retorna apenas os alimentos disponíveis que casam com os dois critérios simultaneamente

#### Scenario: Nenhum filtro informado
- **WHEN** o usuário solicita a listagem sem `name`, `categoryId`, `city` nem `state`
- **THEN** o sistema retorna a listagem completa de alimentos disponíveis, como no comportamento sem busca

#### Scenario: Filtro sem resultados
- **WHEN** os filtros informados não casam com nenhum alimento disponível
- **THEN** o sistema retorna uma lista de itens vazia e `total` igual a 0, sem erro

#### Scenario: Busca não traz alimento indisponível
- **WHEN** existe um alimento vencido, excluído logicamente ou com status diferente de "Ativo" cujo nome casa com o `name` informado
- **THEN** esse alimento não é retornado

### Requirement: Paginação e ordenação da listagem
O sistema SHALL paginar a listagem de alimentos por meio dos parâmetros `page` (número da página, começando em 1) e `pageSize` (quantidade de itens por página). Na ausência dos parâmetros, o sistema SHALL usar `page` igual a 1 e `pageSize` igual a 20; o sistema SHALL limitar `pageSize` a no máximo 50. A listagem SHALL ser ordenada da publicação mais recente para a mais antiga. A paginação e a ordenação SHALL ser aplicadas sobre o resultado já filtrado pelos parâmetros de busca, quando houver. A resposta SHALL incluir, além dos itens da página, o total de alimentos que atendem aos critérios de busca aplicados (ou o total de disponíveis, quando não há busca) e os valores de `page` e `pageSize` aplicados.

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

#### Scenario: Total reflete o filtro de busca
- **WHEN** o usuário solicita a listagem com um filtro de busca que casa com 3 alimentos disponíveis, com `pageSize` igual a 2
- **THEN** o sistema retorna 2 itens na primeira página e informa `total` igual a 3
