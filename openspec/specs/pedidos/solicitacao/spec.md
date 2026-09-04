# pedidos/solicitacao Specification

## Purpose

Permitir que uma entidade beneficiária autenticada crie um pedido de doação para um alimento disponível, informando a quantidade desejada, viabilizando os fluxos de aceite, rejeição e confirmação de recebimento do MVP.

## Requirements

### Requirement: Solicitação de pedido de doação pela entidade beneficiária
O sistema SHALL permitir que uma entidade beneficiária autenticada crie um pedido de doação informando o alimento (por id) e a quantidade desejada (valor numérico positivo, aceitando fracionário). O pedido SHALL ser vinculado exclusivamente à entidade beneficiária autenticada e ao estabelecimento de origem do alimento, sem que o cliente informe qualquer um desses vínculos.

#### Scenario: Pedido com dados válidos
- **WHEN** uma entidade beneficiária autenticada solicita um pedido para um alimento disponível, com quantidade positiva que não excede a quantidade atual do alimento
- **THEN** o sistema cria o pedido vinculado à entidade autenticada e ao estabelecimento do alimento, e retorna confirmação com os dados do pedido

#### Scenario: Requisição sem autenticação
- **WHEN** uma solicitação de pedido é enviada sem sessão autenticada válida
- **THEN** o sistema nega o acesso e não cria nenhum pedido

#### Scenario: Conta autenticada não é entidade beneficiária
- **WHEN** um estabelecimento autenticado tenta criar um pedido
- **THEN** o sistema rejeita a requisição e não cria nenhum pedido

#### Scenario: Vínculos resolvidos pela sessão e pelo alimento
- **WHEN** uma entidade beneficiária autenticada cria um pedido válido
- **THEN** o sistema vincula o pedido à entidade beneficiária da sessão e ao estabelecimento de origem do alimento, sem que esses vínculos venham do corpo da requisição

#### Scenario: Identificador de vínculo enviado no corpo
- **WHEN** a solicitação inclui um identificador de entidade beneficiária ou de estabelecimento no corpo da requisição
- **THEN** o sistema recusa a requisição como dado inválido, sem criar pedido

### Requirement: Pedido só para alimento disponível
O sistema SHALL aceitar o pedido apenas quando o `foodId` corresponder a um alimento disponível — status "Ativo", não excluído logicamente e não vencido, o mesmo recorte da listagem. Alimento inexistente ou fora desse conjunto SHALL resultar em resposta de não encontrado, sem criar pedido.

#### Scenario: Alimento inexistente
- **WHEN** a entidade beneficiária solicita um pedido com um `foodId` que não corresponde a nenhum alimento
- **THEN** o sistema responde que o alimento não foi encontrado e não cria pedido

#### Scenario: Alimento indisponível
- **WHEN** a entidade beneficiária solicita um pedido para um alimento vencido, excluído logicamente ou com status diferente de "Ativo"
- **THEN** o sistema responde que o alimento não foi encontrado e não cria pedido

### Requirement: Quantidade do pedido validada contra o estoque
O sistema SHALL exigir que a quantidade do pedido seja maior que zero e não maior que a quantidade atual do alimento. Quantidade ausente, não numérica, igual a zero ou negativa SHALL ser rejeitada como dado inválido; quantidade acima da quantidade do alimento SHALL ser rejeitada informando que excede o disponível. Em nenhum dos casos o pedido é criado.

#### Scenario: Quantidade acima do estoque
- **WHEN** a entidade beneficiária solicita uma quantidade maior que a quantidade atual do alimento
- **THEN** o sistema rejeita o pedido informando que a quantidade excede o disponível, sem criar pedido

#### Scenario: Quantidade igual à quantidade total do alimento
- **WHEN** a entidade beneficiária solicita exatamente a quantidade atual do alimento
- **THEN** o sistema cria o pedido normalmente

#### Scenario: Quantidade inválida
- **WHEN** a entidade beneficiária envia a solicitação sem quantidade, com quantidade não numérica, igual a zero ou negativa
- **THEN** o sistema rejeita a requisição informando o campo inválido, sem criar pedido

### Requirement: Pedido inicia com status "Pendente"
O sistema SHALL atribuir automaticamente o status "Pendente" a todo pedido no momento da criação, sem permitir que o cliente informe ou escolha o status inicial.

#### Scenario: Status inicial automático
- **WHEN** uma entidade beneficiária cria um pedido com dados válidos
- **THEN** o sistema atribui o status "Pendente" ao pedido criado, independentemente de qualquer valor de status presente na requisição

### Requirement: Limite de pedidos em andamento por entidade beneficiária
O sistema SHALL recusar a criação de um novo pedido quando a entidade beneficiária autenticada já possuir 10 ou mais pedidos em andamento, sem criar o pedido. Um pedido conta como **em andamento** quando pertence à entidade, não está excluído logicamente e seu status não é um status terminal. No estado atual do sistema o único status de pedido é "Pendente", que é um status em andamento; portanto todo pedido não excluído da entidade conta para o limite. Pedidos de outras entidades beneficiárias não contam.

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

#### Scenario: Limite é isolado por entidade beneficiária
- **WHEN** uma entidade beneficiária autenticada sem pedidos em andamento solicita um pedido válido, enquanto outra entidade possui 10 ou mais pedidos em andamento
- **THEN** o sistema cria o pedido da entidade autenticada, sem considerar os pedidos de outras entidades

#### Scenario: Limite é verificado antes da validação do alimento
- **WHEN** uma entidade beneficiária autenticada com 10 pedidos em andamento solicita um pedido informando um alimento inexistente ou indisponível
- **THEN** o sistema recusa a requisição pelo limite de pedidos em andamento, sem chegar a avaliar o alimento, e não cria nenhum pedido
