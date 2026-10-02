## REMOVED Requirements

### Requirement: Confirmação de recebimento pela entidade beneficiária
**Reason**: Os status "Aceito" e "Recebido" deixam de existir (DT01); o nome e os cenários do requisito citavam esses status.
**Migration**: Substituído por "Confirmação de recebimento de pedido em andamento pela entidade beneficiária", com o mesmo comportamento sobre os status "Em andamento" e "Doado". A rota não muda.

### Requirement: "Recebido" é status terminal
**Reason**: O status "Recebido" foi renomeado para "Doado" (DT01).
**Migration**: Substituído por '"Doado" é status terminal', com o mesmo comportamento.

## ADDED Requirements

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

### Requirement: "Doado" é status terminal
O sistema SHALL tratar "Doado" como um status final: um pedido "Doado" não pode ser aceito, rejeitado, confirmado novamente, nem retornar a um status anterior. Duas confirmações concorrentes do mesmo pedido "Em andamento" SHALL resultar em apenas uma transição efetivada; a outra requisição SHALL ser recusada por conflito de estado.

#### Scenario: Confirmar recebimento de um pedido já doado
- **WHEN** uma entidade beneficiária tenta confirmar o recebimento de um pedido que já está "Doado"
- **THEN** o sistema recusa a operação por conflito de estado

#### Scenario: Confirmações concorrentes do mesmo pedido
- **WHEN** duas requisições de confirmação de recebimento para o mesmo pedido "Em andamento" são processadas concorrentemente
- **THEN** apenas uma delas efetiva a transição de status; a outra é recusada por conflito de estado

## MODIFIED Requirements

### Requirement: Confirmação de recebimento não altera o estoque do alimento
O sistema SHALL confirmar o recebimento sem alterar a quantidade do alimento vinculado. A quantidade do pedido já foi subtraída do alimento no aceite (RF23); a confirmação apenas torna esse consumo definitivo.

#### Scenario: Quantidade do alimento inalterada após a confirmação
- **WHEN** uma entidade beneficiária confirma o recebimento de um pedido "Em andamento" de quantidade Q para um alimento com quantidade atual X
- **THEN** o pedido passa a "Doado" e a quantidade atual do alimento continua X
