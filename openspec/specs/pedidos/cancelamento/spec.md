# pedidos/cancelamento Specification

## Purpose

Permitir que o estabelecimento de origem ou a entidade beneficiária de um pedido em aberto o cancele, com um motivo da lista, devolvendo ao alimento a quantidade reservada quando o pedido já tinha sido aceito e registrando quem cancelou (RF26, RN09, DT32, DT33).

## Requirements

### Requirement: Cancelamento de pedido em aberto pelas partes

O sistema SHALL permitir que o estabelecimento de origem ou a entidade beneficiária de um pedido o cancelem enquanto ele está "Pendente" ou "Em andamento", informando um motivo de cancelamento. O pedido SHALL passar a "Cancelado", com o motivo informado e com quem cancelou gravados nele. O vínculo com o pedido SHALL ser resolvido pela sessão, nunca informado pelo cliente. Pedido inexistente, excluído logicamente (RN14) ou de que o solicitante não é parte SHALL responder que o pedido não foi encontrado, sem revelar se ele existe. O administrador SHALL NOT usar esta operação (RN13).

#### Scenario: Entidade cancela pedido pendente

- **WHEN** a entidade beneficiária cancela um pedido "Pendente" dela, informando um motivo válido
- **THEN** o pedido vira "Cancelado", com esse motivo e com a entidade beneficiária registrada como quem cancelou

#### Scenario: Estabelecimento cancela pedido pendente

- **WHEN** o estabelecimento cancela um pedido "Pendente" de um alimento dele, informando um motivo válido
- **THEN** o pedido vira "Cancelado", com esse motivo e com o estabelecimento registrado como quem cancelou

#### Scenario: Entidade cancela pedido em andamento

- **WHEN** a entidade beneficiária cancela um pedido "Em andamento" dela, informando um motivo válido
- **THEN** o pedido vira "Cancelado", com esse motivo e com a entidade beneficiária registrada como quem cancelou

#### Scenario: Estabelecimento cancela pedido em andamento

- **WHEN** o estabelecimento cancela um pedido "Em andamento" de um alimento dele, informando um motivo válido
- **THEN** o pedido vira "Cancelado", com esse motivo e com o estabelecimento registrado como quem cancelou

#### Scenario: Instituição que não é parte do pedido

- **WHEN** um estabelecimento ou uma entidade beneficiária tenta cancelar um pedido do qual não é parte
- **THEN** o sistema responde `404` e o pedido não muda

#### Scenario: Pedido excluído logicamente

- **WHEN** uma das partes tenta cancelar um pedido marcado como excluído logicamente
- **THEN** o sistema responde `404` e o pedido não muda

#### Scenario: Administrador tenta cancelar

- **WHEN** um administrador autenticado tenta cancelar um pedido
- **THEN** o sistema responde `403` com `code: ROLE_NOT_ALLOWED` e o pedido não muda

#### Scenario: Requisição sem autenticação

- **WHEN** o cancelamento é solicitado sem sessão autenticada válida
- **THEN** o sistema nega o acesso e o pedido não muda

#### Scenario: Pedido cancelado libera o limite e o alimento

- **WHEN** uma entidade com 10 pedidos em aberto cancela um deles
- **THEN** ela passa a ter 9 pedidos em aberto, pode criar um novo pedido e pode voltar a pedir o mesmo alimento do pedido cancelado

### Requirement: Motivo obrigatório e fora dos motivos de sistema

O sistema SHALL exigir um motivo de cancelamento em todo cancelamento feito pelas partes. O motivo SHALL ser um motivo existente da lista e SHALL NOT ser um motivo de sistema (RN31). Motivo ausente SHALL ser recusado com `400` e `code: CANCELLATION_REASON_REQUIRED`. Motivo inexistente ou de sistema SHALL ser recusado com `400` e `code: INVALID_CANCELLATION_REASON`. Em qualquer recusa, nada muda. A validação do motivo SHALL ocorrer antes da verificação do status do pedido.

#### Scenario: Cancelamento sem motivo

- **WHEN** uma das partes cancela um pedido em aberto sem informar o motivo
- **THEN** o sistema responde `400` com `code: CANCELLATION_REASON_REQUIRED`, e o pedido e o alimento não mudam

#### Scenario: Motivo inexistente

- **WHEN** uma das partes cancela um pedido em aberto informando um motivo que não existe
- **THEN** o sistema responde `400` com `code: INVALID_CANCELLATION_REASON`, e o pedido e o alimento não mudam

#### Scenario: Motivo de sistema

- **WHEN** uma das partes cancela um pedido em aberto informando o motivo "Pedido expirado sem resposta"
- **THEN** o sistema responde `400` com `code: INVALID_CANCELLATION_REASON`, e o pedido e o alimento não mudam

