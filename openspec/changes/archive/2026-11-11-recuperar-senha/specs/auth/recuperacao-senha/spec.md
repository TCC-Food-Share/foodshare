## Purpose

Permitir que estabelecimentos, entidades beneficiárias e administradores que esqueceram a senha definam uma nova,
provando que têm acesso ao e-mail pessoal cadastrado por meio de um código de verificação de uso único.

## ADDED Requirements

### Requirement: Pedido do código de recuperação

O sistema SHALL aceitar um pedido de recuperação de senha com um e-mail e, quando o e-mail pertencer a uma conta
cadastrada e não excluída logicamente, SHALL enviar a esse endereço um código de 6 dígitos, válido por 10 minutos
(RF08, RN33). O e-mail SHALL sair com remetente no domínio `foodshare.com.br` (RNF12). A resposta SHALL ser a mesma
para e-mail cadastrado, não cadastrado ou de conta excluída logicamente, sem revelar quais contas existem (DT36).

#### Scenario: E-mail cadastrado

- **WHEN** uma pessoa pede a recuperação com o e-mail pessoal de uma conta ativa
- **THEN** o sistema responde com sucesso e envia ao e-mail um código de 6 dígitos, válido por 10 minutos

#### Scenario: E-mail não cadastrado

- **WHEN** uma pessoa pede a recuperação com um e-mail que não pertence a nenhuma conta
- **THEN** o sistema responde com o mesmo sucesso do e-mail cadastrado e não envia nenhum e-mail

#### Scenario: Conta excluída logicamente

- **WHEN** uma pessoa pede a recuperação com o e-mail de uma conta com `deleted = true`
- **THEN** o sistema responde com o mesmo sucesso do e-mail cadastrado e não envia nenhum e-mail

#### Scenario: Maiúsculas no e-mail

- **WHEN** uma pessoa pede a recuperação com o e-mail cadastrado escrito com letras maiúsculas
- **THEN** o sistema trata como o mesmo e-mail e envia o código

#### Scenario: Novo pedido substitui o código anterior

- **WHEN** a mesma conta recebe um segundo código depois que o limite de pedidos permitiu
- **THEN** só o código mais recente é aceito

#### Scenario: Falha no envio do e-mail

- **WHEN** o serviço de e-mail falha ao enviar o código
- **THEN** a resposta ao pedido não muda e a falha fica registrada no log de erros

### Requirement: Limite de pedidos de código por origem

O sistema SHALL aceitar no máximo 1 pedido de código de recuperação a cada 10 minutos por IP de origem, usando o
limite de requisições nativo da biblioteca de autenticação (RNF11, RN33, DT17). O pedido recusado SHALL informar
quanto tempo falta para poder pedir de novo. Nenhuma outra rota SHALL permitir gerar um código de recuperação fora
desse limite.

#### Scenario: Segundo pedido em menos de 10 minutos

- **WHEN** o mesmo IP pede um segundo código de recuperação menos de 10 minutos depois do primeiro, para o mesmo ou
  para outro e-mail
- **THEN** o sistema recusa com `429`, informa em segundos quanto falta para o próximo pedido e não envia e-mail

#### Scenario: Pedido depois de 10 minutos

- **WHEN** o mesmo IP pede um novo código depois de 10 minutos do pedido anterior
- **THEN** o sistema aceita o pedido normalmente

#### Scenario: IPs diferentes

- **WHEN** dois IPs diferentes pedem um código no mesmo minuto
- **THEN** o sistema aceita os dois pedidos

#### Scenario: Rotas alternativas de envio de código

- **WHEN** alguém tenta gerar um código por uma rota de envio genérico, pela rota antiga de recuperação ou pelo
  login por código
- **THEN** o sistema responde que a rota não existe e não envia e-mail

### Requirement: Validação do código

O sistema SHALL permitir conferir o código de recuperação de um e-mail sem consumi-lo, para que a tela libere a
etapa da nova senha. Cada código errado SHALL contar como tentativa; na 3ª tentativa errada o código SHALL ser
invalidado (DT37). Código expirado SHALL ser recusado.

#### Scenario: Código correto

- **WHEN** a pessoa envia o e-mail e o código recebido, dentro de 10 minutos
- **THEN** o sistema confirma que o código é válido e o código continua utilizável para definir a nova senha

#### Scenario: Código errado

- **WHEN** a pessoa envia um código diferente do enviado
- **THEN** o sistema recusa com erro de código inválido e conta uma tentativa

#### Scenario: Tentativas esgotadas

- **WHEN** a pessoa já errou o código 3 vezes e envia um código de novo, mesmo o correto
- **THEN** o sistema recusa com erro de tentativas esgotadas, e o código deixa de valer

