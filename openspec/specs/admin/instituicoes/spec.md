# admin/instituicoes Specification

## Purpose

Permitir que o administrador gerencie pelo painel os estabelecimentos e as entidades beneficiárias: listar com busca
ampla, cadastrar, ver o perfil completo com indicadores de atividade e editar, inclusive aplicando ou desfazendo a
exclusão lógica, excluir logicamente pela ação dedicada e excluir permanentemente, com toda escrita auditada (RF41–RF48,
RF57, RF58, RN26–RN30, RN46, DT49–DT56).

## Requirements

### Requirement: Acesso exclusivo do administrador às rotas de instituições

As rotas `/admin/institutions/...` e `/admin/cancellation-reasons/options` SHALL exigir sessão de um usuário com o
papel "Administrator". Sem sessão, a resposta SHALL ser `401`. Com sessão de estabelecimento ou entidade, a resposta
SHALL ser `403` com `code: ROLE_NOT_ALLOWED`.

#### Scenario: Instituição tenta listar instituições pelo painel

- **WHEN** um estabelecimento autenticado chama `GET /admin/institutions`
- **THEN** o sistema responde `403` com `code: ROLE_NOT_ALLOWED`

#### Scenario: Cadastro sem sessão

- **WHEN** uma requisição sem sessão chama `POST /admin/institutions/establishments`
- **THEN** o sistema responde `401` e não cria nada

### Requirement: Listagem de instituições

O sistema SHALL listar estabelecimentos e entidades beneficiárias juntos, de forma paginada (`page` e `pageSize`, que
aceita 10, 20, 50 ou 100, com padrão 10; resposta `{ data, total, page, pageSize }`), incluindo as excluídas
logicamente e as que ainda não confirmaram o e-mail (RF47, DT23). Cada linha SHALL trazer o tipo, o identificador, a
URL da imagem, a razão social, o nome fantasia, o CNPJ, o e-mail e o celular institucionais, o nome, o e-mail pessoal e
o celular pessoal do responsável (RF57), a cidade, a UF, a data de cadastro, se está excluída (`deleted`) e se o e-mail
já foi confirmado, e SHALL NOT trazer a senha nem dado de sessão.

A listagem SHALL aceitar o filtro de tipo (estabelecimento ou entidade) e o filtro de situação (ativas ou excluídas),
que juntos com a busca cobrem o campo "deletado" do RF47 (DT53). A busca SHALL ser um único termo, que casa sem
diferenciar maiúsculas nem acentos qualquer trecho de: razão social, nome fantasia, CNPJ, e-mail institucional,
celular institucional, nome do responsável, e-mail pessoal, celular pessoal, descrição, CEP, logradouro, número,
complemento, cidade e estado (RF47, RF58). CNPJ, celulares e CEP SHALL casar com ou sem pontuação. A data de cadastro
SHALL casar no formato `dd/mm/aaaa`, completo ou parcial, contada no fuso de Brasília (DT53).

A ordenação SHALL aceitar tipo, razão social, nome fantasia, CNPJ, nome do responsável, cidade, estado, data de
cadastro e situação (`sort` e `order` `asc` ou `desc`); sem `sort`, a ordem SHALL ser pela data de cadastro mais
recente primeiro. Campo de ordenação ou filtro fora dos permitidos SHALL ser rejeitado com `400`.

#### Scenario: Os dois tipos na mesma listagem

- **WHEN** existem 3 estabelecimentos e 2 entidades e o administrador lista sem filtro
- **THEN** a resposta traz as 5 instituições, cada uma com o seu tipo, e `total` 5

#### Scenario: Filtro por tipo

- **WHEN** o administrador lista com o filtro de entidades
- **THEN** a resposta traz só entidades beneficiárias

#### Scenario: Filtro de excluídas

- **WHEN** o administrador lista com o filtro de situação "excluídas"
- **THEN** a resposta traz só instituições com `deleted = true`

#### Scenario: Busca pelo nome do responsável sem acento

- **WHEN** o responsável de um estabelecimento se chama "João Araújo" e o administrador busca "joao araujo"
- **THEN** o estabelecimento aparece na resposta

#### Scenario: Busca pelo celular pessoal sem pontuação

- **WHEN** o celular pessoal do responsável de uma entidade é "(18) 99123-4567" e o administrador busca "991234567"
- **THEN** a entidade aparece na resposta

#### Scenario: Busca pela data de cadastro

- **WHEN** uma instituição foi cadastrada em 05/11/2026 às 22h no horário de Brasília e o administrador busca "05/11"
- **THEN** a instituição aparece na resposta

#### Scenario: Listagem não expõe senha

- **WHEN** o administrador lista as instituições
- **THEN** nenhuma linha da resposta contém senha, hash de senha ou token

#### Scenario: Instituição que ainda não confirmou

- **WHEN** uma instituição cadastrada há uma hora ainda não confirmou o e-mail
- **THEN** a linha dela vem com o e-mail não confirmado