### Requirement: Só pedido em aberto pode ser cancelado

O sistema SHALL recusar o cancelamento de um pedido "Rejeitado", "Doado" ou "Cancelado" com `409` e `code: ORDER_NOT_OPEN`, sem alterar o pedido nem o alimento (RN01).

#### Scenario: Cancelar pedido doado

- **WHEN** uma das partes tenta cancelar um pedido "Doado", informando um motivo válido
- **THEN** o sistema responde `409` com `code: ORDER_NOT_OPEN` e o pedido continua "Doado"

#### Scenario: Cancelar pedido já cancelado

- **WHEN** uma das partes tenta cancelar um pedido que já está "Cancelado"
- **THEN** o sistema responde `409` com `code: ORDER_NOT_OPEN`, e o motivo e quem cancelou continuam os gravados no primeiro cancelamento

#### Scenario: Cancelar pedido rejeitado

- **WHEN** uma das partes tenta cancelar um pedido "Rejeitado"
- **THEN** o sistema responde `409` com `code: ORDER_NOT_OPEN` e o pedido continua "Rejeitado"

### Requirement: Cancelamento de pedido pendente não muda o estoque

O sistema SHALL manter a quantidade e o status do alimento quando o pedido cancelado estava "Pendente", porque um pedido "Pendente" nunca reservou quantidade. Os outros pedidos do alimento SHALL NOT mudar.

#### Scenario: Pendente cancelado

- **WHEN** a entidade cancela um pedido "Pendente" de 3 un de um alimento "Ativo" com 10 un
- **THEN** o pedido vira "Cancelado", e o alimento continua "Ativo" com 10 un

### Requirement: Devolução do estoque no cancelamento de pedido em andamento

O sistema SHALL, na mesma operação do cancelamento de um pedido que estava "Em andamento", somar a quantidade do pedido à quantidade atual do alimento. Se o alimento estava "Reservado", ele SHALL voltar a "Ativo" (RN09). A devolução SHALL acontecer mesmo que o alimento esteja vencido; a disponibilidade dele no feed continua seguindo RN19.

#### Scenario: Devolução com alimento ativo

- **WHEN** uma das partes cancela um pedido "Em andamento" de 4 un de um alimento "Ativo" com 6 un
- **THEN** o pedido vira "Cancelado", e o alimento fica "Ativo" com 10 un

#### Scenario: Alimento reservado volta a ativo

- **WHEN** uma das partes cancela o pedido "Em andamento" de 5 un de um alimento "Reservado" com 0 un
- **THEN** o pedido vira "Cancelado", e o alimento passa a "Ativo" com 5 un, voltando a aparecer no feed se estiver dentro da validade

#### Scenario: Alimento reservado com outro pedido em andamento

- **WHEN** um alimento "Reservado" com 0 un tem dois pedidos "Em andamento", de 3 un e de 2 un, e uma das partes cancela o de 3 un
- **THEN** o pedido de 3 un vira "Cancelado", o alimento passa a "Ativo" com 3 un, e o pedido de 2 un continua "Em andamento"

#### Scenario: Alimento vencido

- **WHEN** uma das partes cancela o pedido "Em andamento" de 5 un de um alimento "Reservado" com 0 un e data de vencimento no passado
- **THEN** o pedido vira "Cancelado", o alimento passa a "Ativo" com 5 un, e continua fora do feed por estar vencido

### Requirement: Pedidos totais pendentes acompanham o estoque devolvido

O sistema SHALL, na mesma operação de uma devolução de estoque, fazer os pedidos "Pendente", não excluídos, do **tipo total** do mesmo alimento passarem a pedir a nova quantidade do alimento, registrando a data da alteração, como na edição de quantidade (RN20) e no aceite (DT31) (DT32). Os pedidos "Pendente" do tipo parcial SHALL NOT mudar. Pedidos em status final SHALL NOT mudar.

#### Scenario: Pedido total pendente acompanha a devolução

- **WHEN** um alimento "Ativo" com 6 un tem um pedido "Em andamento" de 4 un e um pedido "Pendente" do tipo total de 6 un, e uma das partes cancela o pedido "Em andamento"
- **THEN** o alimento fica com 10 un, e o pedido total pendente passa a pedir 10 un, com a data da alteração registrada

#### Scenario: Pedido parcial pendente não muda

- **WHEN** um alimento "Ativo" com 6 un tem um pedido "Em andamento" de 4 un e um pedido "Pendente" do tipo parcial de 3 un, e uma das partes cancela o pedido "Em andamento"
- **THEN** o alimento fica com 10 un, e o pedido parcial continua "Pendente" pedindo 3 un, sem data de alteração nova

#### Scenario: Cancelamento de pendente não ajusta os totais

