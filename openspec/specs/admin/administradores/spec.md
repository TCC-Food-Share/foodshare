# admin/administradores Specification

## Purpose

Permitir que o administrador gerencie pelo painel as contas de administrador: listar, cadastrar, editar e excluir
permanentemente, garantindo que sempre exista pelo menos um administrador e que toda escrita fique auditada (RF29–RF32,
RN34, RN46, DT46–DT48).

## Requirements

### Requirement: Acesso exclusivo do administrador

As rotas de gestão de administradores SHALL ficar sob `/admin/` e SHALL ser acessíveis só por administradores.
Requisição sem sessão SHALL receber `401`; estabelecimento ou entidade beneficiária SHALL receber `403` com `code`
`ROLE_NOT_ALLOWED`, sem executar a operação.

#### Scenario: Instituição tenta cadastrar administrador

- **WHEN** uma entidade beneficiária autenticada tenta cadastrar um administrador
- **THEN** o sistema responde `403` com `code` `ROLE_NOT_ALLOWED` e nenhum usuário é criado

#### Scenario: Listagem sem sessão

- **WHEN** a listagem de administradores é pedida sem sessão
- **THEN** o sistema responde `401`

### Requirement: Listagem de administradores

O sistema SHALL listar só os usuários com o papel "Administrator", de forma paginada (`page` e `pageSize`, que aceita
10, 20, 50 ou 100, com padrão 10; resposta `{ data, total, page, pageSize }`), com busca opcional e ordenação por campo
(RF32, DT23). Cada linha SHALL trazer o identificador, a URL da imagem, o nome, o e-mail e se o e-mail já foi
confirmado (DT48), nunca a senha. A busca SHALL casar o identificador exato quando o termo for numérico e, em todos os
casos, o trecho no nome ou no e-mail, sem diferenciar maiúsculas nem acentos. A ordenação SHALL aceitar identificador,
nome e e-mail (`sort` e `order` `asc` ou `desc`); sem `sort`, a ordem SHALL ser por identificador crescente. Campo de
ordenação fora dos permitidos SHALL ser rejeitado com `400`.

#### Scenario: Só administradores na listagem

- **WHEN** o administrador lista os administradores num banco que também tem estabelecimentos e entidades
- **THEN** a listagem traz só as contas de administrador, e o `total` conta só elas

#### Scenario: Busca pelo nome sem acento

- **WHEN** o administrador busca "joao"
- **THEN** a listagem traz o administrador "João Souza"

#### Scenario: Busca pelo e-mail

- **WHEN** o administrador busca "@foodshare"
- **THEN** a listagem traz os administradores cujo e-mail contém "@foodshare"

#### Scenario: Busca pelo identificador

- **WHEN** o administrador busca "7"
- **THEN** a listagem traz o administrador de identificador 7 e os administradores cujo nome ou e-mail contém "7"

#### Scenario: Ordenação por e-mail decrescente

- **WHEN** o administrador lista com `sort=email` e `order=desc`
- **THEN** os administradores vêm em ordem decrescente de e-mail

#### Scenario: Campo de ordenação inválido

- **WHEN** o administrador lista com `sort=password`
- **THEN** o sistema responde `400`

#### Scenario: Administrador que ainda não confirmou

- **WHEN** a listagem inclui um administrador cadastrado pelo painel que ainda não confirmou o e-mail
- **THEN** a linha dele indica e-mail não confirmado, e as dos demais indicam e-mail confirmado

### Requirement: Cadastro de administrador

O administrador SHALL poder cadastrar outro administrador informando nome, e-mail, senha e imagem, todos obrigatórios
(RF29). A senha SHALL ter de 8 a 72 caracteres, e a imagem SHALL seguir os limites da RN41. O e-mail SHALL ser único
entre **todos** os usuários, inclusive instituições e contas excluídas logicamente: e-mail já usado SHALL responder
`409` com `code` `EMAIL_ALREADY_REGISTERED`, sem criar nada e sem guardar a imagem. A conta criada SHALL nascer com o
papel "Administrator", sem celular pessoal e com o e-mail não confirmado, e o código de confirmação SHALL ser enviado
ao e-mail informado (DT39). Ela SHALL só fazer login depois de confirmar o e-mail (RN47) e SHALL ser apagada se não
confirmar em 24 horas (RN48). A resposta SHALL trazer o administrador criado, sem a senha.

