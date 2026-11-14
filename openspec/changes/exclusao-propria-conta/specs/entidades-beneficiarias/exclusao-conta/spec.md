## Purpose

Permitir que a entidade beneficiária encerre a própria conta por exclusão lógica, sabendo antes quantos pedidos serão
cancelados, com os efeitos da RN29 sobre pedidos e estoque e o motivo de sistema da RN30 (RF05).

## ADDED Requirements

### Requirement: Impacto da exclusão da conta da entidade

O sistema SHALL devolver à entidade beneficiária autenticada, em `GET /beneficiary-entities/me/deletion-impact`,
quantos pedidos dela estão em cada status que a exclusão cancela: `pendingOrders` (pedidos `Pendente`) e
`inProgressOrders` (pedidos `Em andamento`). Pedidos com `deleted = true` NÃO SHALL ser contados. A consulta NÃO SHALL
alterar nenhum dado. Sem sessão, a resposta SHALL ser `401`; conta de administrador SHALL receber `403` com
`code: ROLE_NOT_ALLOWED`; estabelecimento, que não tem entidade, SHALL receber `404`.

#### Scenario: Entidade com pedidos em aberto

- **WHEN** uma entidade com 3 pedidos `Pendente` e 2 `Em andamento` pede o impacto
- **THEN** o sistema retorna `pendingOrders: 3` e `inProgressOrders: 2`, sem alterar nenhum pedido

#### Scenario: Entidade sem pedidos em aberto

- **WHEN** uma entidade cujos pedidos estão todos `Doado`, `Rejeitado` ou `Cancelado` pede o impacto
- **THEN** o sistema retorna `pendingOrders: 0` e `inProgressOrders: 0`

#### Scenario: Estabelecimento consulta o impacto da entidade

- **WHEN** um estabelecimento autenticado pede `GET /beneficiary-entities/me/deletion-impact`
- **THEN** o sistema responde `404`

### Requirement: Senha obrigatória para excluir a conta da entidade

O sistema SHALL exigir, em `DELETE /beneficiary-entities/me`, a senha atual da conta no corpo da requisição (DT45).
Corpo sem senha, ou com campo além da senha, SHALL ser recusado com `400`. Senha errada SHALL ser recusada com `400` e
`code: INVALID_PASSWORD`, sem alterar nenhum dado e sem encerrar a sessão. A senha NÃO SHALL ir na URL. Sem sessão, a
resposta SHALL ser `401`; conta de administrador SHALL receber `403` com `code: ROLE_NOT_ALLOWED`; estabelecimento
SHALL receber `404`.

#### Scenario: Senha errada

- **WHEN** uma entidade envia `DELETE /beneficiary-entities/me` com uma senha que não é a dela
- **THEN** o sistema responde `400` com `code: INVALID_PASSWORD`, a conta continua ativa e a sessão continua valendo

#### Scenario: Senha ausente

- **WHEN** uma entidade envia `DELETE /beneficiary-entities/me` sem corpo
- **THEN** o sistema responde `400` e não altera nenhum dado

#### Scenario: Administrador tenta excluir pela rota da entidade

- **WHEN** um administrador autenticado envia `DELETE /beneficiary-entities/me`
- **THEN** o sistema responde `403` com `code: ROLE_NOT_ALLOWED`

### Requirement: Exclusão lógica da própria conta da entidade

Com a senha certa, o sistema SHALL aplicar a RN29 numa única transação, tudo ou nada, e responder `204`:

- cada pedido `Pendente` da entidade SHALL passar a `Cancelado`, com o motivo de sistema "Conta encerrada pela
  instituição" (RN30) e quem cancelou `BENEFICIARY_ENTITY` (DT44), sem mudar o estoque;
- cada pedido `Em andamento` da entidade SHALL passar a `Cancelado`, com o mesmo motivo e o mesmo `cancelledBy`, e a
  quantidade dele SHALL voltar ao estoque do alimento como no cancelamento comum: o alimento `Reservado` volta a
  `Ativo` (RN09), e os pedidos `Pendente` do **tipo total** do mesmo alimento passam a pedir o novo estoque, com a data
  da alteração (DT32). Alimento excluído logicamente NÃO SHALL receber a quantidade de volta (DT27);