#### Scenario: Campo de ordenação inválido

- **WHEN** o administrador lista com `sort=password`
- **THEN** o sistema responde `400`

### Requirement: Cadastro de instituição pelo administrador

O sistema SHALL permitir que o administrador cadastre um estabelecimento ou uma entidade beneficiária, escolhendo o tipo
pela rota, numa única submissão com os mesmos campos e as mesmas validações do cadastro público: nome, e-mail pessoal,
celular pessoal, senha (8 a 72 caracteres) e imagem do responsável; razão social, nome fantasia opcional, CNPJ, e-mail
institucional, celular institucional e descrição; CEP, logradouro, número, complemento opcional, cidade e estado
(RF41). A imagem SHALL ser obrigatória e seguir a RN41; sem ela, a resposta SHALL ser `400` com `code: IMAGE_REQUIRED`.
Nome fantasia e descrição SHALL passar pela validação de termos proibidos (DT24). A instituição SHALL nascer com
`deleted = false` e a conta SHALL nascer com o e-mail não confirmado, recebendo o código de confirmação (DT39); sem
confirmar, ela não loga (RN47) e é apagada depois de 24 horas (RN48). A resposta SHALL ser `201` com o perfil completo
da instituição, sem a senha.

CNPJ, e-mail pessoal, celular pessoal, e-mail institucional e celular institucional já usados por qualquer instituição,
de qualquer tipo, excluída ou não, ou e-mail já usado por um administrador, SHALL ser recusados com `409` e
`code: INSTITUTION_DATA_ALREADY_REGISTERED`, com a lista de campos que colidiram (RN26, DT52), sem criar nenhum
registro nem guardar a imagem.

#### Scenario: Cadastro de estabelecimento bem-sucedido

- **WHEN** o administrador cadastra um estabelecimento com todos os dados válidos e uma imagem válida
- **THEN** o sistema responde `201`, cria o usuário com o papel "Establishment", o endereço e o estabelecimento com
  `deleted = false`, e envia o código de confirmação ao e-mail pessoal

#### Scenario: Cadastro de entidade bem-sucedido

- **WHEN** o administrador cadastra uma entidade beneficiária com todos os dados válidos e uma imagem válida
- **THEN** o sistema responde `201` e cria a entidade com o papel "BeneficiaryEntity"

#### Scenario: Instituição cadastrada antes de confirmar

- **WHEN** a instituição cadastrada pelo administrador tenta logar antes de confirmar o e-mail
- **THEN** o login é recusado como o de qualquer conta não confirmada

#### Scenario: CNPJ de uma instituição do outro tipo

- **WHEN** o administrador cadastra uma entidade com o CNPJ de um estabelecimento já cadastrado
- **THEN** o sistema responde `409` com `code: INSTITUTION_DATA_ALREADY_REGISTERED` e `fields` contendo `cnpj`, sem criar
  nenhum registro

#### Scenario: Dado de instituição excluída logicamente

- **WHEN** o administrador cadastra um estabelecimento com o e-mail institucional de um estabelecimento excluído
  logicamente
- **THEN** o sistema responde `409` com `code: INSTITUTION_DATA_ALREADY_REGISTERED`

#### Scenario: E-mail pessoal de um administrador

- **WHEN** o administrador cadastra uma instituição com o e-mail pessoal igual ao de um administrador
- **THEN** o sistema responde `409` com `code: INSTITUTION_DATA_ALREADY_REGISTERED` e `fields` contendo `email`

#### Scenario: Descrição com termo proibido

- **WHEN** o administrador cadastra uma instituição com a descrição contendo um termo proibido
- **THEN** o sistema responde `400` com `code: PROHIBITED_CONTENT` e `fields` contendo `description`, sem criar nada

#### Scenario: Cadastro sem imagem

- **WHEN** o administrador cadastra uma instituição sem imagem
- **THEN** o sistema responde `400` com `code: IMAGE_REQUIRED` e não cria nada

#### Scenario: Falha depois de criar a conta

- **WHEN** a gravação da instituição ou da auditoria falha depois de a conta do responsável ter sido criada
- **THEN** a conta, o endereço e a imagem são apagados, e nenhuma linha de auditoria fica gravada

### Requirement: Perfil completo da instituição

O sistema SHALL devolver ao administrador o perfil completo de qualquer estabelecimento ou entidade, excluído ou não,
em modo somente leitura (RF48, RF57): dados institucionais (razão social, nome fantasia, CNPJ, e-mail e celular
institucionais, URL da imagem, descrição e endereço completo), dados do responsável (nome, e-mail pessoal e celular
pessoal), data de cadastro, `deleted`, se o e-mail foi confirmado e os indicadores de atividade (DT51):

- estabelecimento: quantidade de alimentos não excluídos em cada status (`Ativo`, `Reservado`, `Inativo`), quantidade
  de alimentos excluídos e quantidade de pedidos recebidos em cada status (`Pendente`, `Em andamento`, `Rejeitado`,
  `Doado`, `Cancelado`);
