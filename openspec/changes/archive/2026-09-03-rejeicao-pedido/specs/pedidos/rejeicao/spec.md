## Purpose

Permitir que um estabelecimento autenticado rejeite um pedido de doação "Pendente" que recebeu, movendo o pedido para o status terminal "Rejeitado" sem alterar o estoque do alimento vinculado, encerrando o pedido do lado do estabelecimento.

## ADDED Requirements

### Requirement: Rejeição de pedido pendente pelo estabelecimento
O sistema SHALL permitir que um estabelecimento autenticado rejeite um pedido de doação identificado por id, desde que o pedido pertença ao próprio estabelecimento da sessão, não esteja excluído logicamente e esteja com status "Pendente". O vínculo com o estabelecimento SHALL ser resolvido pela sessão, nunca informado pelo cliente. Ao rejeitar, o sistema SHALL mover o pedido para o status "Rejeitado" e retornar os dados atualizados do pedido. O sistema NÃO exige nem aceita um motivo de rejeição.

#### Scenario: Rejeição de pedido pendente do próprio estabelecimento
- **WHEN** um estabelecimento autenticado rejeita um pedido "Pendente" vinculado a ele
- **THEN** o sistema move o pedido para "Rejeitado" e retorna o pedido atualizado

#### Scenario: Requisição sem autenticação
- **WHEN** uma requisição de rejeição é enviada sem sessão autenticada válida
- **THEN** o sistema nega o acesso e não altera nenhum pedido

#### Scenario: Conta autenticada não é estabelecimento
- **WHEN** uma entidade beneficiária autenticada tenta rejeitar um pedido
- **THEN** o sistema responde que não há estabelecimento vinculado e não altera nenhum pedido

#### Scenario: Pedido de outro estabelecimento
- **WHEN** um estabelecimento autenticado tenta rejeitar um pedido vinculado a outro estabelecimento
- **THEN** o sistema responde que o pedido não foi encontrado e não altera nenhum pedido

#### Scenario: Pedido inexistente ou excluído
- **WHEN** um estabelecimento autenticado tenta rejeitar um pedido que não existe ou está excluído logicamente
- **THEN** o sistema responde que o pedido não foi encontrado e não altera nenhum pedido

#### Scenario: Pedido não está pendente
- **WHEN** um estabelecimento autenticado tenta rejeitar um pedido dele que já está "Aceito" ou "Rejeitado"
- **THEN** o sistema recusa a operação por conflito de estado e não altera o pedido

### Requirement: Rejeição não altera o estoque do alimento
O sistema SHALL rejeitar um pedido sem alterar a quantidade do alimento vinculado. Como um pedido "Pendente" nunca teve quantidade reservada (a reserva ocorre apenas no aceite), não há nada a devolver ou descontar na rejeição.

#### Scenario: Quantidade do alimento inalterada após rejeição
- **WHEN** um estabelecimento rejeita um pedido "Pendente" de quantidade Q para um alimento com quantidade atual X
- **THEN** o pedido passa a "Rejeitado" e a quantidade atual do alimento continua X

### Requirement: "Rejeitado" é status terminal
O sistema SHALL tratar "Rejeitado" como um status final: um pedido "Rejeitado" não pode ser aceito, rejeitado novamente, nem retornar a "Pendente". Uma rejeição concorrente com um aceite do mesmo pedido "Pendente" SHALL resultar em apenas uma transição efetivada; a outra requisição SHALL ser recusada por conflito de estado.

#### Scenario: Rejeitar um pedido já rejeitado
- **WHEN** um estabelecimento tenta rejeitar um pedido que já está "Rejeitado"
- **THEN** o sistema recusa a operação por conflito de estado

#### Scenario: Aceite e rejeição concorrentes do mesmo pedido
- **WHEN** uma requisição de aceite e uma de rejeição para o mesmo pedido "Pendente" são processadas concorrentemente
- **THEN** apenas uma delas efetiva a transição de status; a outra é recusada por conflito de estado
