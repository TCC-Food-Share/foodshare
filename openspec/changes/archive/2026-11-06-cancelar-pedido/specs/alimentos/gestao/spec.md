## MODIFIED Requirements

### Requirement: Exclusão lógica de alimento

O sistema SHALL permitir excluir logicamente um alimento em qualquer status, marcando-o como excluído. Os pedidos "Pendente" SHALL virar "Rejeitado" e os "Em andamento" SHALL virar "Cancelado" com o motivo escolhido, obrigatório nesse caso, e com o estabelecimento registrado como quem cancelou (DT33). O motivo SHALL ser um motivo existente que não seja de sistema. A quantidade e o status do alimento SHALL NOT mudar (DT27). O alimento excluído SHALL continuar visível nos pedidos "Doado", "Rejeitado" e "Cancelado".

#### Scenario: Exclusão sem pedidos em aberto

- **WHEN** o estabelecimento exclui um alimento sem pedidos em aberto, sem informar motivo
- **THEN** o alimento fica excluído e deixa de aparecer no feed, no detalhe e em "Meus Alimentos"

#### Scenario: Rejeição automática dos pedidos pendentes ao excluir

- **WHEN** o estabelecimento exclui um alimento com pedidos "Pendente"
- **THEN** todos esses pedidos viram "Rejeitado", sem motivo

#### Scenario: Cancelamento automático dos pedidos em andamento ao excluir

- **WHEN** o estabelecimento exclui um alimento com pedidos "Em andamento", informando um motivo válido
- **THEN** todos esses pedidos viram "Cancelado" com esse motivo e com o estabelecimento registrado como quem cancelou

#### Scenario: Pedido em andamento sem motivo

- **WHEN** o estabelecimento exclui um alimento com pedido "Em andamento" sem informar motivo
- **THEN** o sistema responde `400` com `code: CANCELLATION_REASON_REQUIRED` e nada muda

#### Scenario: Motivo inexistente ou de sistema

- **WHEN** o motivo informado não existe ou é um motivo de sistema, e o alimento tem pedido "Em andamento"
- **THEN** o sistema responde `400` com `code: INVALID_CANCELLATION_REASON` e nada muda

#### Scenario: Exclusão não devolve estoque

- **WHEN** o estabelecimento exclui um alimento "Reservado" com quantidade 0 e pedido "Em andamento" de 5
- **THEN** o pedido vira "Cancelado", e o alimento continua com quantidade 0 e status "Reservado"

#### Scenario: Pedidos históricos continuam mostrando o alimento

- **WHEN** uma das partes abre um pedido "Doado", "Rejeitado" ou "Cancelado" de um alimento excluído
- **THEN** o detalhe do pedido mostra os dados e a imagem do alimento
