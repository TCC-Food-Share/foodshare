## Purpose

Definir como o estabelecimento edita, desativa, reativa e exclui logicamente os próprios alimentos, e o efeito de cada ação sobre o alimento e os pedidos vinculados.

## ADDED Requirements

### Requirement: Ações restritas ao dono e a alimento não excluído

O sistema SHALL permitir editar, desativar, reativar e excluir apenas ao estabelecimento autenticado dono do alimento, resolvido pela sessão. Alimento inexistente, de outro estabelecimento ou excluído logicamente SHALL resultar em resposta de não encontrado, sem nenhuma alteração. Cada ação e todas as suas consequências SHALL ocorrer juntas, ou nenhuma delas.

#### Scenario: Alimento de outro estabelecimento

- **WHEN** um estabelecimento tenta editar, desativar, reativar ou excluir um alimento de outro estabelecimento
- **THEN** o sistema responde que o alimento não foi encontrado e nada muda

#### Scenario: Alimento excluído não pode ser editado nem reativado

- **WHEN** um estabelecimento tenta editar, desativar, reativar ou excluir de novo um alimento que já excluiu logicamente
- **THEN** o sistema responde que o alimento não foi encontrado e nada muda

#### Scenario: Conta autenticada não é estabelecimento

- **WHEN** uma entidade beneficiária autenticada tenta uma dessas ações
- **THEN** o sistema recusa o acesso com `403` e `code: ROLE_NOT_ALLOWED`

### Requirement: Edição de validade e quantidade

O sistema SHALL permitir editar apenas a data de vencimento e a quantidade, informando ao menos uma delas, de alimento com status "Ativo" sem pedido "Em andamento". Quantidade SHALL seguir as regras do cadastro: maior que zero, fracionada só em unidade que aceita fração e, em "Somente parcial", suficiente para um pedido parcial (DT21). Data de vencimento informada SHALL ser a data atual ou futura (DT26). Os demais campos, inclusive o tipo de solicitação, SHALL NOT ser editáveis.

#### Scenario: Status diferente de "Ativo"

- **WHEN** o estabelecimento tenta editar um alimento "Reservado" ou "Inativo"
- **THEN** o sistema responde `409` com `code: FOOD_NOT_ACTIVE` e nada muda

#### Scenario: Alimento com pedido em andamento

- **WHEN** o estabelecimento tenta editar um alimento "Ativo" com pedido "Em andamento"
- **THEN** o sistema responde `409` com `code: FOOD_HAS_ORDERS_IN_PROGRESS` e nada muda

#### Scenario: Nenhum campo informado

- **WHEN** a edição não informa data de vencimento nem quantidade
- **THEN** o sistema responde `400` e nada muda

#### Scenario: Campo não editável enviado

- **WHEN** a edição inclui outro campo, como tipo de solicitação ou descrição
- **THEN** o sistema recusa a requisição como dado inválido e nada muda

#### Scenario: Data de vencimento no passado

- **WHEN** a edição informa uma data de vencimento anterior à data atual
- **THEN** o sistema responde `400` com `code: EXPIRATION_DATE_IN_PAST` e nada muda

#### Scenario: Quantidade zero

- **WHEN** a edição informa quantidade igual a zero ou negativa
- **THEN** o sistema responde `400` e nada muda

#### Scenario: Quantidade fracionada em unidade sem fração

- **WHEN** a edição informa quantidade fracionada em unidade que não aceita fração
- **THEN** o sistema responde `400` com `code: FRACTION_NOT_ALLOWED` e nada muda

#### Scenario: Quantidade baixa demais em "Somente parcial"

- **WHEN** a edição de um alimento "Somente parcial" informa quantidade que não permite pedido parcial
- **THEN** o sistema responde `400` com `code: PARTIAL_ONLY_QUANTITY_TOO_LOW` e nada muda

#### Scenario: Edição só da validade

- **WHEN** o estabelecimento altera só a data de vencimento de um alimento com pedidos "Pendente"
- **THEN** a data muda e os pedidos continuam como estavam, sem registro de alteração de quantidade

### Requirement: Efeito da nova quantidade nos pedidos pendentes

Ao alterar a quantidade, o sistema SHALL atualizar os pedidos "Pendente" do alimento: os do tipo total passam a pedir a nova quantidade e registram a data da alteração; os do tipo parcial com quantidade maior que a nova viram "Rejeitado"; os do tipo parcial que ainda cabem não mudam.

#### Scenario: Pedido total acompanha o aumento do estoque

- **WHEN** o estoque muda de 5 para 6 e há um pedido "Pendente" do tipo total de 5
- **THEN** o pedido passa a pedir 6, continua "Pendente" e registra a data da alteração

#### Scenario: Pedido total acompanha a redução do estoque

- **WHEN** o estoque muda de 5 para 4 e há um pedido "Pendente" do tipo total de 5
- **THEN** o pedido passa a pedir 4, continua "Pendente" e registra a data da alteração

#### Scenario: Rejeição automática de pedido parcial que não cabe

- **WHEN** o estoque muda de 5 para 4 e há um pedido "Pendente" do tipo parcial de 5
- **THEN** o pedido vira "Rejeitado"

#### Scenario: Pedido parcial que cabe não muda

- **WHEN** o estoque muda de 5 para 4 e há um pedido "Pendente" do tipo parcial de 3
- **THEN** o pedido continua "Pendente" com quantidade 3, sem registro de alteração

#### Scenario: Pedido parcial igual ao novo estoque não muda

- **WHEN** o estoque muda de 5 para 3 e há um pedido "Pendente" do tipo parcial de 3
- **THEN** o pedido continua "Pendente" com quantidade 3

