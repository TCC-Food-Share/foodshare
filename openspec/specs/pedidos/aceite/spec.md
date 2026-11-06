# pedidos/aceite Specification

## Purpose

Permitir que um estabelecimento autenticado aceite um pedido de doação "Pendente" que recebeu, reservando a quantidade do alimento vinculado (a quantidade aceita sai do estoque disponível do alimento) e movendo o pedido para o status "Em andamento", habilitando a confirmação de recebimento.

## Requirements

### Requirement: Aceite de pedido pendente pelo estabelecimento
O sistema SHALL permitir que um estabelecimento autenticado aceite um pedido de doação identificado por id, desde que o pedido pertença ao próprio estabelecimento da sessão, não esteja excluído logicamente e esteja com status "Pendente". O vínculo com o estabelecimento SHALL ser resolvido pela sessão, nunca informado pelo cliente. Ao aceitar, o sistema SHALL mover o pedido para o status "Em andamento" e retornar os dados atualizados do pedido.

#### Scenario: Aceite com pedido pendente do próprio estabelecimento
- **WHEN** um estabelecimento autenticado aceita um pedido "Pendente" vinculado a ele, com estoque do alimento suficiente
- **THEN** o sistema move o pedido para "Em andamento" e retorna o pedido atualizado

#### Scenario: Requisição sem autenticação
- **WHEN** uma requisição de aceite é enviada sem sessão autenticada válida
- **THEN** o sistema nega o acesso e não altera nenhum pedido

#### Scenario: Conta autenticada não é estabelecimento
- **WHEN** uma entidade beneficiária autenticada tenta aceitar um pedido
- **THEN** o sistema responde que não há estabelecimento vinculado e não altera nenhum pedido

#### Scenario: Pedido de outro estabelecimento
- **WHEN** um estabelecimento autenticado tenta aceitar um pedido vinculado a outro estabelecimento
- **THEN** o sistema responde que o pedido não foi encontrado e não altera nenhum pedido

#### Scenario: Pedido inexistente ou excluído
- **WHEN** um estabelecimento autenticado tenta aceitar um pedido que não existe ou está excluído logicamente
- **THEN** o sistema responde que o pedido não foi encontrado e não altera nenhum pedido

#### Scenario: Pedido não está pendente
- **WHEN** um estabelecimento autenticado tenta aceitar um pedido dele que está "Em andamento", "Rejeitado", "Doado" ou "Cancelado"
- **THEN** o sistema recusa a operação por conflito de estado e não altera o pedido nem o estoque

### Requirement: Reserva da quantidade do alimento no aceite
O sistema SHALL, ao aceitar um pedido, reservar a quantidade do pedido subtraindo-a da quantidade atual do alimento vinculado, de forma atômica: a reserva SHALL ocorrer somente se a quantidade atual do alimento for maior ou igual à quantidade do pedido. Se a quantidade restante não cobrir o pedido, o sistema SHALL recusar o aceite por conflito de estado, mantendo o pedido "Pendente" e o estoque inalterado. A subtração e a mudança de status SHALL ser consistentes entre si — ou ambas ocorrem, ou nenhuma.

#### Scenario: Estoque suficiente é reservado
- **WHEN** um estabelecimento aceita um pedido de quantidade Q para um alimento com quantidade atual maior ou igual a Q
- **THEN** o sistema subtrai Q da quantidade atual do alimento e move o pedido para "Em andamento"

#### Scenario: Estoque insuficiente após outro aceite
- **WHEN** um estabelecimento aceita um pedido de quantidade Q para um alimento cuja quantidade atual (já reduzida por aceites anteriores) é menor que Q
- **THEN** o sistema recusa o aceite por conflito de estado, o pedido continua "Pendente" e a quantidade do alimento não muda

#### Scenario: Aceite concorrente do mesmo pedido não reserva em dobro
- **WHEN** duas requisições de aceite para o mesmo pedido "Pendente" são processadas concorrentemente
- **THEN** no máximo uma delas move o pedido para "Em andamento" e subtrai a quantidade uma única vez; a outra é recusada por conflito de estado

#### Scenario: Quantidade do alimento passa a refletir o restante
- **WHEN** um pedido é aceito e sua quantidade é reservada
- **THEN** as consultas de listagem e de detalhe do alimento passam a exibir a quantidade restante, e uma nova solicitação de pedido (RF22) é validada contra essa quantidade restante

### Requirement: Aceite exige alimento ainda disponível
O sistema SHALL recusar o aceite quando o alimento vinculado ao pedido não estiver mais disponível — mesmo recorte da listagem (RF20): status "Ativo", não vencido, não excluído logicamente e com quantidade atual maior que zero. Nesse caso o sistema SHALL responder com conflito de estado, sem mover o pedido nem alterar o estoque.

#### Scenario: Alimento vinculado vencido, inativo ou excluído
- **WHEN** um estabelecimento tenta aceitar um pedido "Pendente" cujo alimento vinculado está vencido, com status diferente de "Ativo" ou excluído logicamente
- **THEN** o sistema recusa o aceite por conflito de estado, sem mover o pedido nem alterar o estoque

#### Scenario: Alimento vinculado esgotado por outros aceites
- **WHEN** um estabelecimento tenta aceitar um pedido "Pendente" cujo alimento vinculado teve toda a quantidade reservada por outros pedidos aceitos, ficando com quantidade atual zero
- **THEN** o sistema recusa o aceite por conflito de estado, o pedido continua "Pendente" e a quantidade do alimento não muda

### Requirement: Aceite usa os dados atuais do pedido e do alimento

O sistema SHALL conferir o status e a quantidade do pedido e a disponibilidade do alimento no momento da reserva, sem que uma edição, desativação, exclusão ou outro aceite do mesmo alimento ocorra entre a conferência e a gravação.

#### Scenario: Aceite após a edição da quantidade

- **WHEN** um pedido total de 5 é aceito ao mesmo tempo em que uma edição muda o estoque e o pedido para 4, e a edição termina antes
- **THEN** o aceite reserva 4, e o estoque do alimento fica em 0

#### Scenario: Aceite após a desativação

- **WHEN** um aceite e a desativação do alimento são processados ao mesmo tempo, e a desativação termina antes
- **THEN** o aceite é recusado por conflito de estado, e o pedido continua "Rejeitado"

#### Scenario: Aceites simultâneos de pedidos diferentes

- **WHEN** dois pedidos de 3 do mesmo alimento com estoque 5 são aceitos ao mesmo tempo
- **THEN** só um deles é aceito, o outro é recusado por conflito de estado e o estoque fica em 2, nunca negativo