- **WHEN** um alimento "Ativo" com 6 un tem dois pedidos "Pendente", um parcial de 2 un e um total de 6 un, e a entidade cancela o parcial
- **THEN** o pedido total continua pedindo 6 un, sem data de alteração nova

### Requirement: Cancelamento seguro sob concorrência

O sistema SHALL executar o cancelamento — mudança de status, motivo, quem cancelou, devolução do estoque, volta a "Ativo" e ajuste dos totais — numa única operação atômica, com o alimento travado antes da leitura do pedido e do estoque, como no aceite e na confirmação. O efeito sobre o estoque SHALL ser decidido pelo status do pedido lido depois da trava: se outra requisição mudou o pedido antes, o cancelamento aplica o efeito do status atual ou, se o pedido já não está em aberto, responde `409` com `code: ORDER_NOT_OPEN`. Nenhuma combinação de requisições simultâneas SHALL deixar estoque devolvido duas vezes, estoque negativo ou alimento "Reservado" com quantidade maior que zero.

#### Scenario: Dois cancelamentos simultâneos do mesmo pedido

- **WHEN** o estabelecimento e a entidade cancelam ao mesmo tempo o mesmo pedido "Em andamento" de 4 un, com o alimento em 6 un
- **THEN** um dos cancelamentos vale, o outro recebe `409` com `code: ORDER_NOT_OPEN`, e o alimento termina com 10 un

#### Scenario: Cancelamento e aceite simultâneos

- **WHEN** a entidade cancela um pedido "Pendente" de 4 un enquanto o estabelecimento o aceita, com o alimento em 10 un
- **THEN** se o aceite vale primeiro, o cancelamento encontra o pedido "Em andamento" e devolve as 4 un, e o alimento termina com 10 un e o pedido "Cancelado"; se o cancelamento vale primeiro, o aceite recebe `409` com `code: ORDER_NOT_PENDING`, e o alimento continua com 10 un

#### Scenario: Cancelamento e confirmação simultâneos

- **WHEN** a entidade confirma o recebimento de um pedido "Em andamento" enquanto o estabelecimento o cancela
- **THEN** só uma das operações vale; se a confirmação vale primeiro, o cancelamento recebe `409` com `code: ORDER_NOT_OPEN` e o estoque não é devolvido

### Requirement: Ação "Cancelar pedido" no detalhe

A tela de detalhe do pedido SHALL oferecer a ação "Cancelar pedido" às duas partes enquanto o pedido está "Pendente" ou "Em andamento", ao lado das ações que já existem para o status. A ação SHALL abrir um diálogo de confirmação que:

- diz o efeito: para pedido "Pendente", que o estoque não muda; para pedido "Em andamento", quanto volta ao estoque do alimento;
- exige o motivo num select com busca, que não lista motivos de sistema e oferece "Sugerir nova opção" (RN38);
- avisa que a ação não pode ser desfeita.

Ao concluir, a tela SHALL mostrar o pedido como "Cancelado", com o motivo e quem cancelou, e atualizar a listagem, os contadores das abas e os dados do alimento.

#### Scenario: Entidade vê a ação no pedido pendente

- **WHEN** a entidade beneficiária abre o detalhe de um pedido "Pendente" dela
- **THEN** a tela oferece "Cancelar pedido"

#### Scenario: Estabelecimento vê a ação no pedido em andamento

- **WHEN** o estabelecimento abre o detalhe de um pedido "Em andamento"
- **THEN** a tela oferece "Cancelar pedido"

#### Scenario: Pedido em status final não oferece a ação

- **WHEN** uma das partes abre o detalhe de um pedido "Rejeitado", "Doado" ou "Cancelado"
- **THEN** a tela não oferece "Cancelar pedido"

#### Scenario: Diálogo de pedido em andamento diz a devolução

- **WHEN** a parte abre o diálogo de cancelamento de um pedido "Em andamento" de 4 un
- **THEN** o diálogo diz que 4 un voltam ao estoque do alimento

#### Scenario: Confirmar sem motivo

- **WHEN** a parte confirma o diálogo sem escolher um motivo
- **THEN** o diálogo não envia o pedido e indica que o motivo é obrigatório

#### Scenario: Sugerir motivo

- **WHEN** a parte não encontra o motivo e escolhe "Sugerir nova opção"
- **THEN** abre o diálogo de sugestão com o tipo "Motivo de cancelamento" já preenchido, e o cancelamento continua exigindo um motivo existente

#### Scenario: Pedido mudou enquanto o diálogo estava aberto

- **WHEN** a parte confirma o cancelamento e o servidor responde `409` com `code: ORDER_NOT_OPEN`
- **THEN** a tela avisa que o pedido já foi atualizado e mostra a situação atual dele
