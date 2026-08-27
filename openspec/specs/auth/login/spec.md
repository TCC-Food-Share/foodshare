# auth/login Specification

## Purpose

Permitir que estabelecimentos, entidades beneficiárias e administradores autentiquem na plataforma com e-mail e senha, recebendo uma sessão que os demais recursos protegidos da API usam para identificar quem está fazendo a requisição.

## Requirements

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

### Requirement: Rejeição de credenciais inválidas
O sistema SHALL rejeitar uma tentativa de login quando o e-mail informado não corresponder a nenhuma conta cadastrada, ou quando a senha informada não corresponder à conta do e-mail informado, retornando em ambos os casos a mesma mensagem de erro genérica (sem indicar qual dos dois campos está incorreto), sem emitir nenhuma sessão.

#### Scenario: E-mail não cadastrado
- **WHEN** um login é tentado com um e-mail que não corresponde a nenhuma conta
- **THEN** o sistema rejeita o login com uma mensagem de erro genérica e não emite sessão

#### Scenario: Senha incorreta para e-mail existente
- **WHEN** um login é tentado com um e-mail cadastrado mas senha que não corresponde à conta
- **THEN** o sistema rejeita o login com a mesma mensagem de erro genérica usada para e-mail não cadastrado, e não emite sessão

### Requirement: Bloqueio de login de conta excluída logicamente
O sistema SHALL rejeitar uma tentativa de login para uma conta com exclusão lógica (`deleted = true`), mesmo quando e-mail e senha informados estiverem corretos, sem emitir nenhuma sessão.

#### Scenario: Credenciais corretas de conta excluída logicamente
- **WHEN** um login é tentado com e-mail e senha corretos de uma conta marcada como excluída logicamente
- **THEN** o sistema rejeita o login e não emite sessão

### Requirement: Sessão válida para acessar recursos protegidos
O sistema SHALL aceitar a sessão emitida no login para autorizar requisições a recursos que exigem autenticação, e SHALL negar acesso a esses recursos quando não houver sessão válida.

#### Scenario: Acesso a recurso protegido com sessão válida
- **WHEN** uma requisição a um recurso protegido é enviada com uma sessão válida emitida por um login recente
- **THEN** o sistema identifica o usuário autenticado e processa a requisição normalmente

#### Scenario: Acesso a recurso protegido sem sessão
- **WHEN** uma requisição a um recurso protegido é enviada sem sessão válida
- **THEN** o sistema nega o acesso e não processa a requisição
