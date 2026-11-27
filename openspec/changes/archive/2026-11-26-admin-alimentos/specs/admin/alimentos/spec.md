## Purpose

Permitir que o administrador gerencie pelo painel os alimentos de todos os estabelecimentos: listar com filtros e
busca, ver o detalhe completo com destaque para estabelecimento excluído, editar os campos do cadastro com os efeitos
nos pedidos pendentes e excluir permanentemente, com toda escrita auditada (RF50–RF53, RN20, RN46, DT57–DT60).

## ADDED Requirements

### Requirement: Acesso exclusivo do administrador às rotas de alimentos

As rotas `/admin/foods/...`, `/admin/food-items/options` e `/admin/measurement-units/options` SHALL exigir sessão de
um usuário com o papel "Administrator". Sem sessão, a resposta SHALL ser `401`. Com sessão de estabelecimento ou
entidade, a resposta SHALL ser `403` com `code: ROLE_NOT_ALLOWED`. As duas rotas `options` SHALL listar, sem paginação,
todos os itens do catálogo (com a categoria) e todas as unidades de medida (com a indicação de fração), para os selects
da edição, porque as listas de `/catalog/...` são só das instituições.

#### Scenario: Estabelecimento tenta listar pelo painel

- **WHEN** um estabelecimento autenticado chama `GET /admin/foods`
- **THEN** o sistema responde `403` com `code: ROLE_NOT_ALLOWED`

#### Scenario: Selects da edição pelo painel

- **WHEN** o administrador chama `GET /admin/measurement-units/options`
- **THEN** o sistema responde `200` com todas as unidades, cada uma com nome, sigla e se aceita fração

#### Scenario: Exclusão sem sessão

- **WHEN** uma requisição sem sessão chama `DELETE /admin/foods/1`
- **THEN** o sistema responde `401` e não apaga nada

### Requirement: Listagem de alimentos no painel

O sistema SHALL listar todos os alimentos cadastrados, de qualquer estabelecimento e em qualquer status (`Ativo`,
`Reservado` ou `Inativo`), incluindo os excluídos logicamente e os vencidos ou com quantidade zero, de forma paginada
(`page` e `pageSize`, que aceita 10, 20, 50 ou 100, com padrão 10; resposta `{ data, total, page, pageSize }`) (RF52,
DT23, DT60). Cada linha SHALL trazer o identificador, a URL da imagem, o nome e a categoria (do item do catálogo), a
quantidade, a unidade de medida (nome e sigla), o tipo de solicitação, o status, se o alimento está excluído
(`deleted`), o identificador e o nome público do estabelecimento (nome fantasia ou, sem ele, razão social), a razão
social, se o estabelecimento está excluído, a data de vencimento e a data de publicação.

A listagem SHALL aceitar o filtro de status (um dos três status) e o filtro de situação (ativos ou excluídos); sem o
filtro de situação, SHALL trazer os dois (DT60). A busca SHALL ser um único termo, que casa sem diferenciar maiúsculas
nem acentos qualquer trecho de: nome do alimento, categoria, razão social e nome fantasia do estabelecimento. As datas
de vencimento e de publicação SHALL casar no formato `dd/mm/aaaa`, completo ou parcial, contadas no fuso de Brasília.

A ordenação SHALL aceitar nome, categoria, quantidade, status, estabelecimento, data de vencimento e data de publicação
(`sort` e `order` `asc` ou `desc`); sem `sort`, a ordem SHALL ser pela data de publicação mais recente primeiro. Campo
de ordenação, status ou situação fora dos permitidos SHALL ser rejeitado com `400`.

#### Scenario: Todos os status e os excluídos na mesma listagem

- **WHEN** existem um alimento `Ativo`, um `Reservado`, um `Inativo` e um excluído logicamente e o administrador lista
  sem filtro
- **THEN** a resposta traz os 4 alimentos e `total` 4, e o excluído vem com `deleted = true`

#### Scenario: Alimento vencido aparece no painel

