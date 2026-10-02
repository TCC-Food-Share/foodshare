## REMOVED Requirements

### Requirement: Limite de pedidos em andamento por entidade beneficiária
**Reason**: "Em andamento" passa a ser o nome de um status só; o conjunto "Pendente" + "Em andamento" se chama "pedidos em aberto". Os cenários citavam os status "Aceito" e "Recebido", que deixam de existir (DT01).
**Migration**: Substituído por "Limite de pedidos em aberto por entidade beneficiária", com o mesmo limite de 10 e o mesmo código de erro.

### Requirement: Um pedido em andamento por entidade e alimento
**Reason**: Mesma troca de terminologia e de nomes de status do requisito acima.
**Migration**: Substituído por "Um pedido em aberto por entidade e alimento", com a mesma regra e o mesmo código de erro.

## ADDED Requirements

### Requirement: Limite de pedidos em aberto por entidade beneficiária
O sistema SHALL recusar a criação de um novo pedido quando a entidade beneficiária autenticada já possuir 10 ou mais pedidos em aberto, sem criar o pedido. Um pedido conta como **em aberto** quando pertence à entidade, não está excluído logicamente e seu status é "Pendente" ou "Em andamento". Os status "Rejeitado", "Doado" e "Cancelado" são finais e não contam para o limite. Pedidos de outras entidades beneficiárias não contam.

A verificação do limite SHALL ocorrer depois de resolver a entidade beneficiária da sessão e antes de qualquer validação do alimento ou da quantidade, de modo que uma entidade no limite receba a mesma recusa independentemente do conteúdo da requisição.

#### Scenario: Entidade abaixo do limite cria pedido
- **WHEN** uma entidade beneficiária autenticada com 9 pedidos em aberto solicita um pedido válido para um alimento disponível
- **THEN** o sistema cria o pedido normalmente, passando a entidade a ter 10 pedidos em aberto

#### Scenario: Entidade no limite tem o pedido recusado
- **WHEN** uma entidade beneficiária autenticada com 10 pedidos em aberto solicita um novo pedido
- **THEN** o sistema recusa a requisição por conflito de estado, informando que o limite de pedidos em aberto foi atingido, e não cria nenhum pedido

#### Scenario: Entidade acima do limite tem o pedido recusado
- **WHEN** uma entidade beneficiária autenticada com mais de 10 pedidos em aberto solicita um novo pedido
- **THEN** o sistema recusa a requisição da mesma forma e não cria nenhum pedido

#### Scenario: Pedidos pendentes e em andamento somam no limite
- **WHEN** uma entidade beneficiária autenticada possui 6 pedidos "Pendente" e 4 pedidos "Em andamento", e solicita um novo pedido
- **THEN** o sistema considera os 10 pedidos em aberto e recusa a requisição pelo limite, sem criar pedido

#### Scenario: Pedidos excluídos logicamente não contam para o limite
- **WHEN** uma entidade beneficiária autenticada possui 9 pedidos em aberto e outros pedidos marcados como excluídos logicamente, e solicita um pedido válido
- **THEN** o sistema considera apenas os 9 pedidos em aberto, fica abaixo do limite e cria o pedido

#### Scenario: Pedidos rejeitados não contam para o limite
- **WHEN** uma entidade beneficiária autenticada possui 9 pedidos em aberto ("Pendente" ou "Em andamento") e outros pedidos com status "Rejeitado", e solicita um pedido válido
- **THEN** o sistema considera apenas os 9 pedidos em aberto, fica abaixo do limite e cria o pedido

#### Scenario: Pedidos doados não contam para o limite
- **WHEN** uma entidade beneficiária autenticada possui 9 pedidos em aberto ("Pendente" ou "Em andamento") e outros pedidos com status "Doado", e solicita um pedido válido
- **THEN** o sistema considera apenas os 9 pedidos em aberto, fica abaixo do limite e cria o pedido

#### Scenario: Pedidos cancelados não contam para o limite
- **WHEN** uma entidade beneficiária autenticada possui 9 pedidos em aberto ("Pendente" ou "Em andamento") e outros pedidos com status "Cancelado", e solicita um pedido válido
- **THEN** o sistema considera apenas os 9 pedidos em aberto, fica abaixo do limite e cria o pedido

#### Scenario: Limite é isolado por entidade beneficiária
- **WHEN** uma entidade beneficiária autenticada sem pedidos em aberto solicita um pedido válido, enquanto outra entidade possui 10 ou mais pedidos em aberto
- **THEN** o sistema cria o pedido da entidade autenticada, sem considerar os pedidos de outras entidades

#### Scenario: Limite é verificado antes da validação do alimento
- **WHEN** uma entidade beneficiária autenticada com 10 pedidos em aberto solicita um pedido informando um alimento inexistente ou indisponível
- **THEN** o sistema recusa a requisição pelo limite de pedidos em aberto, sem chegar a avaliar o alimento, e não cria nenhum pedido

### Requirement: Um pedido em aberto por entidade e alimento
O sistema SHALL recusar a criação de um novo pedido quando a entidade beneficiária autenticada já possuir um pedido em aberto para o mesmo alimento, sem criar o pedido. Um pedido conta como **em aberto** pelo mesmo critério do limite de pedidos em aberto: pertence à entidade, não está excluído logicamente e seu status é "Pendente" ou "Em andamento". Os status "Rejeitado", "Doado" e "Cancelado" são finais e não bloqueiam um novo pedido. Pedidos de outras entidades beneficiárias para o mesmo alimento, e pedidos da mesma entidade para outros alimentos, não contam. A quantidade solicitada não influencia o bloqueio.