#### Scenario: Código expirado

- **WHEN** a pessoa envia o código depois de 10 minutos do envio
- **THEN** o sistema recusa com erro de código expirado

### Requirement: Definição da nova senha

O sistema SHALL definir a nova senha da conta quando receber o e-mail, um código válido e a nova senha, com as
mesmas regras de tamanho do cadastro (8 a 72 caracteres). Depois da troca, o código SHALL ser descartado (RNF11,
RN33) e todas as sessões abertas da conta SHALL ser encerradas (DT38). A nova senha SHALL valer para o login, e a
antiga SHALL deixar de valer.

#### Scenario: Troca bem-sucedida

- **WHEN** a pessoa envia e-mail, código válido e uma nova senha de 8 a 72 caracteres
- **THEN** o sistema troca a senha, descarta o código e encerra todas as sessões da conta

#### Scenario: Login depois da troca

- **WHEN** a pessoa faz login com a nova senha depois da troca
- **THEN** o login funciona, e a senha antiga é recusada com a mensagem genérica de credenciais inválidas

#### Scenario: Código reutilizado

- **WHEN** a pessoa tenta trocar a senha de novo com o mesmo código já usado
- **THEN** o sistema recusa com erro de código inválido e a senha não muda

#### Scenario: Senha fora do tamanho

- **WHEN** a nova senha tem menos de 8 ou mais de 72 caracteres
- **THEN** o sistema recusa, a senha não muda e o código continua valendo

#### Scenario: Código errado na troca

- **WHEN** a pessoa envia e-mail, nova senha e um código errado ou expirado
- **THEN** o sistema recusa, a senha não muda, e o código errado conta como tentativa

#### Scenario: Troca de senha confirma o e-mail

- **WHEN** uma conta com e-mail ainda não confirmado troca a senha com um código de recuperação válido
- **THEN** o e-mail da conta passa a constar como confirmado, e ela não é mais apagada pela limpeza de contas não
  confirmadas

#### Scenario: Conta excluída continua sem acesso

- **WHEN** uma conta com `deleted = true` tenta login depois de qualquer passo da recuperação
- **THEN** o login continua recusado, como manda a regra de bloqueio de conta excluída

### Requirement: Telas de recuperação de senha

O frontend SHALL oferecer o link "Esqueci minha senha" na tela de login e o fluxo em três etapas do protótipo:
e-mail, código e nova senha. As mensagens de erro SHALL ser em pt-BR e dizer o que fazer em seguida.

#### Scenario: Link no login

- **WHEN** a pessoa está na tela de login
- **THEN** vê o link "Esqueci minha senha", que leva à etapa do e-mail

#### Scenario: Etapa do e-mail

- **WHEN** a pessoa informa um e-mail válido e envia
- **THEN** a tela passa para a etapa do código, dizendo que, se o e-mail estiver cadastrado, um código de 6 dígitos
  foi enviado

#### Scenario: Pedido repetido em menos de 10 minutos

- **WHEN** o pedido de código é recusado por limite, na etapa do e-mail ou ao clicar em "Reenviar código"
- **THEN** a tela explica que só é possível pedir um código a cada 10 minutos e mostra em quantos minutos poderá
  pedir de novo

#### Scenario: Etapa do código

- **WHEN** a pessoa digita os 6 dígitos e clica em "Verificar código", e o código é válido
- **THEN** a tela passa para a etapa da nova senha

#### Scenario: Código inválido na tela

- **WHEN** o código digitado é recusado como inválido
- **THEN** a tela mostra que o código está incorreto e mantém a pessoa na etapa do código

#### Scenario: Código expirado ou tentativas esgotadas na tela

- **WHEN** o código é recusado por expiração ou por tentativas esgotadas, na etapa do código ou na da nova senha
- **THEN** a tela explica o motivo e oferece pedir um novo código

#### Scenario: Etapa da nova senha

- **WHEN** a pessoa informa a nova senha e a confirmação iguais, com 8 a 72 caracteres, e clica em "Redefinir senha"
- **THEN** a senha é trocada e a pessoa volta à tela de login com um aviso de que já pode entrar com a nova senha

#### Scenario: Confirmação diferente

- **WHEN** a confirmação não é igual à nova senha
- **THEN** a tela mostra "As senhas não conferem." e não envia nada

#### Scenario: Voltar para o login

- **WHEN** a pessoa clica em "Voltar para o login" em qualquer etapa
- **THEN** volta à tela de login sem trocar a senha

#### Scenario: Código fora do endereço

- **WHEN** a pessoa está em qualquer etapa do fluxo
- **THEN** nem o e-mail nem o código aparecem no endereço da página
