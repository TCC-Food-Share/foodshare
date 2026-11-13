# pedidos/listagem Specification

## Purpose

Permitir que um estabelecimento ou uma entidade beneficiária autenticada liste os próprios pedidos — recorte pela sessão —, de forma paginada e ordenada da criação mais recente para a mais antiga, com filtro opcional por status, viabilizando o acompanhamento dos pedidos separados por status (RF27).

## Requirements

### Requirement: Listagem dos próprios pedidos pelo solicitante

O sistema SHALL permitir que um usuário autenticado obtenha a listagem dos pedidos vinculados a ele: para um estabelecimento, os pedidos cujo estabelecimento de origem é o dele; para uma entidade beneficiária, os pedidos criados por ela. O recorte SHALL ser resolvido pela sessão, nunca informado pelo cliente. Pedidos de outras instituições NÃO aparecem. Pedidos excluídos logicamente NÃO aparecem. Cada item da listagem traz `id`, `quantity`, `orderDate`, `status`, o alimento vinculado, o estabelecimento de origem, a entidade beneficiária, o motivo do cancelamento (`cancellationReason`, com identificador e nome) e quem cancelou (`cancelledBy`). Os dois últimos SHALL vir preenchidos só nos pedidos "Cancelado", e nulos nos demais.

#### Scenario: Estabelecimento lista seus pedidos

- **WHEN** um estabelecimento autenticado solicita a listagem de pedidos
- **THEN** o sistema retorna os pedidos cujo estabelecimento de origem é o da sessão, e nenhum pedido de outro estabelecimento

#### Scenario: Entidade beneficiária lista seus pedidos

- **WHEN** uma entidade beneficiária autenticada solicita a listagem de pedidos
- **THEN** o sistema retorna os pedidos criados por ela, e nenhum pedido de outra entidade

#### Scenario: Requisição sem autenticação

- **WHEN** a listagem de pedidos é solicitada sem sessão autenticada válida
- **THEN** o sistema nega o acesso e não retorna nenhum pedido

#### Scenario: Conta autenticada não é estabelecimento nem entidade beneficiária

- **WHEN** uma conta que não tem estabelecimento nem entidade beneficiária vinculada solicita a listagem
- **THEN** o sistema responde que não há instituição vinculada e não retorna listagem

#### Scenario: Pedido excluído logicamente não aparece

- **WHEN** o solicitante tem um pedido marcado como excluído logicamente
- **THEN** esse pedido não aparece na listagem

#### Scenario: Pedido cancelado traz motivo e quem cancelou

- **WHEN** a entidade cancelou um pedido com o motivo "Solicitação feita por engano" e o estabelecimento solicita a listagem
- **THEN** o item desse pedido traz o motivo "Solicitação feita por engano" e `cancelledBy` igual a `BENEFICIARY_ENTITY`

#### Scenario: Pedido não cancelado não traz motivo

- **WHEN** o solicitante lista pedidos "Pendente", "Em andamento", "Rejeitado" ou "Doado"
- **THEN** esses itens trazem `cancellationReason` e `cancelledBy` nulos

### Requirement: Filtro opcional por status

O sistema SHALL aceitar um parâmetro opcional `status` que restringe a listagem aos pedidos com aquele status. O valor SHALL ser um dos status de pedido válidos: "Pendente", "Em andamento", "Rejeitado", "Doado" ou "Cancelado". Parâmetro ausente SHALL retornar pedidos de todos os status. Valor fora da lista de status válidos — inclusive os nomes antigos "Aceito" e "Recebido" — SHALL ser rejeitado como parâmetro inválido, sem retornar a listagem.

#### Scenario: Listagem filtrada por status

- **WHEN** o solicitante pede a listagem com `status` igual a "Em andamento"
- **THEN** o sistema retorna apenas os pedidos do solicitante com status "Em andamento"

#### Scenario: Listagem filtrada por "Cancelado"

- **WHEN** o solicitante pede a listagem com `status` igual a "Cancelado"
- **THEN** o sistema aceita o filtro e retorna apenas os pedidos do solicitante com status "Cancelado" (lista vazia e `total` igual a 0 se não houver nenhum)

#### Scenario: Listagem sem filtro de status