#### Scenario: Cadastro bem-sucedido

- **WHEN** o administrador cadastra "Ana Lima", "ana@exemplo.com", uma senha de 10 caracteres e uma imagem PNG de 1 MB
- **THEN** o sistema responde `201` com o identificador, a URL da imagem, o nome, o e-mail e o e-mail não confirmado,
  e um código de confirmação é enviado para "ana@exemplo.com"

#### Scenario: Novo administrador antes de confirmar

- **WHEN** o administrador recém-cadastrado tenta fazer login com e-mail e senha corretos antes de confirmar o e-mail
- **THEN** o login é recusado com `403` e `EMAIL_NOT_VERIFIED`, como em qualquer conta não confirmada

#### Scenario: Novo administrador depois de confirmar

- **WHEN** o administrador recém-cadastrado confirma o e-mail com o código e faz login
- **THEN** ele entra na área administrativa

#### Scenario: E-mail de uma instituição

- **WHEN** o administrador tenta cadastrar um administrador com o e-mail pessoal de um estabelecimento
- **THEN** o sistema responde `409` com `code` `EMAIL_ALREADY_REGISTERED` e nenhum usuário é criado

#### Scenario: Cadastro sem imagem

- **WHEN** o administrador tenta cadastrar um administrador sem enviar imagem
- **THEN** o sistema responde `400` e nenhum usuário é criado

#### Scenario: Senha curta

- **WHEN** o administrador tenta cadastrar um administrador com senha de 7 caracteres
- **THEN** o sistema responde `400` e nenhum usuário é criado

#### Scenario: Falha depois de criar a conta

- **WHEN** a gravação da auditoria do cadastro falha depois que a conta já foi criada
- **THEN** a conta e a imagem são apagadas e o administrador recebe erro

### Requirement: Edição de administrador

O administrador SHALL poder editar o nome, o e-mail e a imagem de qualquer administrador, inclusive a si mesmo,
enviando só os campos que quer alterar (RF30). Campo enviado SHALL seguir as mesmas regras do cadastro: nome não vazio,
e-mail válido e único entre todos os usuários (repetido responde `409` com `code` `EMAIL_ALREADY_REGISTERED`) e imagem
nos limites da RN41. Manter o próprio e-mail SHALL ser permitido. A senha NÃO SHALL ser editável por esta rota. Trocar
o e-mail SHALL valer na hora, sem nova confirmação e sem encerrar as sessões; o login passa a ser pelo novo e-mail
(DT47). Trocar a imagem SHALL apagar a anterior do armazenamento só depois que a edição for gravada; se a edição
falhar, a nova imagem SHALL ser apagada e a anterior continua valendo. Identificador que não é de administrador SHALL
responder `404`.

#### Scenario: Edição parcial do nome

- **WHEN** o administrador envia só o nome "Ana Paula Lima" para o administrador 7
- **THEN** o sistema responde `200` com o nome novo, e o e-mail e a imagem continuam os mesmos

#### Scenario: Troca de e-mail sem nova confirmação

- **WHEN** o administrador troca o e-mail do administrador 7 para "ana.lima@exemplo.com"
- **THEN** o administrador 7 faz login com o novo e-mail e a mesma senha, sem precisar de código, e o e-mail antigo
  não entra mais

#### Scenario: Troca do próprio e-mail

- **WHEN** o administrador troca o próprio e-mail
- **THEN** a sessão dele continua válida e os dados da própria sessão passam a trazer o novo e-mail

#### Scenario: E-mail de outro usuário

- **WHEN** o administrador troca o e-mail do administrador 7 para o e-mail de uma entidade beneficiária
- **THEN** o sistema responde `409` com `code` `EMAIL_ALREADY_REGISTERED` e nada muda

