## MODIFIED Requirements

### Requirement: Busca de alimentos por nome, categoria e localização

O sistema SHALL permitir que o usuário autenticado refine a listagem de alimentos por meio dos parâmetros opcionais `name`, `categoryId`, `city`, `state` e `establishmentId`:

- `name` — casa alimentos cujo nome (o nome do item do catálogo) contém o trecho informado, ignorando diferenças de caixa e de acentuação (ex: "pao" encontra "Pão francês").
- `categoryId` — casa alimentos cujo item do catálogo pertence à categoria indicada.
- `city` — casa alimentos cujo estabelecimento de origem tem o município do endereço contendo o trecho informado, ignorando caixa e acentuação.
- `state` — casa alimentos cujo estabelecimento de origem tem a UF do endereço exatamente igual à informada (2 letras).
- `establishmentId` — casa alimentos cujo estabelecimento de origem é o indicado (inteiro a partir de 1). É usado pelo perfil público do estabelecimento (RF13, DT42); valor não inteiro ou menor que 1 SHALL ser recusado com `400`.

Os parâmetros informados SHALL ser combinados por E (todos precisam casar). A busca SHALL ser aplicada sempre dentro do conjunto de alimentos disponíveis (status "Ativo", não excluído, não vencido, com quantidade maior que zero e de estabelecimento não excluído) — um filtro nunca traz alimento indisponível. Parâmetro ausente, vazio ou só com espaços SHALL ser ignorado.

#### Scenario: Busca por nome, ignorando caixa e acento

- **WHEN** o usuário solicita a listagem com `name` igual a "pao"
- **THEN** o sistema retorna os alimentos disponíveis cujo item do catálogo contém "pão" no nome (ex: "Pão francês", "Pão de forma"), e nenhum outro

#### Scenario: Busca por categoria

- **WHEN** o usuário solicita a listagem com `categoryId` de uma categoria existente
- **THEN** o sistema retorna apenas os alimentos disponíveis cujo item do catálogo é daquela categoria

#### Scenario: Busca por localização

- **WHEN** o usuário solicita a listagem com `city` igual a "birigui" e `state` igual a "SP"
- **THEN** o sistema retorna apenas os alimentos disponíveis cujo estabelecimento de origem tem o município contendo "birigui" e a UF igual a "SP"

#### Scenario: Busca por estabelecimento

- **WHEN** o usuário solicita a listagem com `establishmentId` de um estabelecimento que tem 3 alimentos disponíveis, 1 `Ativo` vencido e 1 `Inativo`
- **THEN** o sistema retorna só os 3 alimentos disponíveis desse estabelecimento, com `total` igual a 3

#### Scenario: Busca por estabelecimento excluído

- **WHEN** o usuário solicita a listagem com `establishmentId` de um estabelecimento excluído logicamente
- **THEN** o sistema retorna uma lista vazia e `total` igual a 0, sem erro

#### Scenario: establishmentId inválido

- **WHEN** o usuário solicita a listagem com `establishmentId` igual a "abc" ou a 0
- **THEN** o sistema responde `400` e não retorna a listagem

#### Scenario: Filtros combinados

- **WHEN** o usuário solicita a listagem com `name` e `categoryId` ao mesmo tempo
- **THEN** o sistema retorna apenas os alimentos disponíveis que casam com os dois critérios simultaneamente

#### Scenario: Nenhum filtro informado

- **WHEN** o usuário solicita a listagem sem `name`, `categoryId`, `city`, `state` nem `establishmentId`
- **THEN** o sistema retorna a listagem completa de alimentos disponíveis, como no comportamento sem busca

#### Scenario: Filtro sem resultados

- **WHEN** os filtros informados não casam com nenhum alimento disponível
- **THEN** o sistema retorna uma lista de itens vazia e `total` igual a 0, sem erro

#### Scenario: Busca não traz alimento indisponível

- **WHEN** existe um alimento vencido, excluído logicamente, com status diferente de "Ativo", com quantidade atual igual a zero ou de estabelecimento excluído cujo nome casa com o `name` informado
- **THEN** esse alimento não é retornado

## ADDED Requirements

### Requirement: Nome do estabelecimento no card do feed leva ao perfil público

No card de alimento do feed, quando quem vê é uma entidade beneficiária, o nome do estabelecimento de origem SHALL ser
um link para o perfil público desse estabelecimento (DT43). Para o estabelecimento logado, o nome SHALL aparecer como
texto, sem link, porque ele não vê perfil de estabelecimento (RF13). Clicar no nome NÃO SHALL abrir o detalhe do
alimento ao mesmo tempo.

#### Scenario: Entidade clica no nome do estabelecimento

- **WHEN** a entidade clica no nome do estabelecimento num card do feed
- **THEN** o frontend abre o perfil público desse estabelecimento, e não o detalhe do alimento

#### Scenario: Estabelecimento vê o feed

- **WHEN** um estabelecimento vê um card do feed
- **THEN** o nome do estabelecimento de origem aparece sem link
