## ADDED Requirements

### Requirement: Nome da outra parte no detalhe do pedido leva ao perfil público

Na tela de detalhe do pedido, o nome da outra parte SHALL ser um link para o perfil público dela (DT43): para a
entidade, o perfil do estabelecimento; para o estabelecimento, o perfil da entidade. O nome da própria instituição
NÃO SHALL ser link. Se a outra parte foi excluída logicamente, o link SHALL continuar no lugar e o perfil SHALL mostrar
"Instituição não encontrada" (`instituicoes/perfil-publico`); o detalhe do pedido em si não muda (RN12).

#### Scenario: Entidade abre o perfil do estabelecimento pelo pedido

- **WHEN** a entidade clica no nome do estabelecimento no detalhe de um pedido
- **THEN** o frontend abre o perfil público desse estabelecimento

#### Scenario: Estabelecimento abre o perfil da entidade pelo pedido

- **WHEN** o estabelecimento clica no nome da entidade no detalhe de um pedido
- **THEN** o frontend abre o perfil público dessa entidade, com o histórico de pedidos entre os dois

#### Scenario: Outra parte excluída

- **WHEN** o estabelecimento clica no nome de uma entidade excluída no detalhe de um pedido "Doado"
- **THEN** o perfil mostra "Instituição não encontrada", e o detalhe do pedido continua acessível