- **WHEN** um alimento `Ativo` tem a data de vencimento no passado
- **THEN** ele aparece na listagem do painel, embora não apareça no feed

#### Scenario: Filtro por status

- **WHEN** o administrador lista com o filtro de status `Reservado`
- **THEN** a resposta traz só alimentos com status `Reservado`

#### Scenario: Filtro de excluídos

- **WHEN** o administrador lista com o filtro de situação "excluídos"
- **THEN** a resposta traz só alimentos com `deleted = true`

#### Scenario: Busca pelo estabelecimento sem acento

- **WHEN** um alimento pertence ao estabelecimento de nome fantasia "Padaria São José" e o administrador busca
  "padaria sao jose"
- **THEN** o alimento aparece na resposta

#### Scenario: Busca pela categoria

- **WHEN** um alimento é do item do catálogo "Arroz, integral", da categoria "Grãos e cereais", e o administrador busca
  "graos"
- **THEN** o alimento aparece na resposta

#### Scenario: Busca pela data de publicação

- **WHEN** um alimento foi publicado em 05/11/2026 às 22h no horário de Brasília e o administrador busca "05/11"
- **THEN** o alimento aparece na resposta

#### Scenario: Estabelecimento excluído indicado na linha

- **WHEN** o estabelecimento de um alimento foi excluído logicamente
- **THEN** a linha do alimento vem com o estabelecimento marcado como excluído

#### Scenario: Ordem padrão

- **WHEN** o administrador lista sem `sort`
- **THEN** os alimentos vêm do publicado mais recentemente para o mais antigo

#### Scenario: Status inválido

- **WHEN** o administrador lista com o filtro de status `Revisar`
- **THEN** o sistema responde `400`

### Requirement: Detalhe do alimento no painel

O sistema SHALL devolver o detalhe de qualquer alimento cadastrado, independentemente do status, de estar excluído
logicamente e da situação do estabelecimento (RF53). O detalhe SHALL trazer: a URL da imagem, o nome e a categoria, o
identificador do item do catálogo, a quantidade, a unidade de medida (identificador, nome, sigla e se aceita fração), o
tipo de solicitação, a descrição, as observações, a data de vencimento, a data de publicação, o status, o campo
deletado do alimento, o identificador, o nome público, a razão social e o campo deletado do estabelecimento, e a
quantidade de pedidos do alimento por status (`Pendente`, `Em andamento`, `Rejeitado`, `Doado` e `Cancelado`),
contando também os excluídos logicamente. Alimento inexistente SHALL responder `404`.

#### Scenario: Detalhe de alimento de estabelecimento excluído

- **WHEN** o administrador abre o detalhe de um alimento cujo estabelecimento foi excluído logicamente
- **THEN** a resposta traz os dados do alimento, com o alimento e o estabelecimento marcados como excluídos (RN28)

#### Scenario: Detalhe de alimento reservado

- **WHEN** o administrador abre o detalhe de um alimento `Reservado` com estoque 0 e um pedido `Em andamento`
- **THEN** a resposta traz o status `Reservado`, a quantidade 0 e a contagem de 1 pedido `Em andamento`

#### Scenario: Alimento inexistente

- **WHEN** o administrador abre o detalhe de um id que não existe
- **THEN** o sistema responde `404`

### Requirement: Edição de alimento pelo administrador

O administrador SHALL poder editar qualquer combinação dos campos do RF50: imagem, item do catálogo, quantidade,
unidade de medida, tipo de solicitação, descrição, observações, data de vencimento e data de publicação. Só os campos
enviados mudam. A edição SHALL valer só para alimento `Ativo`, não excluído e sem pedido `Em andamento` (DT57):

- alimento excluído logicamente SHALL ser recusado com `409` e `code: FOOD_DELETED`;
- alimento `Reservado` ou `Inativo` SHALL ser recusado com `409` e `code: FOOD_NOT_ACTIVE`;
- alimento com pedido `Em andamento` SHALL ser recusado com `409` e `code: FOOD_HAS_ORDERS_IN_PROGRESS`.