A verificação SHALL ocorrer depois do limite de pedidos em aberto e depois de confirmar que o alimento está disponível, e antes da validação da quantidade.

#### Scenario: Primeiro pedido da entidade para o alimento
- **WHEN** uma entidade beneficiária autenticada sem pedido em aberto para um alimento disponível solicita um pedido válido para ele
- **THEN** o sistema cria o pedido normalmente

#### Scenario: Novo pedido com o anterior pendente
- **WHEN** uma entidade beneficiária autenticada com um pedido "Pendente" para um alimento solicita outro pedido para o mesmo alimento
- **THEN** o sistema recusa a requisição por conflito de estado, informando que já existe um pedido em aberto para o alimento, e não cria nenhum pedido

#### Scenario: Novo pedido com o anterior em andamento
- **WHEN** uma entidade beneficiária autenticada com um pedido "Em andamento" para um alimento solicita outro pedido para o mesmo alimento
- **THEN** o sistema recusa a requisição da mesma forma e não cria nenhum pedido

#### Scenario: Novo pedido depois de o anterior ser rejeitado
- **WHEN** uma entidade beneficiária autenticada cujo único pedido para um alimento está "Rejeitado" solicita um novo pedido válido para o mesmo alimento
- **THEN** o sistema cria o pedido normalmente

#### Scenario: Novo pedido depois de o anterior ser doado
- **WHEN** uma entidade beneficiária autenticada cujo único pedido para um alimento está "Doado" solicita um novo pedido válido para o mesmo alimento disponível
- **THEN** o sistema cria o pedido normalmente

#### Scenario: Novo pedido depois de o anterior ser cancelado
- **WHEN** uma entidade beneficiária autenticada cujo único pedido para um alimento está "Cancelado" solicita um novo pedido válido para o mesmo alimento disponível
- **THEN** o sistema cria o pedido normalmente

#### Scenario: Pedido excluído logicamente não bloqueia
- **WHEN** uma entidade beneficiária autenticada cujo único pedido para um alimento está marcado como excluído logicamente solicita um novo pedido válido para o mesmo alimento
- **THEN** o sistema cria o pedido normalmente

#### Scenario: Outra entidade com pedido em aberto para o mesmo alimento
- **WHEN** uma entidade beneficiária autenticada sem pedido para um alimento solicita um pedido válido para ele, enquanto outra entidade possui um pedido "Pendente" para o mesmo alimento
- **THEN** o sistema cria o pedido da entidade autenticada, sem considerar os pedidos de outras entidades

#### Scenario: Pedido em aberto da mesma entidade para outro alimento
- **WHEN** uma entidade beneficiária autenticada com um pedido "Pendente" para um alimento solicita um pedido válido para um alimento diferente
- **THEN** o sistema cria o pedido normalmente

#### Scenario: Quantidade diferente não evita o bloqueio
- **WHEN** uma entidade beneficiária autenticada com um pedido em aberto para um alimento solicita outro pedido para o mesmo alimento com uma quantidade diferente da do primeiro
- **THEN** o sistema recusa a requisição por já existir um pedido em aberto para o alimento e não cria nenhum pedido

#### Scenario: Alimento que deixou de estar disponível
- **WHEN** uma entidade beneficiária autenticada com um pedido em aberto para um alimento solicita um novo pedido para esse alimento depois de ele ficar vencido, excluído logicamente ou com status diferente de "Ativo"
- **THEN** o sistema responde que o alimento não foi encontrado, sem avaliar a duplicidade, e não cria pedido

#### Scenario: Limite de pedidos em aberto prevalece
- **WHEN** uma entidade beneficiária autenticada com 10 pedidos em aberto, um deles para o alimento solicitado, solicita um novo pedido para esse alimento
- **THEN** o sistema recusa a requisição pelo limite de pedidos em aberto, e não pela duplicidade, e não cria nenhum pedido

#### Scenario: Duplicidade é verificada antes da quantidade
- **WHEN** uma entidade beneficiária autenticada com um pedido em aberto para um alimento solicita outro pedido para o mesmo alimento com quantidade acima da disponível
- **THEN** o sistema recusa a requisição por já existir um pedido em aberto para o alimento, sem chegar a avaliar a quantidade, e não cria nenhum pedido

## MODIFIED Requirements

### Requirement: Recusas por conflito identificam o motivo
O sistema SHALL identificar, no corpo da resposta de conflito (`409`) da criação de pedido, o motivo da recusa por um código estável e legível por máquina, além da mensagem descritiva. O código SHALL ser `ORDERS_IN_PROGRESS_LIMIT_REACHED` quando a recusa se deve ao limite de pedidos em aberto e `DUPLICATE_ORDER_IN_PROGRESS` quando se deve a já existir um pedido em aberto da entidade para o mesmo alimento. Os códigos mantêm os nomes do MVP, mesmo com a troca de terminologia. Cada motivo SHALL ter sempre o seu código, independentemente do texto da mensagem.

#### Scenario: Recusa pelo limite traz o código do limite
- **WHEN** uma entidade beneficiária autenticada com 10 pedidos em aberto solicita um novo pedido
- **THEN** o corpo da resposta de conflito traz o código `ORDERS_IN_PROGRESS_LIMIT_REACHED`

#### Scenario: Recusa por duplicidade traz o código de duplicidade
- **WHEN** uma entidade beneficiária autenticada com um pedido em aberto para um alimento solicita outro pedido para o mesmo alimento
- **THEN** o corpo da resposta de conflito traz o código `DUPLICATE_ORDER_IN_PROGRESS`