- **WHEN** o solicitante pede a listagem sem informar `status`
- **THEN** o sistema retorna os pedidos do solicitante em todos os status

#### Scenario: Status inválido

- **WHEN** o solicitante pede a listagem com `status` igual a um valor que não é um status de pedido válido
- **THEN** o sistema rejeita a requisição informando que o parâmetro é inválido, sem retornar a listagem

#### Scenario: Nome de status do MVP

- **WHEN** o solicitante pede a listagem com `status` igual a "Aceito" ou "Recebido"
- **THEN** o sistema rejeita a requisição informando que o parâmetro é inválido, sem retornar a listagem

#### Scenario: Filtro sem resultados

- **WHEN** o solicitante pede a listagem com um `status` válido para o qual ele não tem nenhum pedido
- **THEN** o sistema retorna uma lista de itens vazia e `total` igual a 0, sem erro

### Requirement: Paginação e ordenação da listagem de pedidos

O sistema SHALL paginar a listagem por meio dos parâmetros `page` (começando em 1) e `pageSize`, que aceita 10, 20, 50 ou 100. Na ausência dos parâmetros, o sistema SHALL usar `page` igual a 1 e `pageSize` igual a 10. Qualquer outro valor de `pageSize` SHALL ser rejeitado. A listagem SHALL ser ordenada da criação do pedido mais recente para a mais antiga. A paginação e a ordenação SHALL ser aplicadas sobre o resultado já filtrado por status, quando houver. A resposta SHALL incluir, além dos itens da página, o total de pedidos que atendem aos critérios aplicados e os valores de `page` e `pageSize` aplicados. A tela SHALL oferecer um select "Itens por página" com os quatro valores; trocar o valor SHALL voltar para a primeira página e manter a escolha no endereço da página.

#### Scenario: Listagem sem parâmetros de paginação

- **WHEN** o solicitante pede a listagem sem informar `page` nem `pageSize`
- **THEN** o sistema retorna a primeira página com até 10 pedidos, e informa `total`, `page` igual a 1 e `pageSize` igual a 10

#### Scenario: Escolha de itens por página

- **WHEN** o solicitante pede a listagem com `pageSize` igual a 100
- **THEN** o sistema retorna até 100 pedidos e informa `pageSize` igual a 100

#### Scenario: pageSize fora dos valores permitidos

- **WHEN** o solicitante pede a listagem com `pageSize` igual a 30
- **THEN** o sistema rejeita a requisição, sem retornar a listagem

#### Scenario: Parâmetro de paginação inválido

- **WHEN** o solicitante pede a listagem com `page` ou `pageSize` não numérico, igual a zero ou negativo
- **THEN** o sistema rejeita a requisição e informa qual parâmetro é inválido, sem retornar a listagem

#### Scenario: Página além do total de resultados

- **WHEN** o `page` solicitado está além da última página com resultados
- **THEN** o sistema retorna uma lista de itens vazia e informa o `total` real, sem erro

#### Scenario: Select de itens por página na tela

- **WHEN** o usuário escolhe 50 no select "Itens por página"
- **THEN** a listagem passa a mostrar até 50 pedidos, volta para a primeira página, e a escolha fica no endereço da página

#### Scenario: Total reflete o filtro de status

- **WHEN** o solicitante tem 12 pedidos "Em andamento" e pede a listagem com `status` igual a "Em andamento" e `pageSize` igual a 10
- **THEN** o sistema retorna 10 itens na primeira página e informa `total` igual a 12

### Requirement: Aba "Cancelado" mostra o motivo e quem cancelou

A tela de listagem de pedidos SHALL mostrar, na aba "Cancelado", o motivo do cancelamento e quem cancelou cada pedido, do ponto de vista de quem está vendo: "Você" quando a própria instituição cancelou, "Estabelecimento" ou "Entidade" quando foi a outra parte. Os valores de quem cancelou reservados a outras changes (administrador e sistema) SHALL ter rótulo próprio, sem citar "administrador" na tela da instituição. As outras abas SHALL NOT mostrar essas informações.

#### Scenario: Entidade vê pedido cancelado pelo estabelecimento

- **WHEN** a entidade abre a aba "Cancelado" e há um pedido cancelado pelo estabelecimento com o motivo "Alimento não está mais disponível"
- **THEN** a linha desse pedido mostra o motivo "Alimento não está mais disponível" e "Estabelecimento" como quem cancelou

