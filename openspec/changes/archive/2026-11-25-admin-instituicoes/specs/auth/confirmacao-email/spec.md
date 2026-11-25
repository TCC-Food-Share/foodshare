## MODIFIED Requirements

### Requirement: Código de confirmação enviado no cadastro

Ao criar uma conta, o sistema SHALL marcá-la como não confirmada e SHALL enviar ao e-mail pessoal um código de 6
dígitos, válido por 10 minutos (RF75, RN47). O e-mail SHALL sair com remetente no domínio `foodshare.com.br`
(RNF12). Isso vale também para o administrador cadastrado pelo painel (RF29) e para a instituição
cadastrada pelo administrador (RF41). A única conta que nasce confirmada, sem
envio de e-mail, é o administrador criado pelo seed (DT39).

#### Scenario: Cadastro de instituição

- **WHEN** um estabelecimento ou uma entidade beneficiária conclui o cadastro
- **THEN** a conta é criada como não confirmada e um código de 6 dígitos, válido por 10 minutos, é enviado ao
  e-mail pessoal informado

#### Scenario: Administrador cadastrado pelo painel

- **WHEN** um administrador cadastra outro administrador pelo painel
- **THEN** a conta nova é criada como não confirmada, um código de 6 dígitos, válido por 10 minutos, é enviado ao
  e-mail informado, e ela só faz login depois de confirmar pela tela de confirmação

#### Scenario: Instituição cadastrada pelo administrador

- **WHEN** um administrador cadastra um estabelecimento ou uma entidade beneficiária pelo painel
- **THEN** a conta nova é criada como não confirmada, um código de 6 dígitos, válido por 10 minutos, é enviado ao
  e-mail pessoal informado, ela só faz login depois de confirmar pela tela de confirmação e é apagada se não
  confirmar em 24 horas

#### Scenario: Administrador do seed

- **WHEN** o seed cria o primeiro administrador
- **THEN** a conta nasce confirmada, consegue fazer login sem código e nenhum e-mail é enviado

#### Scenario: Falha no envio do e-mail

- **WHEN** o serviço de e-mail falha ao enviar o código de confirmação
- **THEN** o cadastro continua criado, a falha fica registrada no log de erros, e a pessoa pode pedir um novo
  código