A edição SHALL validar:

- o item do catálogo e a unidade de medida existentes (`400` com `code: INVALID_CATALOG_ITEM` ou
  `INVALID_MEASUREMENT_UNIT`);
- a quantidade final contra a unidade e o tipo de solicitação finais, mesmo quando só a unidade ou o tipo mudam:
  quantidade fracionada em unidade sem fração SHALL ser recusada com `400` e `code: FRACTION_NOT_ALLOWED`, e quantidade
  que não permite pedido parcial em "Somente parcial" com `400` e `code: PARTIAL_ONLY_QUANTITY_TOO_LOW` (RN03, DT21);
- a quantidade maior que 0 e no máximo 99.999.999,99, com até 2 casas decimais;
- a data de vencimento, quando alterada, não anterior à data atual (`400` com `code: EXPIRATION_DATE_IN_PAST`, DT26);
- a data de publicação, quando alterada, não posterior à data atual no fuso de Brasília (`400` com
  `code: PUBLISHED_AT_IN_FUTURE`);
- a descrição e as observações pela validação de textos livres (`400` com `code: PROHIBITED_CONTENT` e `fields`, DT24);
  a descrição não pode ficar vazia; as observações podem ser apagadas e voltam a ficar vazias;
- a imagem, quando enviada, pelas regras da RN41.

Edição recusada SHALL NOT alterar o alimento nem os pedidos. A edição SHALL NOT alterar o status do alimento, o
estabelecimento dono nem o campo deletado. A resposta de sucesso SHALL trazer o detalhe atualizado.

#### Scenario: Correção do item do catálogo e da descrição

- **WHEN** o administrador troca o item do catálogo e a descrição de um alimento `Ativo` sem pedidos
- **THEN** o alimento passa a ter o novo nome e a nova categoria e a nova descrição, e continua `Ativo`

#### Scenario: Alimento reservado não é editável

- **WHEN** o administrador tenta editar um alimento `Reservado`
- **THEN** o sistema responde `409` com `code: FOOD_NOT_ACTIVE` e nada muda

#### Scenario: Alimento inativo não é editável

- **WHEN** o administrador tenta editar um alimento `Inativo`
- **THEN** o sistema responde `409` com `code: FOOD_NOT_ACTIVE` e nada muda

#### Scenario: Alimento com pedido em andamento não é editável

- **WHEN** o administrador tenta editar um alimento `Ativo` com um pedido `Em andamento`
- **THEN** o sistema responde `409` com `code: FOOD_HAS_ORDERS_IN_PROGRESS` e nada muda

#### Scenario: Alimento excluído não é editável

- **WHEN** o administrador tenta editar um alimento excluído logicamente
- **THEN** o sistema responde `409` com `code: FOOD_DELETED` e nada muda

#### Scenario: Troca de unidade incompatível com a quantidade

- **WHEN** um alimento tem 2,5 kg e o administrador troca só a unidade para uma que não aceita fração
- **THEN** o sistema responde `400` com `code: FRACTION_NOT_ALLOWED` e nada muda

#### Scenario: Troca para "Somente parcial" com quantidade baixa

- **WHEN** um alimento tem 1 unidade e o administrador troca o tipo de solicitação para "Somente parcial"
- **THEN** o sistema responde `400` com `code: PARTIAL_ONLY_QUANTITY_TOO_LOW` e nada muda

#### Scenario: Data de publicação no futuro

- **WHEN** o administrador altera a data de publicação para o dia seguinte
- **THEN** o sistema responde `400` com `code: PUBLISHED_AT_IN_FUTURE` e nada muda

#### Scenario: Data de publicação no passado

- **WHEN** o administrador altera a data de publicação para 01/11/2026
- **THEN** o alimento passa a ter a publicação em 01/11/2026 no fuso de Brasília

#### Scenario: Alimento vencido com só a descrição corrigida

- **WHEN** um alimento `Ativo` tem a data de vencimento no passado e o administrador altera só a descrição
- **THEN** a edição é aceita, sem recusar a data de vencimento que não foi enviada

