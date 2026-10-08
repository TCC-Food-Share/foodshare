# pedidos/status Specification

## Purpose

Definir o conjunto fechado de status de um pedido de doação, quais deles são finais e o que conta como "pedido em aberto", para que todas as regras de pedidos usem os mesmos nomes (DT01, RN01).

## Requirements

### Requirement: Conjunto fechado de status de pedido
O sistema SHALL reconhecer exatamente cinco status de pedido, com estes nomes: "Pendente", "Em andamento", "Rejeitado", "Doado" e "Cancelado". Todo pedido SHALL estar sempre em um desses status. Os nomes "Aceito" e "Recebido", usados no MVP, NÃO são status válidos. Os status SHALL ser criados pela carga inicial do banco, sem depender de cadastro manual.

#### Scenario: Banco recém-criado tem os cinco status
- **WHEN** o banco é criado do zero e a carga inicial é executada
- **THEN** existem os status de pedido "Pendente", "Em andamento", "Rejeitado", "Doado" e "Cancelado", e nenhum outro

#### Scenario: Carga inicial executada duas vezes
- **WHEN** a carga inicial é executada novamente sobre um banco que já tem os cinco status
- **THEN** o conjunto de status de pedido continua o mesmo, sem duplicatas

#### Scenario: Status antigo do MVP é recusado
- **WHEN** um cliente informa "Aceito" ou "Recebido" onde a API espera um status de pedido
- **THEN** o sistema recusa o valor como inválido

### Requirement: Status finais
O sistema SHALL tratar "Rejeitado", "Doado" e "Cancelado" como status finais: um pedido em qualquer um deles NÃO muda mais de status. Toda tentativa de transição a partir de um status final SHALL ser recusada por conflito de estado (`409`), sem alterar o pedido.

#### Scenario: Ação sobre pedido em status final
- **WHEN** uma instituição tenta aceitar, rejeitar ou confirmar o recebimento de um pedido "Rejeitado", "Doado" ou "Cancelado"
- **THEN** o sistema recusa a operação por conflito de estado e o pedido continua no mesmo status

### Requirement: Pedidos em aberto
O sistema SHALL chamar de **pedidos em aberto** os pedidos com status "Pendente" ou "Em andamento". "Em andamento" designa SOMENTE o status do pedido aceito pelo estabelecimento, nunca o conjunto. O limite de pedidos por entidade e o bloqueio de pedido duplicado (RN04, RN05) SHALL considerar os pedidos em aberto.

#### Scenario: Pedido pendente está em aberto
- **WHEN** um pedido está com status "Pendente"
- **THEN** ele conta como pedido em aberto

#### Scenario: Pedido em andamento está em aberto
- **WHEN** um pedido está com status "Em andamento"
- **THEN** ele conta como pedido em aberto

#### Scenario: Pedido em status final não está em aberto
- **WHEN** um pedido está com status "Rejeitado", "Doado" ou "Cancelado"
- **THEN** ele não conta como pedido em aberto
