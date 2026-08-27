## Purpose

Permitir que um usuário autenticado encerre a própria sessão a qualquer momento, invalidando-a para uso futuro.

## ADDED Requirements

### Requirement: Encerramento de sessão pelo usuário autenticado
O sistema SHALL permitir que um usuário autenticado encerre a sessão atual a qualquer momento, e SHALL invalidar essa sessão de forma que ela não possa mais ser usada para acessar recursos protegidos.

#### Scenario: Logout com sessão válida
- **WHEN** um usuário autenticado solicita o encerramento da própria sessão
- **THEN** o sistema invalida a sessão e retorna confirmação de sucesso

#### Scenario: Sessão encerrada não pode mais ser reutilizada
- **WHEN** uma requisição a um recurso protegido usa uma sessão que já foi encerrada por logout
- **THEN** o sistema nega o acesso, como se não houvesse sessão

### Requirement: Logout exige sessão válida
O sistema SHALL exigir uma sessão autenticada válida para processar uma solicitação de logout, rejeitando a solicitação quando não houver sessão.

#### Scenario: Logout sem sessão ativa
- **WHEN** uma solicitação de logout é enviada sem sessão válida
- **THEN** o sistema rejeita a solicitação, da mesma forma que rejeitaria qualquer outro recurso protegido sem autenticação