- depois disso, SHALL ficar com `deleted = true`: a entidade, o usuário dela e todos os pedidos dela, **exceto** os
  `Doado` e `Cancelado` cujo estabelecimento não está excluído logicamente, que continuam visíveis para fins
  históricos;
- todas as sessões da conta SHALL ser encerradas.

Os pedidos que a exclusão acabou de cancelar contam como `Cancelado` nessa regra: os de estabelecimentos não
excluídos continuam visíveis ao estabelecimento.

#### Scenario: Pedido pendente é cancelado automaticamente

- **WHEN** a entidade exclui a conta tendo um pedido `Pendente`
- **THEN** o pedido passa a `Cancelado`, com o motivo "Conta encerrada pela instituição" e `cancelledBy` igual a
  `BENEFICIARY_ENTITY`, e o estoque do alimento não muda

#### Scenario: Pedido em andamento devolve o estoque

- **WHEN** a entidade exclui a conta tendo um pedido `Em andamento` de 3 unidades de um alimento `Ativo` com estoque 2
- **THEN** o pedido passa a `Cancelado`, com o motivo "Conta encerrada pela instituição" e `cancelledBy` igual a
  `BENEFICIARY_ENTITY`, e o alimento fica com estoque 5

#### Scenario: Alimento reservado volta a ativo

- **WHEN** a entidade exclui a conta tendo um pedido `Em andamento` que zerou o estoque de um alimento `Reservado`
- **THEN** o pedido passa a `Cancelado`, a quantidade volta ao estoque e o alimento passa a `Ativo`

#### Scenario: Pedido total pendente de outra entidade acompanha o estoque devolvido

- **WHEN** a entidade exclui a conta tendo um pedido `Em andamento` de um alimento em que outra entidade tem um pedido
  `Pendente` do tipo total
- **THEN** o pedido da outra entidade passa a pedir o novo estoque e registra a data da alteração

#### Scenario: Alimento excluído não recebe estoque de volta

- **WHEN** a entidade exclui a conta tendo um pedido `Em andamento` de um alimento que já tem `deleted = true`
- **THEN** o pedido passa a `Cancelado` e a quantidade do alimento não muda

#### Scenario: Pedidos que ficam visíveis

- **WHEN** a entidade exclui a conta tendo pedidos `Doado` e `Cancelado` de um estabelecimento ativo, e um `Pendente`
  dele
- **THEN** os três ficam com `deleted = false` (o `Pendente` agora `Cancelado`), e o estabelecimento continua vendo-os
  na listagem e no detalhe, com o nome da entidade

#### Scenario: Pedidos que somem

- **WHEN** a entidade exclui a conta tendo um pedido `Rejeitado` de um estabelecimento ativo e um pedido `Doado` de um
  estabelecimento já excluído logicamente
- **THEN** os dois ficam com `deleted = true` e não aparecem mais na listagem nem no detalhe de ninguém

#### Scenario: Estabelecimento vê o cancelamento

- **WHEN** o estabelecimento abre o detalhe de um pedido que estava `Em andamento` e foi cancelado pela exclusão da
  entidade
- **THEN** o detalhe mostra o status `Cancelado`, o motivo "Conta encerrada pela instituição" e que a entidade
  cancelou o pedido, sem os contatos da entidade

#### Scenario: Conta excluída não loga

- **WHEN** alguém tenta entrar com o e-mail e a senha de uma entidade que excluiu a conta
- **THEN** o login é recusado com a mesma resposta de credencial inválida (RN32)

#### Scenario: Sessão encerrada

- **WHEN** a entidade conclui a exclusão e, com a mesma sessão, ou com outra sessão aberta em outro dispositivo, pede
  `GET /beneficiary-entities/me`
- **THEN** o sistema responde `401`

