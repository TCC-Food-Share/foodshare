## ADDED Requirements

### Requirement: Um pedido em andamento por entidade e alimento
O sistema SHALL recusar a criação de um novo pedido quando a entidade beneficiária autenticada já possuir um pedido em andamento para o mesmo alimento, sem criar o pedido. Um pedido conta como **em andamento** pelo mesmo critério do limite de pedidos em andamento: pertence à entidade, não está excluído logicamente e seu status é "Pendente" ou "Aceito". Os status "Rejeitado" e "Recebido" são terminais e não bloqueiam um novo pedido. Pedidos de outras entidades beneficiárias para o mesmo alimento, e pedidos da mesma entidade para outros alimentos, não contam. A quantidade solicitada não influencia o bloqueio.

A verificação SHALL ocorrer depois do limite de pedidos em andamento e depois de confirmar que o alimento está disponível, e antes da validação da quantidade.

#### Scenario: Primeiro pedido da entidade para o alimento
- **WHEN** uma entidade beneficiária autenticada sem pedido em andamento para um alimento disponível solicita um pedido válido para ele
- **THEN** o sistema cria o pedido normalmente

#### Scenario: Novo pedido com o anterior pendente
- **WHEN** uma entidade beneficiária autenticada com um pedido "Pendente" para um alimento solicita outro pedido para o mesmo alimento
- **THEN** o sistema recusa a requisição por conflito de estado, informando que já existe um pedido em andamento para o alimento, e não cria nenhum pedido

#### Scenario: Novo pedido com o anterior aceito
- **WHEN** uma entidade beneficiária autenticada com um pedido "Aceito" para um alimento solicita outro pedido para o mesmo alimento
- **THEN** o sistema recusa a requisição da mesma forma e não cria nenhum pedido

#### Scenario: Novo pedido depois de o anterior ser rejeitado
- **WHEN** uma entidade beneficiária autenticada cujo único pedido para um alimento está "Rejeitado" solicita um novo pedido válido para o mesmo alimento
- **THEN** o sistema cria o pedido normalmente

#### Scenario: Novo pedido depois de o anterior ser recebido
- **WHEN** uma entidade beneficiária autenticada cujo único pedido para um alimento está "Recebido" solicita um novo pedido válido para o mesmo alimento disponível
- **THEN** o sistema cria o pedido normalmente

#### Scenario: Pedido excluído logicamente não bloqueia
- **WHEN** uma entidade beneficiária autenticada cujo único pedido para um alimento está marcado como excluído logicamente solicita um novo pedido válido para o mesmo alimento
- **THEN** o sistema cria o pedido normalmente

#### Scenario: Outra entidade com pedido em andamento para o mesmo alimento
- **WHEN** uma entidade beneficiária autenticada sem pedido para um alimento solicita um pedido válido para ele, enquanto outra entidade possui um pedido "Pendente" para o mesmo alimento
- **THEN** o sistema cria o pedido da entidade autenticada, sem considerar os pedidos de outras entidades

#### Scenario: Pedido em andamento da mesma entidade para outro alimento
- **WHEN** uma entidade beneficiária autenticada com um pedido "Pendente" para um alimento solicita um pedido válido para um alimento diferente
- **THEN** o sistema cria o pedido normalmente

#### Scenario: Quantidade diferente não evita o bloqueio
- **WHEN** uma entidade beneficiária autenticada com um pedido em andamento para um alimento solicita outro pedido para o mesmo alimento com uma quantidade diferente da do primeiro
- **THEN** o sistema recusa a requisição por já existir um pedido em andamento para o alimento e não cria nenhum pedido

#### Scenario: Alimento que deixou de estar disponível
- **WHEN** uma entidade beneficiária autenticada com um pedido em andamento para um alimento solicita um novo pedido para esse alimento depois de ele ficar vencido, excluído logicamente ou com status diferente de "Ativo"
- **THEN** o sistema responde que o alimento não foi encontrado, sem avaliar a duplicidade, e não cria pedido

#### Scenario: Limite de pedidos em andamento prevalece
- **WHEN** uma entidade beneficiária autenticada com 10 pedidos em andamento, um deles para o alimento solicitado, solicita um novo pedido para esse alimento
- **THEN** o sistema recusa a requisição pelo limite de pedidos em andamento, e não pela duplicidade, e não cria nenhum pedido

#### Scenario: Duplicidade é verificada antes da quantidade
- **WHEN** uma entidade beneficiária autenticada com um pedido em andamento para um alimento solicita outro pedido para o mesmo alimento com quantidade acima da disponível
- **THEN** o sistema recusa a requisição por já existir um pedido em andamento para o alimento, sem chegar a avaliar a quantidade, e não cria nenhum pedido

### Requirement: Recusas por conflito identificam o motivo
O sistema SHALL identificar, no corpo da resposta de conflito (`409`) da criação de pedido, o motivo da recusa por um código estável e legível por máquina, além da mensagem descritiva. O código SHALL ser `ORDERS_IN_PROGRESS_LIMIT_REACHED` quando a recusa se deve ao limite de pedidos em andamento e `DUPLICATE_ORDER_IN_PROGRESS` quando se deve a já existir um pedido em andamento da entidade para o mesmo alimento. Cada motivo SHALL ter sempre o seu código, independentemente do texto da mensagem.

#### Scenario: Recusa pelo limite traz o código do limite
- **WHEN** uma entidade beneficiária autenticada com 10 pedidos em andamento solicita um novo pedido
- **THEN** o corpo da resposta de conflito traz o código `ORDERS_IN_PROGRESS_LIMIT_REACHED`

#### Scenario: Recusa por duplicidade traz o código de duplicidade
- **WHEN** uma entidade beneficiária autenticada com um pedido em andamento para um alimento solicita outro pedido para o mesmo alimento
- **THEN** o corpo da resposta de conflito traz o código `DUPLICATE_ORDER_IN_PROGRESS`