#### Scenario: Troca de imagem

- **WHEN** o administrador envia uma imagem nova para o administrador 7
- **THEN** a resposta traz a URL da imagem nova, e a anterior deixa de existir no armazenamento

#### Scenario: Identificador de instituição

- **WHEN** o administrador tenta editar o identificador de um estabelecimento por esta rota
- **THEN** o sistema responde `404` e nada muda

### Requirement: Exclusão permanente de administrador

O administrador SHALL poder excluir permanentemente outro administrador (RF31). A exclusão SHALL apagar o usuário, as
sessões, as credenciais e os códigos pendentes dele, e SHALL remover a imagem do armazenamento depois que a exclusão
for gravada. As linhas de auditoria e as opções de listas padronizadas e decisões de sugestão feitas pelo excluído
SHALL continuar existindo, sem o vínculo com ele. O administrador NÃO SHALL poder excluir a própria conta: a tentativa
SHALL responder `409` com `code` `CANNOT_DELETE_SELF` (DT46). O sistema SHALL sempre manter pelo menos um
administrador com e-mail confirmado (RN34): uma exclusão que deixaria nenhum SHALL responder `409` com `code`
`LAST_ADMINISTRATOR`, sem apagar nada, inclusive quando duas exclusões cruzadas acontecem ao mesmo tempo. Identificador
que não é de administrador SHALL responder `404`.

#### Scenario: Exclusão de outro administrador

- **WHEN** o administrador 1 exclui o administrador 7
- **THEN** o sistema responde `204`, o administrador 7 não faz mais login, some da listagem e a imagem dele é removida
  do armazenamento

#### Scenario: Sessão do excluído

- **WHEN** o administrador 7 está com o painel aberto e é excluído por outro administrador
- **THEN** a próxima requisição dele responde `401`

#### Scenario: Histórico do excluído preservado

- **WHEN** o administrador 7, que criou a categoria "Congelados" e tem linhas de auditoria, é excluído
- **THEN** a categoria e as linhas de auditoria continuam existindo, sem o vínculo com o usuário, e a auditoria ainda
  mostra o nome e o e-mail dele

#### Scenario: Tentativa de excluir a si mesmo

- **WHEN** o administrador 1 tenta excluir a própria conta pela API
- **THEN** o sistema responde `409` com `code` `CANNOT_DELETE_SELF` e nada é apagado

#### Scenario: Exclusões cruzadas ao mesmo tempo

- **WHEN** só existem os administradores 1 e 7, ambos confirmados, e cada um tenta excluir o outro ao mesmo tempo
- **THEN** uma das exclusões é concluída e a outra responde `409` com `code` `LAST_ADMINISTRATOR`, e sobra um
  administrador

#### Scenario: Exclusão de administrador não confirmado

- **WHEN** o administrador 1 exclui um administrador cadastrado pelo painel que ainda não confirmou o e-mail
- **THEN** a conta é apagada, e o e-mail dela fica livre para um novo cadastro

#### Scenario: Identificador inexistente

- **WHEN** o administrador tenta excluir um identificador que não existe ou que é de uma instituição
- **THEN** o sistema responde `404` e nada é apagado

### Requirement: Auditoria das escritas em administradores

Todo cadastro, edição e exclusão de administrador SHALL gravar uma linha de auditoria com o administrador responsável,
a ação (`administrator.create`, `administrator.update` ou `administrator.delete`), o tipo `User` e o identificador da
conta afetada, e os dados relevantes: nome e e-mail no cadastro, valores antes e depois dos campos alterados na
edição, e nome e e-mail do excluído na exclusão. A senha NÃO SHALL aparecer na auditoria. Escrita recusada NÃO SHALL
gravar auditoria.

#### Scenario: Cadastro auditado sem senha

- **WHEN** o administrador cadastra um administrador
- **THEN** existe uma linha `administrator.create` com o identificador, o nome e o e-mail do novo administrador, e
  nenhum campo da linha contém a senha