- entidade: quantidade de pedidos feitos em cada status.

Os indicadores SHALL contar também os registros excluídos logicamente. O sistema SHALL listar, paginados e em modo
somente leitura, os alimentos do estabelecimento (nome, quantidade com unidade, validade, status e se está excluído) e
os pedidos da instituição (identificador, alimento, outra parte, quantidade, data do pedido e status), incluindo os
excluídos logicamente. Identificador que não é de uma instituição do tipo da rota SHALL responder `404`.

#### Scenario: Perfil de estabelecimento com indicadores

- **WHEN** um estabelecimento tem 2 alimentos `Ativo`, 1 `Inativo`, 1 excluído e 3 pedidos `Doado`, e o administrador
  abre o perfil dele
- **THEN** a resposta traz os dados institucionais e os do responsável em blocos separados, `Ativo` 2, `Reservado` 0,
  `Inativo` 1, excluídos 1 e `Doado` 3 nos pedidos recebidos

#### Scenario: Perfil de entidade com indicadores

- **WHEN** o administrador abre o perfil de uma entidade com 1 pedido `Pendente` e 2 `Cancelado`
- **THEN** a resposta traz `Pendente` 1 e `Cancelado` 2 nos pedidos feitos, e nenhum indicador de alimentos

#### Scenario: Perfil de instituição excluída

- **WHEN** o administrador abre o perfil de uma entidade excluída logicamente
- **THEN** a resposta traz o perfil completo com `deleted = true`, inclusive os pedidos que a exclusão escondeu das
  partes

#### Scenario: Alimentos do estabelecimento

- **WHEN** o administrador pede a segunda página dos alimentos de um estabelecimento com 15 alimentos, com
  `pageSize` 10
- **THEN** a resposta traz 5 alimentos e `total` 15

#### Scenario: Tipo errado na rota

- **WHEN** o administrador abre `GET /admin/institutions/establishments/:id` com o id de uma entidade que não existe
  como estabelecimento
- **THEN** o sistema responde `404`

### Requirement: Edição de instituição pelo administrador

O sistema SHALL permitir que o administrador edite parcialmente qualquer estabelecimento ou entidade, excluído ou não,
enviando só os campos alterados entre: nome fantasia, e-mail institucional, celular institucional, celular pessoal,
nome do responsável, imagem, descrição, endereço (como unidade completa) e `deleted` (RF44). E-mail pessoal, CNPJ e
razão social SHALL ser recusados com `400`, sem alterar nada (RN27). O nome fantasia enviado vazio SHALL voltar a
`null` (DT40); o nome do responsável vazio SHALL ser recusado com `400`. Nome fantasia e descrição SHALL passar pela
validação de termos proibidos (DT24). E-mail institucional, celular institucional ou celular pessoal já usados por
outra instituição, de qualquer tipo, excluída ou não, SHALL ser recusados com `409` e
`code: INSTITUTION_DATA_ALREADY_REGISTERED`, com a lista de campos (RN26, DT52). A troca de imagem SHALL guardar a nova
e apagar a anterior só depois que a edição for gravada; se a edição falhar, a imagem nova SHALL ser apagada. A edição
SHALL NOT mudar a confirmação do e-mail nem encerrar sessões, salvo pela exclusão lógica. Toda a edição SHALL ser
atômica. A resposta SHALL ser `200` com o perfil completo atualizado.

#### Scenario: Edição parcial do celular institucional

- **WHEN** o administrador envia só um celular institucional novo e inédito para um estabelecimento
- **THEN** o sistema altera só esse campo e responde `200`

#### Scenario: Nome fantasia apagado

- **WHEN** o administrador envia o nome fantasia vazio
- **THEN** o nome fantasia volta a `null`, e as telas públicas passam a mostrar a razão social

#### Scenario: CNPJ na edição

- **WHEN** o administrador envia o CNPJ na edição
- **THEN** o sistema responde `400` e não altera nada

#### Scenario: E-mail institucional de uma instituição do outro tipo

- **WHEN** o administrador troca o e-mail institucional de uma entidade pelo de um estabelecimento
- **THEN** o sistema responde `409` com `code: INSTITUTION_DATA_ALREADY_REGISTERED` e `fields` contendo
  `institutionalEmail`, sem alterar nada

#### Scenario: Troca de imagem

- **WHEN** o administrador envia uma imagem nova válida
- **THEN** a resposta traz a URL da imagem nova, e a anterior deixa de existir no armazenamento

#### Scenario: Edição de instituição excluída

- **WHEN** o administrador corrige a descrição de um estabelecimento excluído logicamente, sem enviar `deleted`
- **THEN** a descrição muda e o estabelecimento continua excluído

### Requirement: Exclusão lógica pelo campo deletado

