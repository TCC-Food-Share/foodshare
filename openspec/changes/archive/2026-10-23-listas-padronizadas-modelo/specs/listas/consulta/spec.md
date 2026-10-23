## ADDED Requirements

### Requirement: Consulta das listas padronizadas pelas instituições

O sistema SHALL permitir que um estabelecimento ou uma entidade beneficiária autenticados consultem, para preencher os selects dos formulários, o catálogo de alimentos, as unidades de medida e os motivos de cancelamento. Cada consulta SHALL aceitar um termo de busca opcional que filtra pelo nome sem diferenciar maiúsculas nem acentos; termo vazio ou só com espaços SHALL ser tratado como ausente. Não há paginação. Requisição sem sessão SHALL receber `401`, e o administrador SHALL receber `403` com `code` `ROLE_NOT_ALLOWED`. Os termos proibidos SHALL NOT ser consultáveis por instituições.

#### Scenario: Busca sem acento no catálogo

- **WHEN** um estabelecimento autenticado consulta o catálogo de alimentos com o termo "pao"
- **THEN** o sistema retorna o item "Pão francês" e nenhum item cujo nome não contenha o termo, ignorando acentos e maiúsculas

#### Scenario: Requisição sem sessão

- **WHEN** qualquer uma das consultas é feita sem sessão autenticada válida
- **THEN** o sistema responde `401` e não retorna nenhum registro

#### Scenario: Administrador consulta a lista das instituições

- **WHEN** um administrador autenticado consulta as unidades de medida
- **THEN** o sistema responde `403` com `code` `ROLE_NOT_ALLOWED`

### Requirement: Consulta do catálogo de alimentos

A consulta do catálogo SHALL devolver cada item com `id`, `name` e a categoria (`id` e `name`), ordenados por nome.

#### Scenario: Item traz a categoria

- **WHEN** uma entidade beneficiária autenticada consulta o catálogo sem termo de busca
- **THEN** o sistema retorna todos os itens ordenados por nome, cada um com a sua categoria

### Requirement: Consulta das unidades de medida

A consulta das unidades SHALL devolver cada unidade com `id`, `name`, `abbreviation` e `allowsFraction`, na ordem do seed (por `id`). A busca SHALL considerar o nome e a sigla.

#### Scenario: Busca pela sigla

- **WHEN** um estabelecimento autenticado consulta as unidades com o termo "KG"
- **THEN** o sistema retorna a unidade "Quilograma", com `allowsFraction` verdadeiro

### Requirement: Consulta dos motivos de cancelamento sem os de sistema

A consulta dos motivos de cancelamento SHALL devolver só os motivos comuns, cada um com `id` e `name`, na ordem do seed (por `id`). Os motivos de sistema SHALL NOT aparecer, nem quando o termo de busca coincidir com o nome deles.

#### Scenario: Lista sem os motivos de sistema

- **WHEN** um estabelecimento autenticado consulta os motivos de cancelamento sem termo de busca
- **THEN** o sistema retorna os motivos comuns e nenhum dos três motivos de sistema

#### Scenario: Busca pelo nome de um motivo de sistema

- **WHEN** uma entidade beneficiária autenticada consulta os motivos com o termo "vencido"
- **THEN** o sistema não retorna o motivo "Alimento vencido"
