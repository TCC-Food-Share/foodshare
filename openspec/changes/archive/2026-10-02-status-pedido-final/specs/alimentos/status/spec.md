## Purpose

Definir o conjunto fechado de status de um alimento, para que cadastro, listagem, reserva e as ações do estabelecimento usem os mesmos nomes (DT02). A exclusão lógica não é status: é o campo de exclusão do alimento.

## ADDED Requirements

### Requirement: Conjunto fechado de status de alimento
O sistema SHALL reconhecer exatamente três status de alimento, com estes nomes: "Ativo", "Reservado" e "Inativo". Os status SHALL ser criados pela carga inicial do banco, sem depender de cadastro manual. NÃO existe status "Revisar" nem qualquer status de aprovação manual. A exclusão lógica de um alimento NÃO é um status.

#### Scenario: Banco recém-criado tem os três status
- **WHEN** o banco é criado do zero e a carga inicial é executada
- **THEN** existem os status de alimento "Ativo", "Reservado" e "Inativo", e nenhum outro

#### Scenario: Carga inicial executada duas vezes
- **WHEN** a carga inicial é executada novamente sobre um banco que já tem os três status
- **THEN** o conjunto de status de alimento continua o mesmo, sem duplicatas

#### Scenario: Alimento novo continua nascendo "Ativo"
- **WHEN** um estabelecimento cadastra um alimento
- **THEN** o alimento é criado com status "Ativo", como antes desta mudança