#### Scenario: Some das listagens

- **WHEN** um estabelecimento lista as entidades ou abre o perfil público da entidade excluída
- **THEN** ela não aparece na listagem e o perfil responde `404` (RN35)

#### Scenario: Falha no meio da exclusão

- **WHEN** um erro interrompe a exclusão depois de cancelar os pedidos e antes de marcar a entidade
- **THEN** nada é gravado: pedidos, estoque, entidade, usuário e sessões continuam como estavam

### Requirement: Exclusão da entidade segura sob concorrência

A exclusão SHALL ser serializada com as operações que mudam os pedidos da entidade ou o estoque dos alimentos
envolvidos. Nenhuma operação concorrente SHALL deixar, depois da exclusão, pedido `Pendente` ou `Em andamento` da
entidade, nem estoque devolvido duas vezes ou não devolvido. Uma segunda exclusão da mesma conta, concorrente com a
primeira, NÃO SHALL aplicar os efeitos duas vezes.

#### Scenario: Aceite durante a exclusão

- **WHEN** o estabelecimento aceita um pedido `Pendente` da entidade ao mesmo tempo em que ela exclui a conta
- **THEN** ou o aceite acontece antes, e o pedido acaba `Cancelado` com a quantidade de volta ao estoque, ou o aceite
  é recusado com `409` porque o pedido já não está pendente; o estoque fica igual ao de antes do aceite

#### Scenario: Pedido criado durante a exclusão

- **WHEN** a entidade solicita um alimento em outra aba ao mesmo tempo em que exclui a conta
- **THEN** ou o pedido é criado antes e acaba `Cancelado` pela exclusão, ou a solicitação é recusada; nunca fica
  `Pendente`

#### Scenario: Duas exclusões simultâneas

- **WHEN** duas requisições de exclusão da mesma conta, com a senha certa, chegam ao mesmo tempo
- **THEN** os efeitos são aplicados uma vez só, o estoque é devolvido uma vez só, e nenhuma das duas responde erro de
  servidor

### Requirement: Zona de perigo no perfil da entidade

A tela de perfil da entidade beneficiária SHALL ter, no fim, uma seção "Zona de perigo" com o botão "Excluir conta".
O botão SHALL abrir um diálogo que:

- busca o impacto e diz quantos pedidos pendentes e em andamento serão cancelados, ou que não há pedidos em aberto;
- avisa que as quantidades reservadas voltam aos estabelecimentos, que a ação não pode ser desfeita e que o e-mail, o
  CNPJ e os celulares continuam vinculados à conta excluída;
- tem um campo para digitar "EXCLUIR" e um campo de senha;
- só habilita o botão de confirmar quando o primeiro campo é exatamente "EXCLUIR" e a senha não está vazia.

Senha errada SHALL manter o diálogo aberto, com a mensagem "Senha incorreta." no campo de senha. Concluída a
exclusão, a tela SHALL limpar o estado da sessão, ir para o login e mostrar o aviso "Sua conta foi excluída.". Os
textos NÃO SHALL citar "administrador".

#### Scenario: Diálogo mostra o impacto

- **WHEN** uma entidade com 3 pedidos pendentes e 2 em andamento abre o diálogo de exclusão
- **THEN** o diálogo diz que 3 pedidos pendentes e 2 pedidos em andamento serão cancelados

#### Scenario: Diálogo sem pedidos em aberto

- **WHEN** uma entidade sem pedidos em aberto abre o diálogo de exclusão
- **THEN** o diálogo diz que não há pedidos em aberto e mantém o aviso de que a ação não pode ser desfeita

#### Scenario: Senha errada na tela

- **WHEN** a entidade confirma com uma senha errada
- **THEN** o diálogo continua aberto, o campo de senha mostra "Senha incorreta." e a sessão continua ativa

#### Scenario: Exclusão concluída na tela

- **WHEN** a entidade confirma com "EXCLUIR" e a senha certa
- **THEN** a tela vai para o login e mostra "Sua conta foi excluída."