Quando o administrador envia `deleted = true` para uma instituição não excluída, o sistema SHALL exigir
`cancellationReasonId` de um motivo de cancelamento que exista e não seja de sistema; sem ele, com motivo inexistente
ou com motivo de sistema, a resposta SHALL ser `400`, sem alterar nada (RN30, DT49). Com o motivo válido, o sistema
SHALL aplicar, na mesma transação dos demais campos enviados, a exclusão lógica:

- estabelecimento (RN28): pedidos `Pendente` viram `Rejeitado`; pedidos `Em andamento` viram `Cancelado` com o motivo
  escolhido e quem cancelou "administrador", sem devolver quantidade ao estoque; todos os alimentos ficam excluídos
  logicamente; o estabelecimento e o usuário ficam com `deleted = true`; as sessões do usuário são encerradas;
- entidade (RN29): pedidos `Pendente` e `Em andamento` viram `Cancelado` com o motivo escolhido e quem cancelou
  "administrador", e as quantidades dos `Em andamento` voltam ao estoque como num cancelamento comum; os pedidos da
  entidade ficam excluídos logicamente, exceto os `Doado` e `Cancelado` ligados a estabelecimentos não excluídos; a
  entidade e o usuário ficam com `deleted = true`; as sessões do usuário são encerradas.

O sistema SHALL informar antes, por uma consulta de impacto, quantos pedidos `Pendente` e `Em andamento` a exclusão
afetaria. A exclusão SHALL ser segura sob concorrência, como a exclusão da própria conta: nenhum pedido criado, aceito
ou cancelado no meio fica fora das regras, e enviar `deleted = true` para uma instituição que já está excluída SHALL
NOT mudar nenhum pedido nem alimento.

#### Scenario: Consulta do impacto

- **WHEN** um estabelecimento tem 2 pedidos `Pendente` e 1 `Em andamento`, e o administrador consulta o impacto
- **THEN** a resposta traz 2 pendentes e 1 em andamento, sem alterar nada

#### Scenario: Pedido pendente do estabelecimento é rejeitado

- **WHEN** o administrador marca como excluído um estabelecimento com um pedido `Pendente`
- **THEN** o pedido vira `Rejeitado`

#### Scenario: Pedido em andamento do estabelecimento é cancelado

- **WHEN** o administrador marca como excluído, com o motivo "Doação não disponível", um estabelecimento com um pedido
  `Em andamento`
- **THEN** o pedido vira `Cancelado` com esse motivo e com quem cancelou "administrador", e a entidade vê "Nossa equipe
  cancelou este pedido." com o motivo

#### Scenario: Alimentos do estabelecimento saem do ar

- **WHEN** o administrador marca como excluído um estabelecimento com alimentos `Ativo`, `Reservado` e `Inativo`
- **THEN** todos os alimentos ficam excluídos logicamente e somem do feed

#### Scenario: Pedido pendente da entidade é cancelado

- **WHEN** o administrador marca como excluída uma entidade com um pedido `Pendente`
- **THEN** o pedido vira `Cancelado` com o motivo escolhido e quem cancelou "administrador", e o estoque do alimento não
  muda

#### Scenario: Pedido em andamento da entidade devolve o estoque

- **WHEN** o administrador marca como excluída uma entidade com um pedido `Em andamento` de 5 unidades de um alimento
  `Reservado` com estoque 0
- **THEN** o pedido vira `Cancelado`, o alimento volta a `Ativo` com estoque 5, e os pedidos `Pendente` do tipo total
  desse alimento passam a pedir 5

#### Scenario: Histórico da entidade preservado

- **WHEN** o administrador marca como excluída uma entidade com um pedido `Doado` de um estabelecimento ativo
- **THEN** o estabelecimento continua vendo esse pedido

#### Scenario: Sessão encerrada

- **WHEN** a instituição está logada e o administrador a marca como excluída
- **THEN** a próxima requisição da instituição responde `401`, e o login dela passa a ser recusado como credencial
  inválida

#### Scenario: Exclusão sem motivo

- **WHEN** o administrador envia `deleted = true` sem `cancellationReasonId`
- **THEN** o sistema responde `400` e não altera nada

#### Scenario: Motivo de sistema

- **WHEN** o administrador envia `deleted = true` com o motivo "Conta encerrada pela instituição"
- **THEN** o sistema responde `400` e não altera nada

#### Scenario: Instituição já excluída

- **WHEN** a instituição se exclui pelo perfil enquanto o administrador marca a mesma instituição como excluída
- **THEN** as regras de exclusão são aplicadas uma única vez, e a resposta ao administrador mostra a instituição
  excluída

#### Scenario: Falha no meio da exclusão

- **WHEN** a gravação da auditoria falha durante a exclusão pelo campo deletado
- **THEN** nenhum pedido, alimento, sessão ou campo da instituição é alterado

### Requirement: Restauração pelo campo deletado

