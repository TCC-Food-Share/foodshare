## Purpose

Permitir que um usuário autenticado obtenha a lista fixa de categorias de alimento, viabilizando o filtro de busca por categoria (RF12) e, futuramente, a seleção de categoria no cadastro de alimento (RF10).

## ADDED Requirements

### Requirement: Listagem das categorias de alimento
O sistema SHALL permitir que qualquer usuário autenticado obtenha a lista completa de categorias de alimento cadastradas, cada uma com `id` e `name`. A lista SHALL ser retornada ordenada por `id`. Não há paginação — a lista é fixa e pequena.

#### Scenario: Usuário autenticado obtém a lista de categorias
- **WHEN** um usuário autenticado solicita a lista de categorias
- **THEN** o sistema retorna todas as categorias cadastradas, cada uma com `id` e `name`, ordenadas por `id`

#### Scenario: Requisição sem sessão autenticada
- **WHEN** a lista de categorias é solicitada sem sessão autenticada válida
- **THEN** o sistema nega o acesso e não retorna nenhuma categoria

#### Scenario: Papel do usuário não altera a lista
- **WHEN** um estabelecimento e uma entidade beneficiária solicitam a lista de categorias no mesmo momento
- **THEN** ambos recebem exatamente o mesmo conjunto de categorias
