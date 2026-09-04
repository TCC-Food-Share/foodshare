## Purpose

Permitir que uma entidade beneficiária autenticada confirme o recebimento do alimento de um pedido "Aceito" que é dela, movendo o pedido para o status terminal "Recebido" e encerrando-o, sem alterar o estoque do alimento (a quantidade já foi reservada no aceite).

## ADDED Requirements

### Requirement: Confirmação de recebimento pela entidade beneficiária
O sistema SHALL permitir que uma entidade beneficiária autenticada confirme o recebimento do alimento de um pedido identificado por id, desde que o pedido pertença à própria entidade da sessão, não esteja excluído logicamente e esteja com status "Aceito". O vínculo com a entidade SHALL ser resolvido pela sessão, nunca informado pelo cliente. Ao confirmar, o sistema SHALL mover o pedido para o status "Recebido", encerrando-o, e retornar os dados atualizados do pedido.

#### Scenario: Confirmação de recebimento de pedido aceito da própria entidade
- **WHEN** uma entidade beneficiária autenticada confirma o recebimento de um pedido "Aceito" vinculado a ela
- **THEN** o sistema move o pedido para "Recebido" e retorna o pedido atualizado

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

#### Scenario: Pedido não está aceito
- **WHEN** uma entidade beneficiária autenticada tenta confirmar o recebimento de um pedido dela que está "Pendente", "Rejeitado" ou já "Recebido"
- **THEN** o sistema recusa a operação por conflito de estado e não altera o pedido

### Requirement: Confirmação de recebimento não altera o estoque do alimento
O sistema SHALL confirmar o recebimento sem alterar a quantidade do alimento vinculado. A quantidade do pedido já foi subtraída do alimento no aceite (RF16); a confirmação apenas torna esse consumo definitivo.

#### Scenario: Quantidade do alimento inalterada após a confirmação
- **WHEN** uma entidade beneficiária confirma o recebimento de um pedido "Aceito" de quantidade Q para um alimento com quantidade atual X
- **THEN** o pedido passa a "Recebido" e a quantidade atual do alimento continua X

### Requirement: "Recebido" é status terminal
O sistema SHALL tratar "Recebido" como um status final: um pedido "Recebido" não pode ser aceito, rejeitado, recebido novamente, nem retornar a um status anterior. Duas confirmações concorrentes do mesmo pedido "Aceito" SHALL resultar em apenas uma transição efetivada; a outra requisição SHALL ser recusada por conflito de estado.

#### Scenario: Confirmar recebimento de um pedido já recebido
- **WHEN** uma entidade beneficiária tenta confirmar o recebimento de um pedido que já está "Recebido"
- **THEN** o sistema recusa a operação por conflito de estado

#### Scenario: Confirmações concorrentes do mesmo pedido
- **WHEN** duas requisições de confirmação de recebimento para o mesmo pedido "Aceito" são processadas concorrentemente
- **THEN** apenas uma delas efetiva a transição de status; a outra é recusada por conflito de estado
