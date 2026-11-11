## ADDED Requirements

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