#### Scenario: Termo proibido nas observações

- **WHEN** o administrador envia observações com um termo da lista de termos proibidos
- **THEN** o sistema responde `400` com `code: PROHIBITED_CONTENT` e `fields` contendo `notes`

#### Scenario: Observações apagadas

- **WHEN** o administrador envia as observações vazias para um alimento que tinha observações
- **THEN** o alimento passa a não ter observações

#### Scenario: Troca da imagem

- **WHEN** o administrador envia uma nova imagem válida para um alimento
- **THEN** o alimento passa a ter a nova imagem e a anterior deixa de existir no armazenamento

#### Scenario: Edição recusada mantém a imagem anterior

- **WHEN** o administrador envia uma nova imagem junto com uma quantidade inválida
- **THEN** o sistema responde `400`, o alimento continua com a imagem anterior e a nova não fica no armazenamento

### Requirement: Efeitos da edição do administrador nos pedidos pendentes

A edição pelo administrador SHALL aplicar, na mesma transação, estes efeitos nos pedidos `Pendente` do alimento, nesta
ordem (DT58, RN20):

1. Se o item do catálogo ou a unidade de medida mudou, todos os pedidos `Pendente` SHALL passar a `Rejeitado`.
2. Senão, se o tipo de solicitação mudou para "Somente total", os pedidos `Pendente` do tipo parcial SHALL passar a
   `Rejeitado`; se mudou para "Somente parcial", os do tipo total SHALL passar a `Rejeitado`; se mudou para "Total ou
   parcial", nenhum pedido muda por causa do tipo.
3. Se a quantidade mudou, os pedidos `Pendente` que sobraram SHALL seguir a RN20: os do tipo total passam a pedir a
   nova quantidade e registram a data da alteração; os do tipo parcial com quantidade maior que a nova quantidade
   passam a `Rejeitado`; os demais continuam como estão.

Pedidos em outros status SHALL NOT mudar. A rejeição SHALL NOT ter motivo (RN10).

#### Scenario: Troca do item do catálogo rejeita todos os pendentes

- **WHEN** um alimento tem 2 pedidos `Pendente`, um total e um parcial, e o administrador troca o item do catálogo
- **THEN** os 2 pedidos passam a `Rejeitado`

#### Scenario: Troca da unidade rejeita todos os pendentes

- **WHEN** um alimento tem 3 pedidos `Pendente` e o administrador troca a unidade de medida
- **THEN** os 3 pedidos passam a `Rejeitado`

#### Scenario: Troca para "Somente total" rejeita os parciais

- **WHEN** um alimento "Total ou parcial" tem um pedido `Pendente` total e um parcial e o administrador troca o tipo
  para "Somente total"
- **THEN** o pedido parcial passa a `Rejeitado` e o total continua `Pendente`

#### Scenario: Troca para "Somente parcial" rejeita os totais

- **WHEN** um alimento "Total ou parcial" com 10 unidades tem um pedido `Pendente` total e um parcial de 3 e o
  administrador troca o tipo para "Somente parcial"
- **THEN** o pedido total passa a `Rejeitado` e o parcial continua `Pendente`

#### Scenario: Troca para "Total ou parcial" não rejeita

- **WHEN** um alimento "Somente total" tem um pedido `Pendente` total e o administrador troca o tipo para "Total ou
  parcial"
- **THEN** o pedido continua `Pendente`, com a mesma quantidade

#### Scenario: Nova quantidade atualiza o pedido total

- **WHEN** um alimento com estoque 5 tem um pedido `Pendente` total de 5 e o administrador muda a quantidade para 6
- **THEN** o pedido passa a pedir 6 e registra a data da alteração

#### Scenario: Nova quantidade rejeita o parcial que não cabe

- **WHEN** um alimento com estoque 5 tem pedidos `Pendente` parciais de 3 e de 5 e o administrador muda a quantidade
  para 4
- **THEN** o pedido de 5 passa a `Rejeitado` e o de 3 continua `Pendente`

