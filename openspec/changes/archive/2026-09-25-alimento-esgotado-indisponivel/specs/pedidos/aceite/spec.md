## MODIFIED Requirements

### Requirement: Aceite exige alimento ainda disponível
O sistema SHALL recusar o aceite quando o alimento vinculado ao pedido não estiver mais disponível — mesmo recorte da listagem (RF11): status "Ativo", não vencido, não excluído logicamente e com quantidade atual maior que zero. Nesse caso o sistema SHALL responder com conflito de estado, sem mover o pedido nem alterar o estoque.

#### Scenario: Alimento vinculado vencido, inativo ou excluído
- **WHEN** um estabelecimento tenta aceitar um pedido "Pendente" cujo alimento vinculado está vencido, com status diferente de "Ativo" ou excluído logicamente
- **THEN** o sistema recusa o aceite por conflito de estado, sem mover o pedido nem alterar o estoque

#### Scenario: Alimento vinculado esgotado por outros aceites
- **WHEN** um estabelecimento tenta aceitar um pedido "Pendente" cujo alimento vinculado teve toda a quantidade reservada por outros pedidos aceitos, ficando com quantidade atual zero
- **THEN** o sistema recusa o aceite por conflito de estado, o pedido continua "Pendente" e a quantidade do alimento não muda
