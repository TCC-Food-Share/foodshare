## ADDED Requirements

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
