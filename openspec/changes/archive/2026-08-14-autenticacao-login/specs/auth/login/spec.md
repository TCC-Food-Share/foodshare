## Purpose

Permitir que estabelecimentos, entidades beneficiárias e administradores autentiquem na plataforma com e-mail e senha, recebendo uma sessão que os demais recursos protegidos da API usam para identificar quem está fazendo a requisição.

## ADDED Requirements

### Requirement: Login com e-mail e senha
O sistema SHALL permitir que um estabelecimento, entidade beneficiária ou administrador se autentique informando e-mail e senha, emitindo uma sessão válida quando as credenciais estiverem corretas.

#### Scenario: Login com credenciais corretas
- **WHEN** um usuário envia e-mail e senha correspondentes a uma conta cadastrada
- **THEN** o sistema autentica o usuário, emite uma sessão e retorna os dados básicos da conta (papel, nome, e-mail), sem incluir a senha

#### Scenario: Campo obrigatório ausente
- **WHEN** uma requisição de login é enviada sem e-mail ou sem senha
- **THEN** o sistema rejeita a requisição e não emite nenhuma sessão

### Requirement: Credencial de login é a definida no cadastro
O sistema SHALL aceitar, como credencial de login, a mesma senha definida pelo responsável no momento do cadastro (RF01/RF03), sem exigir nenhuma configuração adicional.

#### Scenario: Primeiro login após o cadastro
- **WHEN** um estabelecimento ou entidade beneficiária recém-cadastrado faz login usando o e-mail pessoal e a senha definidos no cadastro
- **THEN** o sistema autentica normalmente, sem exigir nenhuma etapa extra de configuração de credencial

### Requirement: Sessão válida para acessar recursos protegidos
O sistema SHALL aceitar a sessão emitida no login para autorizar requisições a recursos que exigem autenticação, e SHALL negar acesso a esses recursos quando não houver sessão válida.

#### Scenario: Acesso a recurso protegido com sessão válida
- **WHEN** uma requisição a um recurso protegido é enviada com uma sessão válida emitida por um login recente
- **THEN** o sistema identifica o usuário autenticado e processa a requisição normalmente

#### Scenario: Acesso a recurso protegido sem sessão
- **WHEN** uma requisição a um recurso protegido é enviada sem sessão válida
- **THEN** o sistema nega o acesso e não processa a requisição