Quando o administrador envia `deleted = false` para uma instituição excluída logicamente, o sistema SHALL restaurá-la:
a instituição e o usuário voltam a `deleted = false`, e a conta volta a fazer login (DT50). Os alimentos SHALL
continuar excluídos (RN24), e os pedidos SHALL ficar como estão: os cancelados e rejeitados pela exclusão não voltam,
e os pedidos da entidade escondidos pela RN29 continuam escondidos. Enviar `deleted = false` para uma instituição não
excluída SHALL NOT mudar nada. `cancellationReasonId` enviado sem `deleted = true` SHALL ser recusado com `400`.

#### Scenario: Estabelecimento restaurado

- **WHEN** o administrador restaura um estabelecimento que tinha sido excluído com 3 alimentos
- **THEN** o estabelecimento volta a logar e a aparecer na listagem de instituições, e os 3 alimentos continuam
  excluídos

#### Scenario: Pedidos não voltam

- **WHEN** o administrador restaura uma entidade cuja exclusão cancelou um pedido `Em andamento`
- **THEN** o pedido continua `Cancelado`

#### Scenario: Restaurar instituição ativa

- **WHEN** o administrador envia `deleted = false` para uma instituição não excluída
- **THEN** nada muda e nenhuma auditoria de restauração é gravada

### Requirement: Motivos para a exclusão pelo administrador

O sistema SHALL devolver ao administrador, sem paginação e em ordem alfabética, os motivos de cancelamento que ele pode
escolher na exclusão lógica: todos os da lista, menos os de sistema (RN31).

#### Scenario: Motivos de sistema fora

- **WHEN** o administrador consulta os motivos para a exclusão
- **THEN** a resposta não traz "Conta encerrada pela instituição", "Pedido expirado sem resposta" nem "Alimento vencido"

### Requirement: Exclusão permanente de instituição

O sistema SHALL permitir que o administrador exclua permanentemente um estabelecimento ou uma entidade beneficiária,
escolhendo o tipo pela rota, removendo de vez todos os dados ligados à conta (RF45, RF46). A exclusão permanente SHALL
valer só para instituição já excluída logicamente (DT54); instituição com `deleted = false` SHALL ser recusada com
`409` e `code: INSTITUTION_NOT_SOFT_DELETED`, sem apagar nada. Identificador que não é de uma instituição do tipo da
rota SHALL responder `404`.

Numa única operação atômica, o sistema SHALL apagar:

- estabelecimento (RF45): todos os pedidos dos seus alimentos e todos os pedidos em que ele é o estabelecimento, de
  qualquer status e excluídos logicamente ou não; todos os seus alimentos; as sugestões feitas pela conta, de qualquer
  status; o estabelecimento; o endereço; os códigos de confirmação e de recuperação de senha do e-mail pessoal; as
  sessões; e o usuário;
- entidade (RF46): todos os pedidos da entidade, de qualquer status e excluídos logicamente ou não; as sugestões feitas
  pela conta, de qualquer status; a entidade; o endereço; os códigos de confirmação e de recuperação de senha do e-mail
  pessoal; as sessões; e o usuário.

A exclusão permanente SHALL NOT alterar estoque nem status de nenhum alimento de outro estabelecimento. Depois que a
exclusão for gravada, o sistema SHALL apagar do armazenamento a imagem do responsável e, no estabelecimento, as imagens
dos alimentos; falha ao apagar uma imagem SHALL NOT desfazer a exclusão. Se a exclusão falhar, nada SHALL ser apagado,
nem do banco nem do armazenamento. Depois da exclusão, CNPJ, e-mails e celulares da conta SHALL ficar livres para um
novo cadastro. A resposta SHALL ser `204`.

A exclusão permanente SHALL ser segura sob concorrência: uma restauração (DT50) ao mesmo tempo SHALL terminar ou com a
instituição restaurada e a exclusão recusada com `409`, ou com a instituição apagada e a restauração respondendo `404`;
duas exclusões permanentes ao mesmo tempo SHALL terminar com uma `204` e a outra `404`.

#### Scenario: Estabelecimento excluído permanentemente

- **WHEN** o administrador exclui permanentemente um estabelecimento excluído logicamente, com 3 alimentos excluídos e
  4 pedidos `Rejeitado`, `Doado` e `Cancelado`
- **THEN** o sistema responde `204`, e o estabelecimento, o usuário, o endereço, os 3 alimentos e os 4 pedidos deixam
  de existir

#### Scenario: Entidade excluída permanentemente

- **WHEN** o administrador exclui permanentemente uma entidade excluída logicamente, com 2 pedidos `Doado` de um
  estabelecimento ativo
- **THEN** o sistema responde `204`, a entidade, o usuário, o endereço e os 2 pedidos deixam de existir, e o
  estabelecimento deixa de ver esses pedidos

#### Scenario: Alimento do outro lado não muda

- **WHEN** o administrador exclui permanentemente uma entidade cujo pedido `Cancelado` era de um alimento `Ativo` com
  estoque 5
- **THEN** o alimento continua `Ativo` com estoque 5

#### Scenario: Instituição ativa

