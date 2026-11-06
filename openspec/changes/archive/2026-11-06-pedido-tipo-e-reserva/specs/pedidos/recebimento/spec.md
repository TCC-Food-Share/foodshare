## ADDED Requirements

### Requirement: Encerramento do alimento após a última confirmação

O sistema SHALL, na mesma operação da confirmação de recebimento, verificar o alimento do pedido: se a quantidade atual é zero, se o alimento não está excluído logicamente e se não resta outro pedido "Em andamento", não excluído, desse alimento. Quando essas três condições valem, o alimento SHALL passar ao status "Inativo", e todos os pedidos "Pendente", não excluídos, desse alimento SHALL passar a "Rejeitado" (RN08). Se alguma delas não vale, o alimento e os outros pedidos não mudam.

#### Scenario: Última confirmação com estoque zerado

- **WHEN** a entidade confirma o recebimento do único pedido "Em andamento" de um alimento "Reservado" com quantidade 0
- **THEN** o pedido vira "Doado" e o alimento passa a "Inativo"

#### Scenario: Pendentes restantes são rejeitados na última confirmação

- **WHEN** a entidade confirma o último pedido "Em andamento" de um alimento com quantidade 0 que ainda tem um pedido "Pendente", como um pedido antigo de antes desta regra
- **THEN** o pedido confirmado vira "Doado", o alimento passa a "Inativo" e o pedido "Pendente" vira "Rejeitado" automaticamente

#### Scenario: Ainda há outro pedido em andamento

- **WHEN** a entidade confirma o recebimento de um pedido de um alimento com quantidade 0 que tem outro pedido "Em andamento"
- **THEN** o pedido vira "Doado", e o alimento continua "Reservado"

#### Scenario: Ainda há estoque

- **WHEN** a entidade confirma o recebimento de um pedido de um alimento "Ativo" com quantidade 2
- **THEN** o pedido vira "Doado", o alimento continua "Ativo" com quantidade 2, e os pedidos "Pendente" dele continuam "Pendente"

#### Scenario: Confirmações simultâneas dos dois últimos pedidos

- **WHEN** um alimento com quantidade 0 tem dois pedidos "Em andamento", e as duas entidades confirmam o recebimento ao mesmo tempo
- **THEN** os dois pedidos viram "Doado", e o alimento termina "Inativo", sem ficar preso em "Reservado"

### Requirement: Recusa da confirmação identifica o motivo

O sistema SHALL identificar, no corpo da resposta de conflito (`409`) da confirmação de recebimento, o motivo pelo código `ORDER_NOT_IN_PROGRESS` quando o pedido não está "Em andamento", além da mensagem.

#### Scenario: Confirmação de pedido já doado

- **WHEN** a entidade confirma o recebimento de um pedido que já está "Doado"
- **THEN** a resposta `409` traz o código `ORDER_NOT_IN_PROGRESS`

#### Scenario: Confirmação de pedido pendente

- **WHEN** a entidade confirma o recebimento de um pedido "Pendente"
- **THEN** a resposta `409` traz o código `ORDER_NOT_IN_PROGRESS`
