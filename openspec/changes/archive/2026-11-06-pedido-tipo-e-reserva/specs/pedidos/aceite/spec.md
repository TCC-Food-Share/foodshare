## MODIFIED Requirements

### Requirement: Aceite de pedido pendente pelo estabelecimento
O sistema SHALL permitir que um estabelecimento autenticado aceite um pedido de doação identificado por id, desde que o pedido pertença ao próprio estabelecimento da sessão, não esteja excluído logicamente e esteja com status "Pendente". O vínculo com o estabelecimento SHALL ser resolvido pela sessão, nunca informado pelo cliente. Ao aceitar, o sistema SHALL mover o pedido para o status "Em andamento", registrar no pedido a data e a hora do aceite e retornar os dados atualizados do pedido.

#### Scenario: Aceite com pedido pendente do próprio estabelecimento
- **WHEN** um estabelecimento autenticado aceita um pedido "Pendente" vinculado a ele, com estoque do alimento suficiente
- **THEN** o sistema move o pedido para "Em andamento", registra a data e a hora do aceite e retorna o pedido atualizado

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
O sistema SHALL, ao aceitar um pedido, reservar a quantidade do pedido subtraindo-a da quantidade atual do alimento vinculado, de forma atômica: a reserva SHALL ocorrer somente se a quantidade atual do alimento for maior ou igual à quantidade do pedido. Se a quantidade restante não cobrir o pedido, o sistema SHALL recusar o aceite por conflito de estado, mantendo o pedido "Pendente" e o estoque inalterado. Se a quantidade do alimento chegar a zero, o alimento SHALL passar ao status "Reservado", deixando de aceitar novas solicitações. A subtração, a mudança de status do pedido, a do alimento e os ajustes e rejeições automáticas do aceite SHALL ser consistentes entre si: ou todas ocorrem, ou nenhuma.

#### Scenario: Estoque suficiente é reservado
- **WHEN** um estabelecimento aceita um pedido de quantidade Q para um alimento com quantidade atual maior ou igual a Q
- **THEN** o sistema subtrai Q da quantidade atual do alimento e move o pedido para "Em andamento"

#### Scenario: Aceite parcial mantém o alimento "Ativo"
- **WHEN** um estabelecimento aceita um pedido de 3 para um alimento "Ativo" com 5 disponíveis
- **THEN** a quantidade do alimento passa a 2 e o alimento continua "Ativo"

#### Scenario: Aceite que zera o estoque reserva o alimento
- **WHEN** um estabelecimento aceita um pedido de 5 para um alimento "Ativo" com 5 disponíveis
- **THEN** a quantidade do alimento passa a 0 e o alimento passa a "Reservado"

#### Scenario: Alimento "Reservado" não recebe novas solicitações
- **WHEN** uma entidade solicita um pedido para um alimento que ficou "Reservado" depois de um aceite
- **THEN** o sistema responde que o alimento não foi encontrado e não cria pedido

#### Scenario: Estoque insuficiente após outro aceite
- **WHEN** um estabelecimento aceita um pedido "Pendente" de quantidade Q para um alimento cuja quantidade atual é menor que Q, como um pedido antigo que sobrou de antes desta regra
- **THEN** o sistema recusa o aceite por conflito de estado, o pedido continua "Pendente" e a quantidade do alimento não muda

#### Scenario: Aceite concorrente do mesmo pedido não reserva em dobro
- **WHEN** duas requisições de aceite para o mesmo pedido "Pendente" são processadas concorrentemente
- **THEN** no máximo uma delas move o pedido para "Em andamento" e subtrai a quantidade uma única vez; a outra é recusada por conflito de estado

#### Scenario: Quantidade do alimento passa a refletir o restante
- **WHEN** um pedido é aceito e sua quantidade é reservada
- **THEN** as consultas de listagem e de detalhe do alimento passam a exibir a quantidade restante, e uma nova solicitação de pedido (RF22) é validada contra essa quantidade restante

### Requirement: Aceite usa os dados atuais do pedido e do alimento

O sistema SHALL conferir o status e a quantidade do pedido e a disponibilidade do alimento no momento da reserva, sem que uma edição, desativação, exclusão, confirmação de recebimento ou outro aceite do mesmo alimento ocorra entre a conferência e a gravação.

#### Scenario: Aceite após a edição da quantidade

- **WHEN** um pedido total de 5 é aceito ao mesmo tempo em que uma edição muda o estoque e o pedido para 4, e a edição termina antes
- **THEN** o aceite reserva 4, o estoque do alimento fica em 0 e o alimento passa a "Reservado"

#### Scenario: Aceite após a desativação

- **WHEN** um aceite e a desativação do alimento são processados ao mesmo tempo, e a desativação termina antes
- **THEN** o aceite é recusado por conflito de estado, e o pedido continua "Rejeitado"