- **WHEN** o administrador tenta excluir permanentemente um estabelecimento com `deleted = false`
- **THEN** o sistema responde `409` com `code: INSTITUTION_NOT_SOFT_DELETED` e não apaga nada

#### Scenario: Tipo errado na rota

- **WHEN** o administrador chama a exclusão permanente de entidade com o id de um estabelecimento que não existe como
  entidade
- **THEN** o sistema responde `404` e não apaga nada

#### Scenario: Sugestões da conta apagadas

- **WHEN** o administrador exclui permanentemente uma entidade que fez uma sugestão `Pendente` e uma `Aprovada`
- **THEN** as duas sugestões deixam de existir, e a opção criada pela aprovação continua na lista

#### Scenario: Imagens apagadas depois da exclusão

- **WHEN** o administrador exclui permanentemente um estabelecimento com 2 alimentos
- **THEN** a imagem do responsável e as 2 imagens dos alimentos deixam de existir no armazenamento

#### Scenario: Falha no meio da exclusão

- **WHEN** a gravação da auditoria falha durante a exclusão permanente
- **THEN** nenhum registro é apagado e nenhuma imagem é removida do armazenamento

#### Scenario: Dados liberados para novo cadastro

- **WHEN** uma entidade é excluída permanentemente e, depois, alguém se cadastra com o mesmo CNPJ e o mesmo e-mail
  pessoal
- **THEN** o cadastro é aceito

#### Scenario: Conta apagada não loga

- **WHEN** o responsável de uma instituição excluída permanentemente tenta logar
- **THEN** o login é recusado como credencial inválida

#### Scenario: Restauração ao mesmo tempo

- **WHEN** o administrador restaura uma instituição enquanto outro administrador a exclui permanentemente
- **THEN** ou a instituição fica restaurada e a exclusão responde `409`, ou a instituição fica apagada e a restauração
  responde `404`

### Requirement: Auditoria das escritas em instituições

Cada cadastro, edição, exclusão lógica, restauração e exclusão permanente feita pelo administrador SHALL gravar uma
linha de auditoria na mesma transação, com o administrador, a ação, o tipo e o id da instituição e a data/hora (RN46).
A edição SHALL registrar só os campos que mudaram, com o valor anterior e o novo. A exclusão lógica SHALL registrar o
motivo e quantos pedidos foram rejeitados e cancelados. A exclusão permanente SHALL registrar a razão social, o CNPJ e
quantos alimentos, pedidos e sugestões foram apagados, e SHALL NOT registrar nome, e-mail nem celular do responsável
(DT56). A auditoria SHALL NOT conter a senha. Escrita recusada SHALL NOT gerar auditoria. A linha da exclusão
permanente SHALL continuar existindo depois que a instituição deixa de existir.

#### Scenario: Cadastro auditado sem senha

- **WHEN** o administrador cadastra um estabelecimento
- **THEN** uma linha `establishment.create` é gravada com o id do estabelecimento, sem a senha

#### Scenario: Edição auditada

- **WHEN** o administrador troca só a descrição de uma entidade
- **THEN** uma linha `beneficiary_entity.update` registra a descrição anterior e a nova, e nenhum outro campo

#### Scenario: Exclusão e restauração auditadas

- **WHEN** o administrador exclui logicamente um estabelecimento e depois o restaura
- **THEN** ficam gravadas uma linha `establishment.soft_delete`, com o motivo e as contagens, e uma linha
  `establishment.restore`

#### Scenario: Exclusão permanente auditada sem dado pessoal

- **WHEN** o administrador exclui permanentemente uma entidade excluída logicamente com 4 pedidos e 1 sugestão
- **THEN** uma linha `beneficiary_entity.delete` é gravada com o id da entidade, a razão social, o CNPJ, 4 pedidos e
  1 sugestão apagados, sem o nome, o e-mail nem o celular do responsável

#### Scenario: Exclusão permanente recusada não é auditada

- **WHEN** o administrador tenta excluir permanentemente uma instituição ativa
- **THEN** nenhuma linha `*.delete` é gravada

### Requirement: Tela de gestão de instituições

A seção "Instituições" do painel SHALL mostrar a tabela administrativa com busca, ordenação, itens por página, o filtro
de tipo e o filtro de situação, e as colunas: tipo, imagem, nome (nome fantasia ou, sem ele, razão social), CNPJ,
responsável (nome, e-mail pessoal e celular pessoal), cidade/UF, data de cadastro e situação. A situação SHALL mostrar
o selo "Excluída" para `deleted = true` e "Aguardando confirmação" para quem não confirmou o e-mail (DT53). Cada linha
SHALL ter as ações "Ver perfil" e "Editar" e, conforme a situação, "Excluir" (instituição ativa, RF42, RF43) ou
"Excluir permanentemente" (instituição excluída, RF45, RF46, DT54). A seção SHALL ter o botão "Nova instituição". O
estado da busca, dos filtros e da página SHALL ficar no endereço da tela, e SHALL ser mantido depois de uma exclusão.

