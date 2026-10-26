# alimentos/detalhe Specification

## Purpose

Permitir que um usuário autenticado obtenha os dados completos de um único alimento disponível, identificado por id, para decidir sobre um pedido de doação.

## Requirements

### Requirement: Visualização dos dados completos de um alimento disponível

O sistema SHALL permitir que qualquer usuário autenticado (estabelecimento ou entidade beneficiária) obtenha, por id, os dados completos de um alimento — imagem (URL da rota de leitura), nome e categoria (do item do catálogo), quantidade, unidade de medida, tipo de solicitação aceita, descrição, observações, status, data de vencimento, data de publicação e estabelecimento de origem (identificação, razão social, nome fantasia, cidade e UF). O alimento SHALL ser retornado apenas quando estiver disponível, aplicando o mesmo recorte da listagem: status "Ativo", não excluído logicamente, não vencido (data de vencimento a partir da data atual), com quantidade atual maior que zero e de estabelecimento não excluído.

#### Scenario: Alimento disponível existente

- **WHEN** um usuário autenticado solicita o alimento por um id que corresponde a um alimento disponível
- **THEN** o sistema retorna os dados completos desse alimento, incluindo o tipo de solicitação, as observações (ou `null`), a unidade de medida e a data de publicação

#### Scenario: Estabelecimento de origem inclui cidade e UF

- **WHEN** um usuário autenticado solicita o detalhe de um alimento disponível
- **THEN** o sistema retorna, junto da identificação, da razão social e do nome fantasia do estabelecimento de origem, a cidade e a UF do endereço desse estabelecimento

#### Scenario: Requisição sem sessão autenticada

- **WHEN** o detalhe de um alimento é solicitado sem sessão autenticada válida
- **THEN** o sistema nega o acesso e não retorna nenhum dado

#### Scenario: Id sem alimento disponível correspondente

- **WHEN** o id informado não corresponde a nenhum alimento, ou corresponde a um alimento excluído logicamente, vencido, com status diferente de "Ativo", com quantidade atual igual a zero ou de estabelecimento excluído
- **THEN** o sistema responde que o alimento não foi encontrado, sem revelar se o alimento existe em outro estado

#### Scenario: Alimento esgotado deixa de ter detalhe

- **WHEN** um alimento tinha detalhe disponível e os pedidos aceitos reservam toda a sua quantidade, deixando a quantidade atual em zero
- **THEN** o detalhe desse alimento passa a responder que o alimento não foi encontrado

#### Scenario: Id em formato inválido

- **WHEN** o id informado não é um número
- **THEN** o sistema rejeita a requisição informando que o id é inválido, sem consultar nenhum alimento

#### Scenario: Detalhe abrange qualquer estabelecimento

- **WHEN** um usuário autenticado solicita o detalhe de um alimento disponível cadastrado por outro estabelecimento
- **THEN** o sistema retorna os dados completos normalmente, sem recorte por quem cadastrou