#### Scenario: Aceites simultâneos de pedidos diferentes

- **WHEN** dois pedidos de 3 do mesmo alimento com estoque 5 são aceitos ao mesmo tempo
- **THEN** só um deles é aceito e o estoque fica em 2, nunca negativo; o outro vira "Rejeitado" pelo primeiro aceite, e a requisição dele é recusada por conflito de estado

#### Scenario: Aceites simultâneos que cabem juntos

- **WHEN** dois pedidos de 2 do mesmo alimento com estoque 5 são aceitos ao mesmo tempo
- **THEN** os dois são aceitos, um depois do outro, e o estoque fica em 1

## ADDED Requirements

### Requirement: Efeito do aceite nos pendentes do alimento

O sistema SHALL, na mesma operação do aceite, aplicar aos outros pedidos "Pendente", não excluídos, do mesmo alimento o efeito da nova quantidade do alimento (RN07, DT31):

- **Nova quantidade maior que zero:**
  - os pedidos do tipo total passam a pedir a nova quantidade e registram a data e a hora da alteração;
  - os pedidos do tipo parcial com quantidade maior que a nova quantidade passam a "Rejeitado";
  - os parciais que ainda cabem continuam "Pendente", sem mudar a quantidade nem o tipo.
- **Nova quantidade igual a zero:** todos os pedidos "Pendente" do alimento passam a "Rejeitado", inclusive os totais.

Pedidos de outros alimentos não são afetados.

#### Scenario: Pendente parcial maior que o novo estoque é rejeitado

- **WHEN** um alimento com 10 disponíveis tem pedidos parciais "Pendente" de 6 (A) e de 5 (B), e o estabelecimento aceita A
- **THEN** o estoque passa a 4, e B vira "Rejeitado" automaticamente

#### Scenario: Pendente parcial que ainda cabe continua pendente

- **WHEN** um alimento com 10 disponíveis tem pedidos parciais "Pendente" de 6 (A) e de 4 (B), e o estabelecimento aceita A
- **THEN** o estoque passa a 4, e B continua "Pendente" com quantidade 4

#### Scenario: Pedido total pendente acompanha o novo estoque

- **WHEN** um alimento "Total ou parcial" com 10 disponíveis tem um pedido total "Pendente" de 10 e um parcial de 3, e o estabelecimento aceita o de 3
- **THEN** o estoque passa a 7, o pedido total continua "Pendente", passa a pedir 7 e registra a data e a hora da alteração

#### Scenario: Aceite que zera o estoque rejeita todos os pendentes

- **WHEN** um alimento "Somente total" com 5 disponíveis tem três pedidos "Pendente" de 5, e o estabelecimento aceita um deles
- **THEN** o alimento passa a "Reservado" com quantidade 0, e os outros dois pedidos viram "Rejeitado" automaticamente

#### Scenario: Pedido total é rejeitado quando o estoque zera

- **WHEN** um alimento "Total ou parcial" com 5 disponíveis tem um pedido parcial "Pendente" de 5, aceito agora, e outro pedido total "Pendente" de 5
- **THEN** o alimento passa a "Reservado" com quantidade 0, e o pedido total vira "Rejeitado" em vez de passar a pedir 0

#### Scenario: Pedidos excluídos e de outros alimentos não mudam

- **WHEN** o estabelecimento aceita um pedido, e há pedidos excluídos logicamente do mesmo alimento e pedidos "Pendente" de outros alimentos
- **THEN** só os pedidos "Pendente" não excluídos do mesmo alimento são ajustados ou rejeitados

### Requirement: Prévia do efeito do aceite

O sistema SHALL oferecer ao estabelecimento dono do pedido uma consulta, sem nenhuma alteração, que informe o efeito de aceitar um pedido "Pendente" naquele momento: quantos outros pedidos "Pendente" do alimento serão rejeitados automaticamente, quantos pedidos totais passarão a pedir a nova quantidade e se o alimento passará a "Reservado". A consulta SHALL aplicar as mesmas recusas do aceite: pedido inexistente, excluído ou de outro estabelecimento responde não encontrado; pedido que não está "Pendente", alimento indisponível ou estoque insuficiente responde conflito de estado.

#### Scenario: Prévia com pendentes que serão rejeitados

- **WHEN** o estabelecimento consulta a prévia do aceite de um pedido de 6, num alimento com 10 disponíveis e outros pedidos "Pendente" de 5, 5 e 4
- **THEN** a resposta informa 2 pedidos a rejeitar, nenhum pedido total a ajustar e que o alimento não passará a "Reservado"

#### Scenario: Prévia com pedido total a ajustar

