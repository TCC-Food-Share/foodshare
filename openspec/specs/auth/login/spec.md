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
O sistema SHALL aceitar, como credencial de login, a mesma senha definida pelo responsável no momento do cadastro (RF01/RF02), ou a nova senha definida pela recuperação de senha (RF08), desde que o e-mail pessoal da conta esteja confirmado (RF75). Nenhuma outra configuração de credencial SHALL ser exigida.

#### Scenario: Primeiro login após o cadastro
- **WHEN** um estabelecimento ou entidade beneficiária recém-cadastrado confirma o e-mail e faz login usando o e-mail pessoal e a senha definidos no cadastro
- **THEN** o sistema autentica normalmente, sem exigir nenhuma etapa extra de configuração de credencial

#### Scenario: Login com a senha redefinida
- **WHEN** a pessoa redefine a senha pelo código de recuperação e faz login com a nova senha
- **THEN** o sistema autentica normalmente, e a senha anterior deixa de ser aceita

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

### Requirement: Falha ao carregar a sessão no frontend

Ao abrir o app, o frontend SHALL tratar a falha ao consultar a sessão atual: resposta `401` continua significando "sem sessão"; qualquer outra falha (limite de requisições excedido, erro do servidor ou falta de conexão) SHALL mostrar uma tela de erro com a ação "Tentar novamente", em vez de ficar carregando indefinidamente.

#### Scenario: Limite de requisições excedido

- **WHEN** a consulta da sessão responde `429`
- **THEN** o app mostra "Não foi possível carregar o Food Share." e pede para aguardar um instante antes de tentar de novo

#### Scenario: Sem conexão ou erro do servidor

- **WHEN** a consulta da sessão falha por falta de conexão ou erro do servidor
- **THEN** o app mostra a tela de erro e pede para verificar a conexão

#### Scenario: Tentar novamente

- **WHEN** a pessoa clica em "Tentar novamente" e a consulta da sessão funciona
- **THEN** o app carrega a página em que ela estava, com a sessão dela

#### Scenario: Sem sessão continua indo para o login

- **WHEN** a consulta da sessão responde `401`
- **THEN** o app trata como sessão ausente e leva às telas públicas, sem mostrar a tela de erro

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
