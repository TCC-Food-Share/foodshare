## ADDED Requirements

### Requirement: Leitura dos próprios dados cadastrais da entidade beneficiária
O sistema SHALL permitir que uma entidade beneficiária autenticada consulte o próprio cadastro completo (dados institucionais, dados do responsável e endereço, sem a senha), determinando qual cadastro retornar exclusivamente a partir da sessão autenticada.

#### Scenario: Consulta do próprio cadastro
- **WHEN** uma entidade beneficiária autenticada solicita os próprios dados cadastrais
- **THEN** o sistema retorna os dados institucionais, os dados do responsável e o endereço vinculados ao cadastro da entidade beneficiária autenticada, sem incluir a senha

#### Scenario: Requisição sem autenticação
- **WHEN** a leitura do próprio cadastro é solicitada sem sessão autenticada válida
- **THEN** o sistema rejeita a requisição e não retorna nenhum dado

#### Scenario: Sessão sem entidade beneficiária vinculada
- **WHEN** um usuário autenticado sem entidade beneficiária vinculada à própria sessão solicita a leitura do próprio cadastro
- **THEN** o sistema informa que não há entidade beneficiária vinculada à sessão, sem retornar dado de nenhum outro cadastro