#### Scenario: Tipo e quantidade mudam juntos

- **WHEN** um alimento "Total ou parcial" com estoque 10 tem um pedido `Pendente` total de 10 e um parcial de 8, e o
  administrador troca o tipo para "Somente total" e a quantidade para 12
- **THEN** o pedido parcial passa a `Rejeitado` e o total passa a pedir 12, com a data da alteração

#### Scenario: Pedidos finalizados não mudam

- **WHEN** um alimento tem um pedido `Doado` e um `Cancelado` e o administrador troca o item do catálogo
- **THEN** os dois pedidos continuam com o mesmo status e a mesma quantidade

### Requirement: Prévia dos efeitos da edição

O sistema SHALL informar, para os valores pretendidos de item do catálogo, unidade de medida, tipo de solicitação e
quantidade de um alimento, quantos pedidos `Pendente` terão a quantidade atualizada e quantos serão rejeitados pela
edição, pelas mesmas regras dos efeitos da edição, sem alterar nada. Valores omitidos SHALL valer como os atuais.
Alimento inexistente SHALL responder `404`.

#### Scenario: Prévia de troca de unidade

- **WHEN** um alimento tem 3 pedidos `Pendente` e o administrador pede a prévia com outra unidade de medida
- **THEN** a resposta informa 0 pedidos atualizados e 3 rejeitados, e os pedidos continuam `Pendente`

#### Scenario: Prévia sem mudança

- **WHEN** o administrador pede a prévia com os mesmos valores atuais do alimento
- **THEN** a resposta informa 0 pedidos atualizados e 0 rejeitados

### Requirement: Exclusão permanente de alimento

O administrador SHALL poder excluir permanentemente qualquer alimento, em qualquer status, excluído logicamente ou não,
inclusive com pedidos `Pendente` ou `Em andamento` (RF51, DT59). A exclusão SHALL apagar, numa única operação, todos os
pedidos do alimento, em qualquer status e excluídos logicamente ou não, e o próprio alimento, e SHALL responder `204`.
A imagem do alimento SHALL deixar de existir no armazenamento depois que a exclusão for concluída; falha ao remover a
imagem SHALL NOT desfazer a exclusão. Se a exclusão falhar, nada SHALL ser apagado, nem a imagem. Pedido apagado SHALL
NOT devolver quantidade a nenhum estoque. Alimento inexistente SHALL responder `404`.

#### Scenario: Alimento com pedidos de vários status

- **WHEN** o administrador exclui permanentemente um alimento com um pedido `Pendente`, um `Em andamento` e um `Doado`
- **THEN** o sistema responde `204`, o alimento e os 3 pedidos deixam de existir e a imagem é removida do
  armazenamento

#### Scenario: Pedidos apagados deixam de contar no limite da entidade

- **WHEN** uma entidade tinha um pedido `Pendente` do alimento excluído permanentemente
- **THEN** o pedido deixa de existir e não conta mais nos pedidos em aberto da entidade (RN04, RN05)

#### Scenario: Alimento excluído logicamente

- **WHEN** o administrador exclui permanentemente um alimento já excluído logicamente pelo estabelecimento
- **THEN** o sistema responde `204` e o alimento deixa de existir

#### Scenario: Duas exclusões ao mesmo tempo

- **WHEN** duas requisições de exclusão permanente do mesmo alimento chegam ao mesmo tempo
- **THEN** uma responde `204` e a outra `404`, sem erro `500`

#### Scenario: Falha na exclusão

- **WHEN** a gravação da auditoria falha durante a exclusão permanente
- **THEN** o alimento e os pedidos continuam existindo e a imagem não é removida

#### Scenario: Alimento inexistente

- **WHEN** o administrador exclui permanentemente um id que não existe
- **THEN** o sistema responde `404`

### Requirement: Auditoria das escritas em alimentos

