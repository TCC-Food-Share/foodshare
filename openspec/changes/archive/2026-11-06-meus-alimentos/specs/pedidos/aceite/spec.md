## ADDED Requirements

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
