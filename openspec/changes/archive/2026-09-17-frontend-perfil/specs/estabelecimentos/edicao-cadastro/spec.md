## ADDED Requirements

### Requirement: Leitura dos próprios dados cadastrais do estabelecimento
O sistema SHALL permitir que um estabelecimento autenticado consulte o próprio cadastro completo (dados institucionais, dados do responsável e endereço, sem a senha), determinando qual cadastro retornar exclusivamente a partir da sessão autenticada.

#### Scenario: Consulta do próprio cadastro
- **WHEN** um estabelecimento autenticado solicita os próprios dados cadastrais
- **THEN** o sistema retorna os dados institucionais, os dados do responsável e o endereço vinculados ao cadastro do estabelecimento autenticado, sem incluir a senha

#### Scenario: Requisição sem autenticação
- **WHEN** a leitura do próprio cadastro é solicitada sem sessão autenticada válida
- **THEN** o sistema rejeita a requisição e não retorna nenhum dado

#### Scenario: Sessão sem estabelecimento vinculado
- **WHEN** um usuário autenticado sem estabelecimento vinculado à própria sessão solicita a leitura do próprio cadastro
- **THEN** o sistema informa que não há estabelecimento vinculado à sessão, sem retornar dado de nenhum outro cadastro