#### Scenario: Edição auditada

- **WHEN** o administrador troca o nome do administrador 7 de "Ana Lima" para "Ana Paula Lima"
- **THEN** existe uma linha `administrator.update` com o identificador 7 e os nomes antes e depois

#### Scenario: Exclusão recusada não audita

- **WHEN** a exclusão é recusada com `CANNOT_DELETE_SELF` ou `LAST_ADMINISTRATOR`
- **THEN** nenhuma linha de auditoria é gravada

### Requirement: Tela de gestão de administradores

A seção "Administradores" do painel SHALL mostrar o título, uma descrição curta, o botão "Novo administrador" e a
tabela administrativa com busca, ordenação por coluna, paginação com escolha de itens por página (10, 20, 50 ou 100,
padrão 10) e as colunas ID, imagem, nome e e-mail. Quem ainda não confirmou o e-mail SHALL aparecer com o selo
"Aguardando confirmação" (DT48). Cada linha SHALL ter as ações de editar e excluir, exceto a linha do próprio
administrador, que SHALL ter só a de editar (DT46).

O cadastro SHALL acontecer num diálogo com nome, e-mail, senha, confirmação da senha e imagem (com prévia), e SHALL só
ser enviado quando a senha e a confirmação forem iguais. Ao concluir, a interface SHALL avisar que o novo
administrador recebeu um código no e-mail, que só entra depois de confirmar e que o cadastro é apagado se não
confirmar em 24 horas.

A edição SHALL usar o mesmo diálogo, sem os campos de senha, já preenchido, SHALL enviar só os campos alterados e
SHALL mostrar uma mensagem de sucesso (RF30). Sem nenhuma alteração, o botão de salvar SHALL ficar desabilitado.
Quando o administrador edita a si mesmo, o nome e o e-mail mostrados no menu do painel SHALL ser atualizados sem
recarregar a página.

A exclusão SHALL pedir confirmação num diálogo que diz que a ação é permanente e não pode ser desfeita. Os erros do
servidor (`EMAIL_ALREADY_REGISTERED` no campo de e-mail, `LAST_ADMINISTRATOR` e `CANNOT_DELETE_SELF` no diálogo de
exclusão, imagem inválida no campo de imagem) SHALL aparecer com mensagem própria. Depois de cada escrita, a tabela
SHALL refletir a mudança sem recarregar a página.

#### Scenario: Seção mostra a tabela

- **WHEN** o administrador abre a seção "Administradores"
- **THEN** a interface mostra a tabela de administradores, sem o aviso de "em construção"

#### Scenario: Própria linha sem excluir

- **WHEN** o administrador vê a própria linha na tabela
- **THEN** a linha tem a ação de editar e não tem a de excluir

#### Scenario: Cadastro pelo diálogo

- **WHEN** o administrador clica em "Novo administrador", preenche os campos com senhas iguais, escolhe uma imagem e
  salva
- **THEN** o diálogo fecha, a interface avisa que o código de confirmação foi enviado ao e-mail informado e o novo
  administrador aparece na tabela com o selo "Aguardando confirmação"

#### Scenario: Senhas diferentes

- **WHEN** o administrador digita senha e confirmação diferentes no cadastro
- **THEN** o campo de confirmação mostra o erro e nada é enviado

#### Scenario: E-mail repetido no diálogo

- **WHEN** o servidor recusa o cadastro com `EMAIL_ALREADY_REGISTERED`
- **THEN** o diálogo continua aberto e mostra o erro no campo de e-mail

#### Scenario: Edição de si mesmo

- **WHEN** o administrador troca o próprio nome pelo diálogo de edição
- **THEN** a interface mostra a mensagem de sucesso, e a tabela e o menu do painel mostram o nome novo

#### Scenario: Último administrador na exclusão

- **WHEN** o servidor recusa a exclusão com `LAST_ADMINISTRATOR`
- **THEN** o diálogo de exclusão explica que o sistema precisa de pelo menos um administrador e nada some da tabela
