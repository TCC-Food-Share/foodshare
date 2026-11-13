## ADDED Requirements

### Requirement: Filtro opcional pela entidade beneficiária

O sistema SHALL aceitar um parâmetro opcional `beneficiaryEntityId` (inteiro a partir de 1) que restringe a listagem
aos pedidos daquela entidade beneficiária. O filtro SHALL ser aplicado **em conjunto** com o recorte da sessão, nunca
no lugar dele: para o estabelecimento, retorna só os pedidos dele com aquela entidade (o histórico do perfil público,
RF12); para a entidade, retorna os próprios pedidos se o id for o dela e uma lista vazia em qualquer outro caso. O
filtro SHALL combinar com o status, a busca, a paginação e a ordenação, e o `total` SHALL refletir todos os critérios.
Pedidos excluídos logicamente continuam fora (RN35). Valor não inteiro ou menor que 1 SHALL ser recusado com `400`.

#### Scenario: Estabelecimento lista os pedidos com uma entidade

- **WHEN** o estabelecimento pede a listagem com `beneficiaryEntityId` de uma entidade que fez 3 pedidos a ele e 2 a
  outro estabelecimento
- **THEN** o sistema retorna só os 3 pedidos feitos a ele, com `total` igual a 3

#### Scenario: Filtro combinado com o status

- **WHEN** o estabelecimento pede a listagem com `beneficiaryEntityId` e `status` igual a "Doado"
- **THEN** o sistema retorna só os pedidos "Doado" entre os dois

#### Scenario: Filtro não amplia o recorte da entidade

- **WHEN** uma entidade pede a listagem com o `beneficiaryEntityId` de outra entidade
- **THEN** o sistema retorna uma lista vazia e `total` igual a 0, sem pedidos da outra entidade

#### Scenario: Pedido excluído logicamente continua fora

- **WHEN** um pedido entre o estabelecimento e a entidade está excluído logicamente
- **THEN** ele não aparece na listagem filtrada

#### Scenario: beneficiaryEntityId inválido

- **WHEN** a listagem é pedida com `beneficiaryEntityId` igual a "abc" ou a 0
- **THEN** o sistema responde `400` e não retorna a listagem