#### Scenario: Seção mostra a tabela

- **WHEN** o administrador abre a seção "Instituições"
- **THEN** a tela mostra a tabela com estabelecimentos e entidades e os dados do responsável em cada linha

#### Scenario: Selos de situação

- **WHEN** a listagem tem uma entidade excluída e um estabelecimento que não confirmou o e-mail
- **THEN** a linha da entidade mostra "Excluída" e a do estabelecimento mostra "Aguardando confirmação"

#### Scenario: Filtro mantido ao recarregar

- **WHEN** o administrador filtra por estabelecimentos excluídos e recarrega a página
- **THEN** a tabela continua com os dois filtros aplicados

#### Scenario: Ações conforme a situação

- **WHEN** a listagem tem um estabelecimento ativo e uma entidade excluída
- **THEN** a linha do estabelecimento oferece "Excluir" e não "Excluir permanentemente", e a da entidade oferece
  "Excluir permanentemente" e não "Excluir"

#### Scenario: Filtro mantido depois da exclusão

- **WHEN** o administrador filtra por excluídas e exclui permanentemente uma instituição pela linha
- **THEN** a tabela continua filtrada por excluídas, sem a instituição apagada

### Requirement: Tela de cadastro de instituição

A tela "Nova instituição" SHALL pedir primeiro o tipo (estabelecimento ou entidade beneficiária) e, depois, num único
formulário, os dados do responsável (nome, e-mail pessoal, celular pessoal, senha e confirmação da senha), os dados
institucionais, o endereço e a imagem, com as mesmas máscaras do cadastro público, o preenchimento do endereço pelo CEP
e a cidade escolhida a partir da UF. Ao concluir, a tela SHALL avisar que a instituição recebeu um código no e-mail
pessoal, só entra depois de confirmar e é apagada se não confirmar em 24 horas, e SHALL levar ao perfil completo da
instituição criada. Dados duplicados SHALL aparecer nos campos que colidiram; termos proibidos, nos campos recusados.

#### Scenario: Cadastro pela tela

- **WHEN** o administrador escolhe "Entidade beneficiária", preenche todos os campos e envia
- **THEN** a tela mostra o aviso do código e das 24 horas e abre o perfil da entidade criada

#### Scenario: Senhas diferentes

- **WHEN** a confirmação da senha não bate com a senha
- **THEN** o formulário não é enviado e o erro aparece no campo de confirmação

#### Scenario: CNPJ repetido na tela

- **WHEN** o servidor responde que o CNPJ já está cadastrado
- **THEN** o erro aparece no campo CNPJ e os dados digitados continuam no formulário

### Requirement: Tela de perfil completo da instituição

A tela de perfil completo SHALL mostrar, somente leitura, em blocos separados: dados institucionais (com a imagem),
dados do responsável, endereço, situação (data de cadastro, excluída ou ativa, e-mail confirmado ou não), os
indicadores de atividade e as tabelas paginadas de alimentos (só estabelecimento) e de pedidos, com o status de cada
um. A tela SHALL ter a ação "Editar" e, conforme a situação, "Excluir" (instituição ativa, RF42, RF43) ou "Excluir
permanentemente" (instituição excluída, RF45, RF46, DT54). Os nomes de status SHALL ser os de `docs/REQUISITOS.md`.
Perfil de instituição que deixou de existir SHALL mostrar que a instituição não foi encontrada, com o caminho de volta
para a listagem.

#### Scenario: Perfil do estabelecimento

- **WHEN** o administrador abre o perfil de um estabelecimento
- **THEN** a tela mostra os blocos, os indicadores de alimentos e de pedidos recebidos e as duas tabelas

#### Scenario: Perfil da entidade

- **WHEN** o administrador abre o perfil de uma entidade
- **THEN** a tela mostra os indicadores de pedidos feitos e a tabela de pedidos, sem bloco de alimentos

#### Scenario: Ações do perfil conforme a situação

- **WHEN** o administrador abre o perfil de uma entidade excluída logicamente
- **THEN** a tela oferece "Editar" e "Excluir permanentemente", e não oferece "Excluir"

#### Scenario: Perfil de instituição apagada

- **WHEN** o administrador abre o endereço do perfil de uma instituição excluída permanentemente
- **THEN** a tela mostra que a instituição não foi encontrada e oferece voltar para a listagem

### Requirement: Tela de edição de instituição

A tela de edição SHALL mostrar os campos editáveis do RF44 já preenchidos, com e-mail pessoal, CNPJ e razão social
visíveis e somente leitura, e SHALL enviar só o que mudou, com "Salvar" desabilitado sem mudança. O bloco "Situação da
conta" SHALL oferecer, para instituição ativa, "Excluir logicamente", que mostra quantos pedidos pendentes serão
rejeitados ou cancelados e quantos em andamento serão cancelados, e exige escolher o motivo antes de salvar; para
instituição excluída, "Restaurar", que avisa que os alimentos continuam excluídos e os pedidos não voltam. Ao salvar,
a tela SHALL mostrar a mensagem de sucesso e voltar ao perfil completo.