Cada edição e cada exclusão permanente feita pelo administrador SHALL gravar uma linha de auditoria na mesma
transação, com o administrador, a ação, o tipo `Food` e o id do alimento e a data/hora (RN46). A edição (`food.update`)
SHALL registrar só os campos que mudaram, com o valor anterior e o novo, e quantos pedidos tiveram a quantidade
atualizada e quantos foram rejeitados. A exclusão permanente (`food.delete`) SHALL registrar o nome do alimento, o id e
a razão social do estabelecimento e quantos pedidos de cada status foram apagados. Escrita recusada SHALL NOT gerar
auditoria. A linha da exclusão permanente SHALL continuar existindo depois que o alimento deixa de existir.

#### Scenario: Edição auditada

- **WHEN** o administrador troca só a quantidade de um alimento de 5 para 4, rejeitando 1 pedido parcial
- **THEN** uma linha `food.update` registra a quantidade anterior e a nova, nenhum outro campo, e 1 pedido rejeitado

#### Scenario: Exclusão permanente auditada

- **WHEN** o administrador exclui permanentemente um alimento com 2 pedidos `Doado` e 1 `Pendente`
- **THEN** uma linha `food.delete` é gravada com o nome do alimento, o estabelecimento e as contagens de 2 `Doado` e
  1 `Pendente`

#### Scenario: Edição recusada não é auditada

- **WHEN** o administrador tenta editar um alimento `Inativo`
- **THEN** nenhuma linha `food.update` é gravada

### Requirement: Tela de gestão de alimentos

A seção "Alimentos" do painel SHALL mostrar a tabela administrativa com busca, ordenação, itens por página, o filtro de
status e o filtro de situação, e as colunas: imagem, nome, categoria, quantidade com a sigla da unidade, tipo de
solicitação, status, estabelecimento, data de vencimento, data de publicação e situação. A situação SHALL mostrar o selo
"Excluído" para alimento com `deleted = true`. O estabelecimento excluído SHALL aparecer destacado na coluna do
estabelecimento, com a indicação "Estabelecimento excluído" (RF53). Cada linha SHALL ter as ações "Ver", "Editar" (só
para alimento `Ativo`, não excluído e sem pedido `Em andamento`) e "Excluir permanentemente". O estado da busca, dos
filtros e da página SHALL ficar no endereço da tela, e SHALL ser mantido depois de uma exclusão.

#### Scenario: Seção mostra a tabela

- **WHEN** o administrador abre a seção "Alimentos"
- **THEN** a tela mostra a tabela com os alimentos de todos os estabelecimentos

#### Scenario: Selos e destaque

- **WHEN** a listagem tem um alimento excluído e um alimento de estabelecimento excluído
- **THEN** a linha do primeiro mostra "Excluído" e a do segundo mostra o estabelecimento destacado com "Estabelecimento
  excluído"

#### Scenario: Ação "Editar" só quando permitida

- **WHEN** a listagem tem um alimento `Ativo` sem pedido em andamento e um alimento `Inativo`
- **THEN** a linha do primeiro oferece "Editar" e a do segundo não

#### Scenario: Filtro mantido ao recarregar

- **WHEN** o administrador filtra por status `Inativo` e situação "excluídos" e recarrega a página
- **THEN** a tabela continua com os dois filtros aplicados

### Requirement: Tela de detalhe do alimento no painel

A tela de detalhe (`/admin/alimentos/:id`) SHALL mostrar a imagem, o nome, a categoria, a quantidade com a unidade, o
tipo de solicitação, a descrição, as observações, as datas de vencimento e de publicação, o status, o nome do
estabelecimento e o campo deletado do estabelecimento, além da quantidade de pedidos por status. Quando o
estabelecimento estiver excluído, a tela SHALL mostrar um aviso destacado no topo; quando o próprio alimento estiver
excluído, SHALL mostrar o selo "Excluído". A tela SHALL oferecer "Editar" (só quando a edição é permitida) e "Excluir
permanentemente". Alimento inexistente SHALL mostrar "Alimento não encontrado" com link para a listagem.

#### Scenario: Aviso de estabelecimento excluído

- **WHEN** o administrador abre o detalhe de um alimento de estabelecimento excluído
- **THEN** a tela mostra no topo o aviso destacado de que o estabelecimento foi excluído

