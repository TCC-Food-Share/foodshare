# auth/confirmacao-email Specification

## Purpose

Garantir que o e-mail pessoal de toda conta nova pertence a quem se cadastrou, exigindo a confirmação por um código
enviado a esse e-mail antes do primeiro login, e liberar os dados únicos de cadastros nunca confirmados.

## Requirements

### Requirement: Código de confirmação enviado no cadastro

Ao criar uma conta, o sistema SHALL marcá-la como não confirmada e SHALL enviar ao e-mail pessoal um código de 6
dígitos, válido por 10 minutos (RF75, RN47). O e-mail SHALL sair com remetente no domínio `foodshare.com.br`
(RNF12). A única conta que nasce confirmada, sem envio de e-mail, é o administrador criado pelo seed (DT39).

#### Scenario: Cadastro de instituição

- **WHEN** um estabelecimento ou uma entidade beneficiária conclui o cadastro
- **THEN** a conta é criada como não confirmada e um código de 6 dígitos, válido por 10 minutos, é enviado ao
  e-mail pessoal informado

#### Scenario: Administrador do seed

- **WHEN** o seed cria o primeiro administrador
- **THEN** a conta nasce confirmada, consegue fazer login sem código e nenhum e-mail é enviado

#### Scenario: Falha no envio do e-mail

- **WHEN** o serviço de e-mail falha ao enviar o código de confirmação
- **THEN** o cadastro continua criado, a falha fica registrada no log de erros, e a pessoa pode pedir um novo
  código

### Requirement: Confirmação do e-mail pelo código

O sistema SHALL confirmar o e-mail da conta quando receber o e-mail e o código de confirmação válido. Cada código
errado SHALL contar como tentativa; na 3ª tentativa errada o código SHALL ser invalidado (DT37). Código expirado
SHALL ser recusado. O código SHALL ser descartado depois do uso. Confirmar o e-mail SHALL NOT abrir sessão: a
pessoa entra pelo login normal.

#### Scenario: Código correto

- **WHEN** a pessoa envia o e-mail e o código de confirmação recebido, dentro de 10 minutos
- **THEN** o e-mail da conta passa a constar como confirmado, o código é descartado e nenhuma sessão é aberta

#### Scenario: Código errado

- **WHEN** a pessoa envia um código diferente do enviado
- **THEN** o sistema recusa com erro de código inválido, conta uma tentativa e a conta continua não confirmada

#### Scenario: Tentativas esgotadas

- **WHEN** a pessoa já errou o código 3 vezes e envia um código de novo, mesmo o correto
- **THEN** o sistema recusa com erro de tentativas esgotadas, e o código deixa de valer

#### Scenario: Código expirado

- **WHEN** a pessoa envia o código depois de 10 minutos do envio
- **THEN** o sistema recusa com erro de código expirado

#### Scenario: Código de recuperação não confirma

- **WHEN** a pessoa tenta confirmar o e-mail com um código de recuperação de senha
- **THEN** o sistema recusa com erro de código inválido

### Requirement: Reenvio do código de confirmação

O sistema SHALL permitir pedir um novo código de confirmação informando o e-mail, com no máximo 1 pedido a cada 10
minutos por IP de origem, pelo limite nativo da biblioteca de autenticação. O novo código SHALL substituir o
anterior. A resposta SHALL ser a mesma para conta não confirmada, conta já confirmada, e-mail não cadastrado e conta
excluída logicamente; só a conta não confirmada e não excluída recebe e-mail (DT36).

#### Scenario: Reenvio para conta não confirmada

- **WHEN** a pessoa pede um novo código para o e-mail de uma conta não confirmada
- **THEN** o sistema responde com sucesso, envia um novo código e o anterior deixa de valer

#### Scenario: Reenvio para e-mail que não precisa

- **WHEN** o pedido é para um e-mail não cadastrado, de conta já confirmada ou de conta excluída logicamente
- **THEN** o sistema responde com o mesmo sucesso e não envia e-mail

#### Scenario: Segundo reenvio em menos de 10 minutos

- **WHEN** o mesmo IP pede um segundo reenvio menos de 10 minutos depois do primeiro
- **THEN** o sistema recusa com `429`, informa em segundos quanto falta e não envia e-mail

### Requirement: Exclusão das contas não confirmadas

O sistema SHALL apagar de vez, de hora em hora, toda conta com e-mail não confirmado criada há mais de 24 horas,
com a instituição, o endereço, as sessões, os códigos pendentes e a imagem de perfil no armazenamento de arquivos
(RN48). A exclusão SHALL liberar CNPJ, e-mails e celulares para um novo cadastro. Conta confirmada SHALL NOT ser
apagada, nem se a confirmação acontecer durante a execução da tarefa.

#### Scenario: Conta não confirmada há mais de 24 horas

- **WHEN** a tarefa roda e encontra uma instituição cadastrada há 25 horas sem e-mail confirmado
- **THEN** o usuário, a instituição, o endereço, as sessões e os códigos são apagados, e a imagem é removida do
  armazenamento depois da gravação no banco

#### Scenario: Conta não confirmada há menos de 24 horas

- **WHEN** a tarefa roda e encontra uma conta não confirmada criada há 23 horas
- **THEN** a conta é mantida

#### Scenario: Conta confirmada

- **WHEN** a tarefa roda e encontra uma conta confirmada criada há mais de 24 horas
- **THEN** a conta é mantida

#### Scenario: Confirmação durante a tarefa

- **WHEN** uma conta não confirmada há mais de 24 horas é confirmada entre a busca e a exclusão
- **THEN** a conta é mantida

#### Scenario: Novo cadastro com os mesmos dados

- **WHEN** uma conta não confirmada foi apagada pela tarefa e alguém se cadastra com o mesmo CNPJ e e-mail
- **THEN** o cadastro é aceito normalmente

#### Scenario: Execução manual pelo administrador

- **WHEN** um administrador dispara a tarefa pela rota de execução de tarefas
- **THEN** a tarefa roda na hora e informa quantas contas foram apagadas

### Requirement: Tela de confirmação do e-mail

O frontend SHALL oferecer a tela "Confirme seu e-mail", com o código de 6 dígitos, as ações "Confirmar e-mail",
"Reenviar código" e "Voltar para o login", e as mesmas mensagens de erro da recuperação de senha. O e-mail e o código
SHALL NOT aparecer no endereço da página.

#### Scenario: Depois do cadastro

- **WHEN** o cadastro é concluído com sucesso
- **THEN** a tela de confirmação abre com o e-mail informado, dizendo que um código de 6 dígitos foi enviado

#### Scenario: Confirmação bem-sucedida

- **WHEN** a pessoa digita o código certo e clica em "Confirmar e-mail"
- **THEN** volta à tela de login, com o e-mail preenchido e o aviso de que o e-mail foi confirmado e já pode entrar

#### Scenario: Reenvio na tela

- **WHEN** a pessoa clica em "Reenviar código"
- **THEN** as caixas do código são limpas e a tela avisa que um novo código foi enviado, ou, se o limite foi
  atingido, mostra em quantos minutos poderá pedir de novo

#### Scenario: Código expirado ou tentativas esgotadas na tela

- **WHEN** o código é recusado por expiração ou por tentativas esgotadas
- **THEN** a tela explica o motivo e indica "Reenviar código"

#### Scenario: Página aberta sem e-mail

- **WHEN** a pessoa abre ou recarrega a tela de confirmação sem um e-mail conhecido
- **THEN** a tela pede o e-mail antes do código
