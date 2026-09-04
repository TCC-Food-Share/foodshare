## MODIFIED Requirements

### Requirement: Limite de pedidos em andamento por entidade beneficiária
O sistema SHALL recusar a criação de um novo pedido quando a entidade beneficiária autenticada já possuir 10 ou mais pedidos em andamento, sem criar o pedido. Um pedido conta como **em andamento** quando pertence à entidade, não está excluído logicamente e seu status não é um status terminal. Os status "Pendente" e "Aceito" são status em andamento; "Rejeitado" e "Recebido" são terminais e não contam para o limite. Pedidos de outras entidades beneficiárias não contam.

A verificação do limite SHALL ocorrer depois de resolver a entidade beneficiária da sessão e antes de qualquer validação do alimento ou da quantidade, de modo que uma entidade no limite receba a mesma recusa independentemente do conteúdo da requisição.

#### Scenario: Entidade abaixo do limite cria pedido
- **WHEN** uma entidade beneficiária autenticada com 9 pedidos em andamento solicita um pedido válido para um alimento disponível
- **THEN** o sistema cria o pedido normalmente, passando a entidade a ter 10 pedidos em andamento

#### Scenario: Entidade no limite tem o pedido recusado
- **WHEN** uma entidade beneficiária autenticada com 10 pedidos em andamento solicita um novo pedido
- **THEN** o sistema recusa a requisição por conflito de estado, informando que o limite de pedidos em andamento foi atingido, e não cria nenhum pedido

#### Scenario: Entidade acima do limite tem o pedido recusado
- **WHEN** uma entidade beneficiária autenticada com mais de 10 pedidos em andamento solicita um novo pedido
- **THEN** o sistema recusa a requisição da mesma forma e não cria nenhum pedido

#### Scenario: Pedidos excluídos logicamente não contam para o limite
- **WHEN** uma entidade beneficiária autenticada possui 9 pedidos em andamento e outros pedidos marcados como excluídos logicamente, e solicita um pedido válido
- **THEN** o sistema considera apenas os 9 pedidos em andamento, fica abaixo do limite e cria o pedido

#### Scenario: Pedidos rejeitados não contam para o limite
- **WHEN** uma entidade beneficiária autenticada possui 9 pedidos em andamento ("Pendente" ou "Aceito") e outros pedidos com status "Rejeitado", e solicita um pedido válido
- **THEN** o sistema considera apenas os 9 pedidos em andamento, fica abaixo do limite e cria o pedido

#### Scenario: Pedidos recebidos não contam para o limite
- **WHEN** uma entidade beneficiária autenticada possui 9 pedidos em andamento ("Pendente" ou "Aceito") e outros pedidos com status "Recebido", e solicita um pedido válido
- **THEN** o sistema considera apenas os 9 pedidos em andamento, fica abaixo do limite e cria o pedido

#### Scenario: Limite é isolado por entidade beneficiária
- **WHEN** uma entidade beneficiária autenticada sem pedidos em andamento solicita um pedido válido, enquanto outra entidade possui 10 ou mais pedidos em andamento
- **THEN** o sistema cria o pedido da entidade autenticada, sem considerar os pedidos de outras entidades

#### Scenario: Limite é verificado antes da validação do alimento
- **WHEN** uma entidade beneficiária autenticada com 10 pedidos em andamento solicita um pedido informando um alimento inexistente ou indisponível
- **THEN** o sistema recusa a requisição pelo limite de pedidos em andamento, sem chegar a avaliar o alimento, e não cria nenhum pedido