#### Scenario: Salvar sem mudança

- **WHEN** o administrador abre a edição e não altera nada
- **THEN** o botão "Salvar" fica desabilitado

#### Scenario: Excluir logicamente pela tela

- **WHEN** o administrador marca "Excluir logicamente" num estabelecimento com 2 pedidos pendentes e 1 em andamento
- **THEN** a tela mostra que 2 pedidos serão rejeitados e 1 cancelado, e só deixa salvar depois de escolhido o motivo

#### Scenario: Restaurar pela tela

- **WHEN** o administrador marca "Restaurar" numa entidade excluída e salva
- **THEN** a tela avisa que os pedidos não voltam, mostra a mensagem de sucesso e o perfil passa a mostrar a entidade
  como ativa

#### Scenario: Celular duplicado na tela

- **WHEN** o servidor responde que o celular institucional já está cadastrado
- **THEN** o erro aparece no campo de celular institucional e nada é alterado

### Requirement: Ação de exclusão lógica na listagem e no perfil

A tela de gestão de instituições e a tela de perfil completo SHALL oferecer, para instituição com `deleted = false`, a
ação "Excluir" (RF42, RF43), que abre um diálogo com a mesma exclusão lógica da edição (DT49). O diálogo SHALL mostrar,
antes de confirmar, o impacto: para estabelecimento, quantos pedidos pendentes serão rejeitados e quantos em andamento
serão cancelados; para entidade, quantos pedidos pendentes e em andamento serão cancelados. O diálogo SHALL exigir a
escolha de um motivo da lista de motivos do administrador (sem os de sistema) antes de liberar a confirmação. Ao
concluir, a tela SHALL mostrar a mensagem de sucesso e passar a mostrar a instituição como excluída. Se a instituição
já tiver sido excluída por outro caminho, a tela SHALL mostrá-la como excluída, sem erro.

#### Scenario: Excluir pela listagem

- **WHEN** o administrador clica em "Excluir" na linha de um estabelecimento ativo com 2 pedidos pendentes e 1 em
  andamento
- **THEN** o diálogo mostra que 2 pedidos serão rejeitados e 1 cancelado, e o botão de confirmar só fica habilitado
  depois de escolhido o motivo

#### Scenario: Exclusão concluída

- **WHEN** o administrador escolhe o motivo e confirma a exclusão de uma entidade pelo perfil completo
- **THEN** a tela mostra a mensagem de sucesso e o perfil passa a mostrar a entidade como excluída

#### Scenario: Instituição excluída não tem a ação

- **WHEN** o administrador vê a linha de uma instituição excluída logicamente
- **THEN** a linha não oferece "Excluir"

### Requirement: Diálogo de exclusão permanente

A tela de gestão de instituições e a tela de perfil completo SHALL oferecer, só para instituição com `deleted = true`,
a ação "Excluir permanentemente" (RF45, RF46, DT54). A ação abre um diálogo que SHALL mostrar o nome da instituição, um
alerta de que a operação é irreversível e quanto será apagado: para estabelecimento, a quantidade de alimentos e de
pedidos; para entidade, a quantidade de pedidos. O botão de confirmar SHALL ficar desabilitado até o administrador
digitar "EXCLUIR" no campo de confirmação (DT55). Ao concluir, a tela SHALL mostrar a mensagem de sucesso e voltar para
a listagem de instituições. Se o servidor recusar porque a instituição foi restaurada no meio, o diálogo SHALL mostrar
a mensagem do erro e não fechar.

#### Scenario: Confirmação digitada

- **WHEN** o administrador abre "Excluir permanentemente" num estabelecimento excluído e digita "excluir" em minúsculas
- **THEN** o botão de confirmar continua desabilitado até o texto ser "EXCLUIR"

#### Scenario: Contagens no diálogo

- **WHEN** o administrador abre "Excluir permanentemente" num estabelecimento excluído com 3 alimentos e 5 pedidos
- **THEN** o diálogo avisa que a ação não pode ser desfeita e que 3 alimentos e 5 pedidos serão apagados

#### Scenario: Exclusão permanente concluída pelo perfil

- **WHEN** o administrador digita "EXCLUIR" e confirma no perfil completo de uma entidade excluída
- **THEN** a tela mostra a mensagem de sucesso, volta para a listagem e a entidade não aparece mais nela

#### Scenario: Instituição ativa não tem a ação

- **WHEN** o administrador vê a linha ou o perfil de uma instituição com `deleted = false`
- **THEN** a ação "Excluir permanentemente" não aparece

#### Scenario: Instituição restaurada no meio

- **WHEN** o servidor responde `409` com `code: INSTITUTION_NOT_SOFT_DELETED` à confirmação
- **THEN** o diálogo mostra que a instituição não está mais excluída e continua aberto