#### Scenario: Instituição vê o próprio cancelamento

- **WHEN** o estabelecimento abre a aba "Cancelado" e há um pedido que ele mesmo cancelou
- **THEN** a linha desse pedido mostra o motivo e "Você" como quem cancelou

#### Scenario: Aba "Cancelado" em tela estreita

- **WHEN** a aba "Cancelado" é aberta numa tela de celular, que mostra os pedidos em cards
- **THEN** cada card de pedido cancelado mostra o motivo e quem cancelou

### Requirement: Busca opcional na listagem de pedidos

O sistema SHALL aceitar um parâmetro opcional `search` que restringe a listagem aos pedidos que casam com o texto informado (RF27). O texto SHALL ser aparado de espaços nas pontas, aceitar até 100 caracteres e, vazio depois de aparado, SHALL ser tratado como ausente. Um pedido casa quando o texto aparece em qualquer um destes campos:

- o nome do alimento;
- o nome do estabelecimento de origem, tanto a razão social quanto o nome fantasia;
- a data do pedido, escrita como `dd/mm/aaaa` (a busca aceita também trechos, como `05/11`), contada no fuso `America/Sao_Paulo`, o mesmo que a tela mostra.

A comparação de texto SHALL ignorar maiúsculas e acentos. A busca SHALL ser aplicada em conjunto com o filtro de status, a paginação e a ordenação: o resultado, o `total` e as páginas SHALL refletir os pedidos que atendem a todos os critérios. A busca SHALL respeitar o recorte da sessão e a exclusão lógica: nunca traz pedido de outra instituição nem pedido excluído. Texto com mais de 100 caracteres SHALL ser rejeitado como parâmetro inválido, sem retornar a listagem.

#### Scenario: Busca pelo nome do alimento
- **WHEN** a entidade pede a listagem com `search` igual a "arroz" e tem pedidos de "Arroz branco" e de "Feijão"
- **THEN** o sistema retorna só o pedido de "Arroz branco"

#### Scenario: Busca ignora maiúsculas e acentos
- **WHEN** o solicitante pede a listagem com `search` igual a "feijao" e tem um pedido de "Feijão carioca"
- **THEN** o sistema retorna o pedido de "Feijão carioca"

#### Scenario: Busca pelo nome do estabelecimento
- **WHEN** a entidade pede a listagem com `search` igual a "good taste" e tem pedidos a esse estabelecimento e a outro
- **THEN** o sistema retorna só os pedidos feitos ao "Good Taste", casando pelo nome fantasia ou pela razão social

#### Scenario: Busca pela data do pedido
- **WHEN** o solicitante pede a listagem com `search` igual a "05/11/2026" e tem um pedido feito nesse dia e outro em outro dia
- **THEN** o sistema retorna só o pedido feito em 05/11/2026

#### Scenario: Data conta no fuso de Brasília
- **WHEN** um pedido foi feito às 22:30 de 05/11/2026 em Brasília, que já é 06/11/2026 em UTC, e o solicitante busca por "05/11/2026"
- **THEN** o pedido é retornado, e a busca por "06/11/2026" não o retorna

#### Scenario: Busca combinada com o status
- **WHEN** o solicitante pede a listagem com `status` igual a "Doado" e `search` igual a "arroz", e tem um pedido "Doado" e um "Pendente" de arroz
- **THEN** o sistema retorna só o pedido "Doado", e o `total` conta só ele

#### Scenario: Busca sem resultados
- **WHEN** o solicitante pede a listagem com um `search` que nenhum de seus pedidos casa
- **THEN** o sistema retorna uma lista de itens vazia e `total` igual a 0, sem erro

#### Scenario: Busca vazia
- **WHEN** o solicitante pede a listagem com `search` composto só de espaços
- **THEN** o sistema trata como se a busca não tivesse sido informada e retorna a listagem sem esse critério

#### Scenario: Busca não vaza pedidos alheios
- **WHEN** a entidade busca pelo nome de um alimento que só existe em pedidos de outra entidade
- **THEN** o sistema retorna lista vazia

