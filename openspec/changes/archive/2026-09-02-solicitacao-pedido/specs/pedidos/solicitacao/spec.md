## Purpose

Permitir que uma entidade beneficiária autenticada crie um pedido de doação para um alimento disponível, informando a quantidade desejada, viabilizando os fluxos de aceite, rejeição e confirmação de recebimento do MVP.

## ADDED Requirements

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
