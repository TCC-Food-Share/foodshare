## Purpose

Permitir que um usuário autenticado obtenha os dados completos de um único alimento disponível, identificado por id, para decidir sobre um pedido de doação.

## ADDED Requirements

### Requirement: Visualização dos dados completos de um alimento disponível
O sistema SHALL permitir que qualquer usuário autenticado (estabelecimento ou entidade beneficiária) obtenha, por id, os dados completos de um alimento — imagem, nome, categoria, quantidade e unidade, descrição, data de vencimento, status e estabelecimento de origem (identificação e razão social). O alimento SHALL ser retornado apenas quando estiver disponível, aplicando o mesmo recorte da listagem: status "Ativo", não excluído logicamente e não vencido (data de vencimento a partir da data atual).

#### Scenario: Alimento disponível existente
- **WHEN** um usuário autenticado solicita o alimento por um id que corresponde a um alimento disponível
- **THEN** o sistema retorna os dados completos desse alimento

#### Scenario: Requisição sem sessão autenticada
- **WHEN** o detalhe de um alimento é solicitado sem sessão autenticada válida
- **THEN** o sistema nega o acesso e não retorna nenhum dado

#### Scenario: Id sem alimento disponível correspondente
- **WHEN** o id informado não corresponde a nenhum alimento, ou corresponde a um alimento excluído logicamente, vencido ou com status diferente de "Ativo"
- **THEN** o sistema responde que o alimento não foi encontrado, sem revelar se o alimento existe em outro estado

#### Scenario: Id em formato inválido
- **WHEN** o id informado não é um número
- **THEN** o sistema rejeita a requisição informando que o id é inválido, sem consultar nenhum alimento

#### Scenario: Detalhe abrange qualquer estabelecimento
- **WHEN** um usuário autenticado solicita o detalhe de um alimento disponível cadastrado por outro estabelecimento
- **THEN** o sistema retorna os dados completos normalmente, sem recorte por quem cadastrou
