## MODIFIED Requirements

### Requirement: Pedido só para alimento disponível
O sistema SHALL aceitar o pedido apenas quando o `foodId` corresponder a um alimento disponível — status "Ativo", não excluído logicamente, não vencido e com quantidade atual maior que zero, o mesmo recorte da listagem. Alimento inexistente ou fora desse conjunto SHALL resultar em resposta de não encontrado, sem criar pedido.

#### Scenario: Alimento inexistente
- **WHEN** a entidade beneficiária solicita um pedido com um `foodId` que não corresponde a nenhum alimento
- **THEN** o sistema responde que o alimento não foi encontrado e não cria pedido

#### Scenario: Alimento indisponível
- **WHEN** a entidade beneficiária solicita um pedido para um alimento vencido, excluído logicamente ou com status diferente de "Ativo"
- **THEN** o sistema responde que o alimento não foi encontrado e não cria pedido

#### Scenario: Alimento esgotado
- **WHEN** a entidade beneficiária solicita um pedido para um alimento cuja quantidade atual é zero, por exemplo depois de pedidos aceitos reservarem toda a quantidade
- **THEN** o sistema responde que o alimento não foi encontrado e não cria pedido