#### Scenario: Mesma quantidade não produz efeito

- **WHEN** a edição informa a quantidade que o alimento já tem
- **THEN** nenhum pedido muda e nenhuma data de alteração é registrada

#### Scenario: Pedidos em status finais não mudam

- **WHEN** a quantidade muda e o alimento tem pedidos "Rejeitado", "Doado" ou "Cancelado"
- **THEN** esses pedidos não mudam

#### Scenario: Edição concorrente com aceite

- **WHEN** uma edição de quantidade e um aceite de pedido do mesmo alimento são processados ao mesmo tempo
- **THEN** uma das duas operações termina primeiro e a outra considera o resultado dela: o estoque nunca fica negativo, e a edição é recusada com `code: FOOD_HAS_ORDERS_IN_PROGRESS` se o aceite terminar antes

### Requirement: Prévia do efeito da nova quantidade

O sistema SHALL informar ao estabelecimento dono, sem alterar nada, quantos pedidos totais seriam atualizados e quantos pedidos parciais seriam rejeitados para uma quantidade informada.

#### Scenario: Prévia com pedidos afetados

- **WHEN** o estoque é 5, há um pedido "Pendente" total de 5 e dois parciais de 5 e de 3, e a prévia é pedida para a quantidade 4
- **THEN** o sistema informa 1 pedido total a atualizar e 1 pedido parcial a rejeitar, e nenhum pedido muda

#### Scenario: Prévia com a quantidade atual

- **WHEN** a prévia é pedida para a quantidade que o alimento já tem
- **THEN** o sistema informa zero nos dois casos

#### Scenario: Prévia de alimento alheio

- **WHEN** um estabelecimento pede a prévia de um alimento de outro estabelecimento
- **THEN** o sistema responde que o alimento não foi encontrado

### Requirement: Desativação de alimento

O sistema SHALL permitir desativar um alimento "Ativo" sem pedido "Em andamento", mudando o status para "Inativo" e os pedidos "Pendente" dele para "Rejeitado", sem motivo.

#### Scenario: Desativação muda o status

- **WHEN** o estabelecimento desativa um alimento "Ativo" sem pedidos
- **THEN** o alimento fica "Inativo" e deixa de aparecer no feed

#### Scenario: Rejeição automática dos pedidos pendentes ao desativar

- **WHEN** o estabelecimento desativa um alimento "Ativo" com pedidos "Pendente"
- **THEN** todos esses pedidos viram "Rejeitado", sem motivo

#### Scenario: Desativar com pedido em andamento

- **WHEN** o estabelecimento tenta desativar um alimento com pedido "Em andamento"
- **THEN** o sistema responde `409` com `code: FOOD_HAS_ORDERS_IN_PROGRESS` e nada muda

#### Scenario: Desativar alimento que não está "Ativo"

- **WHEN** o estabelecimento tenta desativar um alimento "Reservado" ou "Inativo"
- **THEN** o sistema responde `409` com `code: FOOD_NOT_ACTIVE` e nada muda

### Requirement: Reativação de alimento

O sistema SHALL permitir reativar um alimento "Inativo", exigindo nova data de vencimento e nova quantidade, com as mesmas validações da edição. O alimento SHALL voltar a "Ativo", e a data de publicação SHALL continuar a do cadastro.

#### Scenario: Reativação com dados válidos

- **WHEN** o estabelecimento reativa um alimento "Inativo" com data futura e quantidade válida
- **THEN** o alimento fica "Ativo" com os novos valores, mantém a data de publicação e volta a aparecer no feed

#### Scenario: Reativar sem validade ou sem quantidade

- **WHEN** a reativação não informa a data de vencimento ou a quantidade
- **THEN** o sistema recusa a requisição como dado inválido e o alimento continua "Inativo"

#### Scenario: Reativar com data no passado

- **WHEN** a reativação informa uma data de vencimento anterior à data atual
- **THEN** o sistema responde `400` com `code: EXPIRATION_DATE_IN_PAST` e o alimento continua "Inativo"

#### Scenario: Reativar alimento que não está "Inativo"

- **WHEN** o estabelecimento tenta reativar um alimento "Ativo" ou "Reservado"
- **THEN** o sistema responde `409` com `code: FOOD_NOT_INACTIVE` e nada muda

### Requirement: Exclusão lógica de alimento

O sistema SHALL permitir excluir logicamente um alimento em qualquer status, marcando-o como excluído. Os pedidos "Pendente" SHALL virar "Rejeitado" e os "Em andamento" SHALL virar "Cancelado" com o motivo escolhido, obrigatório nesse caso. O motivo SHALL ser um motivo existente que não seja de sistema. A quantidade e o status do alimento SHALL NOT mudar (DT27). O alimento excluído SHALL continuar visível nos pedidos "Doado", "Rejeitado" e "Cancelado".

#### Scenario: Exclusão sem pedidos em aberto

- **WHEN** o estabelecimento exclui um alimento sem pedidos em aberto, sem informar motivo
- **THEN** o alimento fica excluído e deixa de aparecer no feed, no detalhe e em "Meus Alimentos"

#### Scenario: Rejeição automática dos pedidos pendentes ao excluir

- **WHEN** o estabelecimento exclui um alimento com pedidos "Pendente"
- **THEN** todos esses pedidos viram "Rejeitado", sem motivo

#### Scenario: Cancelamento automático dos pedidos em andamento ao excluir

- **WHEN** o estabelecimento exclui um alimento com pedidos "Em andamento", informando um motivo válido
- **THEN** todos esses pedidos viram "Cancelado" com esse motivo

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
