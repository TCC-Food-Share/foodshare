# pedidos/recebimento Specification

## Purpose

Permitir que uma entidade beneficiária autenticada confirme o recebimento do alimento de um pedido "Em andamento" que é dela, movendo o pedido para o status terminal "Doado" e encerrando-o, sem alterar o estoque do alimento (a quantidade já foi reservada no aceite).

## Requirements

### Requirement: Confirmação de recebimento de pedido em andamento pela entidade beneficiária
O sistema SHALL permitir que uma entidade beneficiária autenticada confirme o recebimento do alimento de um pedido identificado por id, desde que o pedido pertença à própria entidade da sessão, não esteja excluído logicamente e esteja com status "Em andamento". O vínculo com a entidade SHALL ser resolvido pela sessão, nunca informado pelo cliente. Ao confirmar, o sistema SHALL mover o pedido para o status "Doado", encerrando-o, e retornar os dados atualizados do pedido.

#### Scenario: Confirmação de recebimento de pedido em andamento da própria entidade
- **WHEN** uma entidade beneficiária autenticada confirma o recebimento de um pedido "Em andamento" vinculado a ela
- **THEN** o sistema move o pedido para "Doado" e retorna o pedido atualizado

#### Scenario: Requisição sem autenticação
- **WHEN** uma requisição de confirmação de recebimento é enviada sem sessão autenticada válida
- **THEN** o sistema nega o acesso e não altera nenhum pedido

#### Scenario: Conta autenticada não é entidade beneficiária
- **WHEN** um estabelecimento autenticado tenta confirmar o recebimento de um pedido
- **THEN** o sistema responde que não há entidade beneficiária vinculada e não altera nenhum pedido

#### Scenario: Pedido de outra entidade beneficiária
- **WHEN** uma entidade beneficiária autenticada tenta confirmar o recebimento de um pedido vinculado a outra entidade
- **THEN** o sistema responde que o pedido não foi encontrado e não altera nenhum pedido

#### Scenario: Pedido inexistente ou excluído
- **WHEN** uma entidade beneficiária autenticada tenta confirmar o recebimento de um pedido que não existe ou está excluído logicamente
- **THEN** o sistema responde que o pedido não foi encontrado e não altera nenhum pedido

#### Scenario: Pedido não está em andamento
- **WHEN** uma entidade beneficiária autenticada tenta confirmar o recebimento de um pedido dela que está "Pendente", "Rejeitado", "Cancelado" ou já "Doado"
- **THEN** o sistema recusa a operação por conflito de estado e não altera o pedido

### Requirement: Confirmação de recebimento não altera o estoque do alimento
O sistema SHALL confirmar o recebimento sem alterar a quantidade do alimento vinculado. A quantidade do pedido já foi subtraída do alimento no aceite (RF23); a confirmação apenas torna esse consumo definitivo.

#### Scenario: Quantidade do alimento inalterada após a confirmação
- **WHEN** uma entidade beneficiária confirma o recebimento de um pedido "Em andamento" de quantidade Q para um alimento com quantidade atual X
- **THEN** o pedido passa a "Doado" e a quantidade atual do alimento continua X

### Requirement: "Doado" é status terminal
O sistema SHALL tratar "Doado" como um status final: um pedido "Doado" não pode ser aceito, rejeitado, confirmado novamente, nem retornar a um status anterior. Duas confirmações concorrentes do mesmo pedido "Em andamento" SHALL resultar em apenas uma transição efetivada; a outra requisição SHALL ser recusada por conflito de estado.

#### Scenario: Confirmar recebimento de um pedido já doado
- **WHEN** uma entidade beneficiária tenta confirmar o recebimento de um pedido que já está "Doado"
- **THEN** o sistema recusa a operação por conflito de estado

#### Scenario: Confirmações concorrentes do mesmo pedido
- **WHEN** duas requisições de confirmação de recebimento para o mesmo pedido "Em andamento" são processadas concorrentemente
- **THEN** apenas uma delas efetiva a transição de status; a outra é recusada por conflito de estado
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
