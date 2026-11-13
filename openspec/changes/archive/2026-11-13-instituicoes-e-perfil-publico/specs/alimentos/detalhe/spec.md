## ADDED Requirements

### Requirement: Nome do estabelecimento no detalhe do alimento leva ao perfil público

Na tela de detalhe do alimento, quando quem vê é uma entidade beneficiária, o nome do estabelecimento de origem SHALL
ser um link para o perfil público desse estabelecimento (DT43). Para o estabelecimento logado, inclusive o dono do
alimento, o nome SHALL aparecer como texto, sem link (RF13).

#### Scenario: Entidade abre o perfil a partir do detalhe

- **WHEN** a entidade clica no nome do estabelecimento no detalhe de um alimento
- **THEN** o frontend abre o perfil público desse estabelecimento

#### Scenario: Dono vê o próprio alimento

- **WHEN** o estabelecimento dono abre o detalhe do próprio alimento
- **THEN** o nome do estabelecimento aparece sem link