#### Scenario: Busca longa demais
- **WHEN** o solicitante pede a listagem com `search` de 101 caracteres
- **THEN** o sistema rejeita a requisição informando que o parâmetro é inválido, sem retornar a listagem

### Requirement: Campo de busca na tela de listagem

A tela de listagem de pedidos SHALL oferecer um campo de busca que filtra a lista enquanto o usuário digita, depois de uma pequena pausa, sem recarregar a página. O texto SHALL ficar guardado no endereço da página (`?search=`), de modo que recarregar ou compartilhar o endereço mantém a busca. Trocar o texto SHALL voltar para a primeira página; trocar de aba SHALL manter o texto. As contagens das abas SHALL seguir a busca, para que o usuário veja em qual status estão os pedidos encontrados. Sem resultado, a tela SHALL dizer que nenhum pedido corresponde à busca, em vez de mostrar o estado vazio de quem ainda não tem pedidos, e SHALL oferecer a ação de limpar a busca.

#### Scenario: Digitar filtra a lista
- **WHEN** o usuário digita "arroz" no campo de busca
- **THEN** a lista mostra só os pedidos que casam com "arroz", e o endereço da página passa a trazer `search=arroz`

#### Scenario: Busca mantida ao trocar de aba
- **WHEN** o usuário busca por "arroz" na aba "Pendente" e troca para a aba "Doado"
- **THEN** o campo continua com "arroz" e a aba "Doado" mostra só os pedidos que casam

#### Scenario: Contagem das abas segue a busca
- **WHEN** o usuário busca por "arroz" e tem 2 pedidos "Pendente" e 1 "Doado" desse alimento
- **THEN** a aba "Pendente" mostra 2, a aba "Doado" mostra 1 e as demais mostram 0

#### Scenario: Busca sem resultado na tela
- **WHEN** o usuário busca por um texto que nenhum pedido casa
- **THEN** a tela mostra que nenhum pedido corresponde à busca e oferece "Limpar busca", que restaura a lista

#### Scenario: Recarregar mantém a busca
- **WHEN** o usuário recarrega a página com `search=arroz` no endereço
- **THEN** o campo aparece preenchido com "arroz" e a lista já vem filtrada

### Requirement: Filtro opcional pela entidade beneficiária

O sistema SHALL aceitar um parâmetro opcional `beneficiaryEntityId` (inteiro a partir de 1) que restringe a listagem
aos pedidos daquela entidade beneficiária. O filtro SHALL ser aplicado **em conjunto** com o recorte da sessão, nunca
no lugar dele: para o estabelecimento, retorna só os pedidos dele com aquela entidade (o histórico do perfil público,
RF12); para a entidade, retorna os próprios pedidos se o id for o dela e uma lista vazia em qualquer outro caso. O
filtro SHALL combinar com o status, a busca, a paginação e a ordenação, e o `total` SHALL refletir todos os critérios.
Pedidos excluídos logicamente continuam fora (RN35). Valor não inteiro ou menor que 1 SHALL ser recusado com `400`.

#### Scenario: Estabelecimento lista os pedidos com uma entidade

- **WHEN** o estabelecimento pede a listagem com `beneficiaryEntityId` de uma entidade que fez 3 pedidos a ele e 2 a
  outro estabelecimento
- **THEN** o sistema retorna só os 3 pedidos feitos a ele, com `total` igual a 3

#### Scenario: Filtro combinado com o status

- **WHEN** o estabelecimento pede a listagem com `beneficiaryEntityId` e `status` igual a "Doado"
- **THEN** o sistema retorna só os pedidos "Doado" entre os dois

#### Scenario: Filtro não amplia o recorte da entidade

- **WHEN** uma entidade pede a listagem com o `beneficiaryEntityId` de outra entidade
- **THEN** o sistema retorna uma lista vazia e `total` igual a 0, sem pedidos da outra entidade

#### Scenario: Pedido excluído logicamente continua fora

- **WHEN** um pedido entre o estabelecimento e a entidade está excluído logicamente
- **THEN** ele não aparece na listagem filtrada

#### Scenario: beneficiaryEntityId inválido

- **WHEN** a listagem é pedida com `beneficiaryEntityId` igual a "abc" ou a 0
- **THEN** o sistema responde `400` e não retorna a listagem