- **WHEN** o estabelecimento consulta a prévia do aceite de um pedido parcial de 3, num alimento "Total ou parcial" com 10 disponíveis e um pedido total "Pendente" de 10
- **THEN** a resposta informa nenhum pedido a rejeitar, 1 pedido total a ajustar e que o alimento não passará a "Reservado"

#### Scenario: Prévia de aceite que zera o estoque

- **WHEN** o estabelecimento consulta a prévia do aceite de um pedido de 5, num alimento com 5 disponíveis e outro pedido "Pendente" de 2
- **THEN** a resposta informa 1 pedido a rejeitar, nenhum pedido total a ajustar e que o alimento passará a "Reservado"

#### Scenario: Prévia não altera nada

- **WHEN** o estabelecimento consulta a prévia do aceite
- **THEN** nenhum pedido e nenhum alimento mudam

#### Scenario: Prévia de pedido que não está pendente

- **WHEN** o estabelecimento consulta a prévia do aceite de um pedido "Rejeitado"
- **THEN** o sistema responde conflito de estado com o código `ORDER_NOT_PENDING`

#### Scenario: Prévia por quem não é o estabelecimento do pedido

- **WHEN** outro estabelecimento ou uma entidade beneficiária consulta a prévia do aceite de um pedido
- **THEN** o sistema não revela o efeito: responde que o pedido não foi encontrado, ou que não há estabelecimento vinculado à conta

### Requirement: Recusas do aceite identificam o motivo

O sistema SHALL identificar, no corpo das respostas de conflito (`409`) do aceite e da prévia do aceite, o motivo por um código estável, além da mensagem:

- `ORDER_NOT_PENDING`: o pedido não está "Pendente";
- `FOOD_NOT_AVAILABLE`: o alimento não está mais disponível (não "Ativo", vencido, excluído ou com quantidade zero);
- `INSUFFICIENT_FOOD_QUANTITY`: a quantidade atual do alimento é menor que a do pedido.

#### Scenario: Pedido que deixou de estar pendente

- **WHEN** o estabelecimento aceita um pedido que outro aceite acabou de rejeitar automaticamente
- **THEN** a resposta `409` traz o código `ORDER_NOT_PENDING`

#### Scenario: Alimento indisponível

- **WHEN** o estabelecimento aceita um pedido "Pendente" de um alimento vencido
- **THEN** a resposta `409` traz o código `FOOD_NOT_AVAILABLE`

#### Scenario: Estoque insuficiente

- **WHEN** o estabelecimento aceita um pedido "Pendente" de 5 de um alimento "Ativo" com 3 disponíveis
- **THEN** a resposta `409` traz o código `INSUFFICIENT_FOOD_QUANTITY`

### Requirement: Diálogo de aceite mostra o efeito

O diálogo de confirmação do aceite, no detalhe do pedido, SHALL mostrar, antes da confirmação, a quantidade reservada, o estoque antes e depois e o efeito da prévia do aceite. Se houver pedidos pendentes a rejeitar, diz quantos ("3 pedidos pendentes deste alimento serão rejeitados"). Se houver pedidos totais a ajustar, diz quantos e a nova quantidade ("1 pedido total pendente passará a pedir 7 un"). Se o estoque for zerar, diz que o alimento ficará "Reservado". Enquanto a prévia carrega, o botão de confirmar SHALL ficar desabilitado. Se a prévia falhar, o diálogo SHALL avisar e não permitir a confirmação.

#### Scenario: Aceite com pendentes a rejeitar

- **WHEN** o estabelecimento abre o diálogo de aceite de um pedido cuja prévia informa 3 pedidos a rejeitar
- **THEN** o diálogo diz que 3 pedidos pendentes deste alimento serão rejeitados

#### Scenario: Aceite com pedidos totais a ajustar

- **WHEN** o estabelecimento abre o diálogo de aceite de um pedido de 3, num alimento com 10 un, cuja prévia informa 1 pedido total a ajustar
- **THEN** o diálogo diz que 1 pedido total pendente passará a pedir 7 un

#### Scenario: Aceite que reserva o alimento

- **WHEN** o estabelecimento abre o diálogo de aceite de um pedido que zera o estoque
- **THEN** o diálogo diz que o alimento ficará "Reservado"

#### Scenario: Aceite sem efeito colateral

- **WHEN** o estabelecimento abre o diálogo de aceite de um pedido cuja prévia informa 0 pedidos a rejeitar, 0 pedidos totais a ajustar e o alimento sem passar a "Reservado"
- **THEN** o diálogo mostra só a reserva e o estoque antes e depois

#### Scenario: Pedido mudou antes de abrir o diálogo

- **WHEN** a prévia responde conflito de estado porque o pedido já não está "Pendente"
- **THEN** o diálogo avisa que o pedido foi atualizado, não permite confirmar e a tela recarrega o pedido
