## Purpose

Permitir que o estabelecimento encerre a própria conta por exclusão lógica, sabendo antes quantos pedidos serão
afetados, com os efeitos da RN28 sobre alimentos e pedidos e o motivo de sistema da RN30 (RF04).

## ADDED Requirements

### Requirement: Impacto da exclusão da conta do estabelecimento

O sistema SHALL devolver ao estabelecimento autenticado, em `GET /establishments/me/deletion-impact`, quantos pedidos
dele estão em cada status que a exclusão altera: `pendingOrders` (pedidos `Pendente`, que serão rejeitados) e
`inProgressOrders` (pedidos `Em andamento`, que serão cancelados). Pedidos com `deleted = true` NÃO SHALL ser
contados. A consulta NÃO SHALL alterar nenhum dado. Sem sessão, a resposta SHALL ser `401`; conta de administrador
SHALL receber `403` com `code: ROLE_NOT_ALLOWED`; entidade beneficiária, que não tem estabelecimento, SHALL receber
`404`.

#### Scenario: Estabelecimento com pedidos em aberto

- **WHEN** um estabelecimento com 2 pedidos `Pendente` e 1 `Em andamento` pede o impacto
- **THEN** o sistema retorna `pendingOrders: 2` e `inProgressOrders: 1`, sem alterar nenhum pedido

#### Scenario: Estabelecimento sem pedidos em aberto

- **WHEN** um estabelecimento cujos pedidos estão todos `Doado`, `Rejeitado` ou `Cancelado` pede o impacto
- **THEN** o sistema retorna `pendingOrders: 0` e `inProgressOrders: 0`

#### Scenario: Entidade consulta o impacto do estabelecimento

- **WHEN** uma entidade beneficiária autenticada pede `GET /establishments/me/deletion-impact`
- **THEN** o sistema responde `404`

### Requirement: Senha obrigatória para excluir a conta do estabelecimento

O sistema SHALL exigir, em `DELETE /establishments/me`, a senha atual da conta no corpo da requisição (DT45). Corpo
sem senha, ou com campo além da senha, SHALL ser recusado com `400`. Senha errada SHALL ser recusada com `400` e
`code: INVALID_PASSWORD`, sem alterar nenhum dado e sem encerrar a sessão. A senha NÃO SHALL ir na URL. Sem sessão, a
resposta SHALL ser `401`; conta de administrador SHALL receber `403` com `code: ROLE_NOT_ALLOWED`; entidade
beneficiária SHALL receber `404`.

#### Scenario: Senha errada

- **WHEN** um estabelecimento envia `DELETE /establishments/me` com uma senha que não é a dele
- **THEN** o sistema responde `400` com `code: INVALID_PASSWORD`, a conta continua ativa e a sessão continua valendo

#### Scenario: Senha ausente

- **WHEN** um estabelecimento envia `DELETE /establishments/me` sem corpo
- **THEN** o sistema responde `400` e não altera nenhum dado

#### Scenario: Administrador tenta excluir pela rota do estabelecimento

- **WHEN** um administrador autenticado envia `DELETE /establishments/me`
- **THEN** o sistema responde `403` com `code: ROLE_NOT_ALLOWED`

### Requirement: Exclusão lógica da própria conta do estabelecimento

Com a senha certa, o sistema SHALL aplicar a RN28 numa única transação, tudo ou nada, e responder `204`:

- cada pedido `Pendente` do estabelecimento SHALL passar a `Rejeitado`, sem motivo (RN10);
- cada pedido `Em andamento` do estabelecimento SHALL passar a `Cancelado`, com o motivo de sistema "Conta encerrada
  pela instituição" (RN30) e quem cancelou `ESTABLISHMENT` (DT44); a quantidade NÃO SHALL voltar ao estoque, porque o
  alimento é excluído junto (DT27);
- todos os alimentos do estabelecimento SHALL ficar com `deleted = true`, em qualquer status, sem mudar o status;
- o estabelecimento e o usuário dele SHALL ficar com `deleted = true`;
- todas as sessões da conta SHALL ser encerradas.

Os pedidos do estabelecimento NÃO SHALL ser marcados como excluídos: a entidade de cada pedido continua vendo-os na
listagem e no detalhe, como registro histórico (RN12). Nenhum pedido `Doado`, `Rejeitado` ou `Cancelado` antes da
exclusão SHALL mudar.

#### Scenario: Pedido pendente é rejeitado automaticamente

- **WHEN** o estabelecimento exclui a conta tendo um pedido `Pendente`
- **THEN** o pedido passa a `Rejeitado`, sem motivo de cancelamento

#### Scenario: Pedido em andamento é cancelado automaticamente

- **WHEN** o estabelecimento exclui a conta tendo um pedido `Em andamento`
- **THEN** o pedido passa a `Cancelado`, com o motivo "Conta encerrada pela instituição" e `cancelledBy` igual a
  `ESTABLISHMENT`, e a quantidade do alimento não muda

#### Scenario: Alimentos saem do ar

- **WHEN** o estabelecimento exclui a conta tendo alimentos `Ativo`, `Reservado` e `Inativo`
- **THEN** todos ficam com `deleted = true`, nenhum aparece mais no feed nem no perfil público, e o status de cada um
  não muda

#### Scenario: Histórico preservado