#### Scenario: Alimento apagado

- **WHEN** o administrador abre o detalhe de um alimento que não existe mais
- **THEN** a tela mostra "Alimento não encontrado" com link para a listagem de alimentos

### Requirement: Tela de edição do alimento no painel

A tela de edição (`/admin/alimentos/:id/editar`) SHALL trazer preenchidos os campos do RF50: imagem (com troca
opcional), item do catálogo e unidade de medida (selects com busca nas listas padronizadas), quantidade, tipo de
solicitação, descrição, observações, data de vencimento e data de publicação. A tela SHALL validar no preenchimento as
mesmas regras do servidor que dependem só do formulário (campos obrigatórios, fração pela unidade escolhida, quantidade
mínima de "Somente parcial", datas). Antes de salvar, se a prévia indicar pedidos `Pendente` atualizados ou
rejeitados, a tela SHALL mostrar um diálogo de confirmação com as contagens; sem pedidos afetados, SHALL salvar direto.
Ao concluir, a tela SHALL mostrar a mensagem de sucesso e voltar para o detalhe do alimento. Recusas do servidor SHALL
aparecer pela `code`: termo proibido no campo correspondente e as demais numa mensagem na tela, sem perder o que foi
preenchido. Abrir a edição de um alimento que não pode ser editado SHALL mostrar o motivo e o link para o detalhe, sem
o formulário.

#### Scenario: Confirmação com pedidos afetados

- **WHEN** o administrador troca a unidade de um alimento com 2 pedidos `Pendente` e clica em salvar
- **THEN** a tela mostra um diálogo avisando que 2 pedidos serão rejeitados e só salva depois da confirmação

#### Scenario: Edição sem pedidos afetados

- **WHEN** o administrador troca só a descrição de um alimento e clica em salvar
- **THEN** a tela salva sem diálogo, mostra a mensagem de sucesso e abre o detalhe do alimento

#### Scenario: Alimento ficou não editável no meio

- **WHEN** o servidor responde `409` com `code: FOOD_HAS_ORDERS_IN_PROGRESS` ao salvar
- **THEN** a tela mostra que o alimento tem pedido em andamento e mantém os valores preenchidos

#### Scenario: Edição de alimento inativo pelo endereço

- **WHEN** o administrador abre direto a edição de um alimento `Inativo`
- **THEN** a tela informa que só alimentos ativos sem pedido em andamento podem ser editados e oferece o link para o
  detalhe

### Requirement: Diálogo de exclusão permanente de alimento

A tela de gestão e a tela de detalhe SHALL oferecer a ação "Excluir permanentemente" para qualquer alimento (RF51,
DT59). A ação abre um diálogo que SHALL mostrar o nome do alimento e o estabelecimento, um alerta de que a operação é
irreversível e quantos pedidos de cada status serão apagados junto. O botão de confirmar SHALL ficar desabilitado até o
administrador digitar "EXCLUIR" no campo de confirmação. Ao concluir, a tela SHALL mostrar a mensagem de sucesso; na
listagem, a tabela SHALL ser atualizada mantendo os filtros; no detalhe, a tela SHALL voltar para a listagem.

#### Scenario: Confirmação digitada

- **WHEN** o administrador abre "Excluir permanentemente" e digita "excluir" em minúsculas
- **THEN** o botão de confirmar continua desabilitado até o texto ser "EXCLUIR"

#### Scenario: Contagens no diálogo

- **WHEN** o administrador abre "Excluir permanentemente" num alimento com 1 pedido `Em andamento` e 2 `Doado`
- **THEN** o diálogo avisa que a ação não pode ser desfeita e que 1 pedido em andamento e 2 doados serão apagados

#### Scenario: Exclusão concluída pelo detalhe

- **WHEN** o administrador digita "EXCLUIR" e confirma no detalhe de um alimento
- **THEN** a tela mostra a mensagem de sucesso, volta para a listagem e o alimento não aparece mais nela
