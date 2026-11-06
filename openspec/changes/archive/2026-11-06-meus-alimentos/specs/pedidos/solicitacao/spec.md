## ADDED Requirements

### Requirement: Pedido registra o tipo total ou parcial

O sistema SHALL registrar em cada pedido criado se ele é do tipo total ou parcial, sem que o cliente informe o tipo. Em alimento "Somente parcial", o pedido SHALL ser sempre parcial. Nos demais, SHALL ser total quando a quantidade pedida for igual à quantidade atual do alimento, e parcial caso contrário.

#### Scenario: Quantidade igual ao estoque

- **WHEN** a entidade pede a quantidade atual inteira de um alimento "Total ou parcial" ou "Somente total"
- **THEN** o pedido é registrado como total

#### Scenario: Quantidade menor que o estoque

- **WHEN** a entidade pede menos que a quantidade atual do alimento
- **THEN** o pedido é registrado como parcial

#### Scenario: Alimento "Somente parcial"

- **WHEN** a entidade pede a quantidade atual inteira de um alimento "Somente parcial"
- **THEN** o pedido é registrado como parcial

### Requirement: Criação de pedido confere o alimento no momento da gravação

O sistema SHALL conferir a disponibilidade e a quantidade do alimento e gravar o pedido sem que uma edição, desativação, exclusão ou aceite do mesmo alimento ocorra entre a conferência e a gravação.

#### Scenario: Criação concorrente com desativação

- **WHEN** a criação de um pedido e a desativação do alimento são processadas ao mesmo tempo
- **THEN** ou o pedido é criado antes e vira "Rejeitado" pela desativação, ou a criação responde que o alimento não foi encontrado; nunca fica um pedido "Pendente" em alimento "Inativo"

#### Scenario: Criação concorrente com edição de quantidade

- **WHEN** a criação de um pedido e uma edição da quantidade do alimento são processadas ao mesmo tempo
- **THEN** o pedido é validado e tem o tipo definido pela quantidade em vigor naquele momento, e a edição considera o pedido se ele for gravado antes
