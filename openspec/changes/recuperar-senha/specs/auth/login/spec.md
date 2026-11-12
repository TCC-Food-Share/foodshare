## MODIFIED Requirements

### Requirement: Credencial de login é a definida no cadastro
O sistema SHALL aceitar, como credencial de login, a mesma senha definida pelo responsável no momento do cadastro (RF01/RF02), ou a nova senha definida pela recuperação de senha (RF08), desde que o e-mail pessoal da conta esteja confirmado (RF75). Nenhuma outra configuração de credencial SHALL ser exigida.

#### Scenario: Primeiro login após o cadastro
- **WHEN** um estabelecimento ou entidade beneficiária recém-cadastrado confirma o e-mail e faz login usando o e-mail pessoal e a senha definidos no cadastro
- **THEN** o sistema autentica normalmente, sem exigir nenhuma etapa extra de configuração de credencial

#### Scenario: Login com a senha redefinida
- **WHEN** a pessoa redefine a senha pelo código de recuperação e faz login com a nova senha
- **THEN** o sistema autentica normalmente, e a senha anterior deixa de ser aceita

## ADDED Requirements

### Requirement: Bloqueio de login de conta não confirmada
O sistema SHALL rejeitar o login de uma conta cujo e-mail pessoal ainda não foi confirmado, mesmo com e-mail e senha corretos, sem emitir sessão, respondendo `403` com o código `EMAIL_NOT_VERIFIED` (RN47). Com a senha errada, a resposta SHALL ser a mesma mensagem genérica de credenciais inválidas, sem revelar se a conta está confirmada. A rejeição SHALL NOT enviar e-mail; o código é pedido pela tela de confirmação. Conta excluída logicamente continua recusada pela regra de bloqueio de conta excluída, antes desta.

#### Scenario: Credenciais corretas de conta não confirmada
- **WHEN** um login é tentado com e-mail e senha corretos de uma conta com e-mail não confirmado
- **THEN** o sistema responde `403` com `EMAIL_NOT_VERIFIED`, não emite sessão e não envia e-mail

#### Scenario: Senha errada de conta não confirmada
- **WHEN** um login é tentado com o e-mail de uma conta não confirmada e uma senha errada
- **THEN** o sistema rejeita com a mesma mensagem genérica usada para credenciais inválidas

#### Scenario: Tela de login leva à confirmação
- **WHEN** o login responde `EMAIL_NOT_VERIFIED` na tela de login
- **THEN** o app abre a tela "Confirme seu e-mail" com o e-mail preenchido, explicando que a conta precisa ser confirmada e que um novo código pode ser pedido se o anterior expirou

#### Scenario: Link de recuperação na tela de login
- **WHEN** a pessoa está na tela de login
- **THEN** vê o link "Esqueci minha senha", que leva à recuperação de senha