- **WHEN** o estabelecimento exclui a conta tendo pedidos `Doado` e `Cancelado` de antes
- **THEN** esses pedidos não mudam, e a entidade de cada um continua vendo-os na listagem e no detalhe, com o nome do
  estabelecimento

#### Scenario: Entidade vê o cancelamento

- **WHEN** a entidade abre o detalhe de um pedido que estava `Em andamento` e foi cancelado pela exclusão do
  estabelecimento
- **THEN** o detalhe mostra o status `Cancelado`, o motivo "Conta encerrada pela instituição" e que o estabelecimento
  cancelou o pedido

#### Scenario: Conta excluída não loga

- **WHEN** alguém tenta entrar com o e-mail e a senha de um estabelecimento que excluiu a conta
- **THEN** o login é recusado com a mesma resposta de credencial inválida (RN32)

#### Scenario: Sessão encerrada

- **WHEN** o estabelecimento conclui a exclusão e, com a mesma sessão, ou com outra sessão aberta em outro
  dispositivo, pede `GET /establishments/me`
- **THEN** o sistema responde `401`

#### Scenario: Some das listagens

- **WHEN** uma entidade lista os estabelecimentos ou abre o perfil público do estabelecimento excluído
- **THEN** ele não aparece na listagem e o perfil responde `404` (RN35)

#### Scenario: Falha no meio da exclusão

- **WHEN** um erro interrompe a exclusão depois de rejeitar os pedidos pendentes e antes de marcar o estabelecimento
- **THEN** nada é gravado: pedidos, alimentos, estabelecimento, usuário e sessões continuam como estavam

### Requirement: Exclusão do estabelecimento segura sob concorrência

A exclusão SHALL ser serializada com as operações que mudam pedidos ou alimentos do estabelecimento. Nenhuma operação
concorrente SHALL deixar, depois da exclusão, pedido `Pendente` ou `Em andamento` em alimento do estabelecimento, nem
alimento dele com `deleted = false`. Uma segunda exclusão da mesma conta, concorrente com a primeira, NÃO SHALL
aplicar os efeitos duas vezes.

#### Scenario: Pedido criado durante a exclusão

- **WHEN** uma entidade solicita um alimento do estabelecimento ao mesmo tempo em que ele exclui a conta
- **THEN** ou o pedido é criado antes e acaba `Rejeitado` pela exclusão, ou é recusado como alimento não encontrado;
  nunca fica `Pendente`

#### Scenario: Aceite durante a exclusão

- **WHEN** o estabelecimento aceita um pedido em outra aba ao mesmo tempo em que exclui a conta
- **THEN** ou o aceite acontece antes e o pedido acaba `Cancelado` pela exclusão, ou o aceite é recusado; o pedido
  nunca fica `Em andamento`

#### Scenario: Alimento cadastrado durante a exclusão

- **WHEN** o estabelecimento cadastra um alimento em outra aba ao mesmo tempo em que exclui a conta
- **THEN** ou o alimento é criado antes e acaba com `deleted = true`, ou o cadastro é recusado

#### Scenario: Duas exclusões simultâneas

- **WHEN** duas requisições de exclusão da mesma conta, com a senha certa, chegam ao mesmo tempo
- **THEN** os efeitos são aplicados uma vez só, e nenhuma das duas responde erro de servidor

### Requirement: Zona de perigo no perfil do estabelecimento

A tela de perfil do estabelecimento SHALL ter, no fim, uma seção "Zona de perigo" com o botão "Excluir conta". O
botão SHALL abrir um diálogo que:

- busca o impacto e diz quantos pedidos pendentes serão rejeitados e quantos em andamento serão cancelados, ou que não
  há pedidos em aberto;
- avisa que todos os alimentos saem do ar, que a ação não pode ser desfeita e que o e-mail, o CNPJ e os celulares
  continuam vinculados à conta excluída;
- tem um campo para digitar "EXCLUIR" e um campo de senha;
- só habilita o botão de confirmar quando o primeiro campo é exatamente "EXCLUIR" e a senha não está vazia.

Senha errada SHALL manter o diálogo aberto, com a mensagem "Senha incorreta." no campo de senha. Concluída a
exclusão, a tela SHALL limpar o estado da sessão, ir para o login e mostrar o aviso "Sua conta foi excluída.". Os
textos NÃO SHALL citar "administrador".

#### Scenario: Diálogo mostra o impacto

- **WHEN** um estabelecimento com 2 pedidos pendentes e 1 em andamento abre o diálogo de exclusão
- **THEN** o diálogo diz que 2 pedidos pendentes serão rejeitados e 1 pedido em andamento será cancelado

#### Scenario: Confirmação incompleta

- **WHEN** o estabelecimento digita "excluir" em minúsculas, ou deixa a senha vazia
- **THEN** o botão de confirmar continua desabilitado

#### Scenario: Senha errada na tela

- **WHEN** o estabelecimento confirma com uma senha errada
- **THEN** o diálogo continua aberto, o campo de senha mostra "Senha incorreta." e a sessão continua ativa

#### Scenario: Exclusão concluída na tela

- **WHEN** o estabelecimento confirma com "EXCLUIR" e a senha certa
- **THEN** a tela vai para o login e mostra "Sua conta foi excluída."
