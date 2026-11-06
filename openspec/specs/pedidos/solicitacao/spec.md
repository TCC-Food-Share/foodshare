# pedidos/solicitacao Specification

## Purpose

Permitir que uma entidade beneficiária autenticada crie um pedido de doação para um alimento disponível, informando a quantidade desejada, viabilizando os fluxos de aceite, rejeição e confirmação de recebimento.

## Requirements

### Requirement: Solicitação de pedido de doação pela entidade beneficiária
O sistema SHALL permitir que uma entidade beneficiária autenticada crie um pedido de doação informando o alimento (por id) e a quantidade desejada (valor numérico positivo, com até 2 casas decimais, sendo a fração permitida só quando a unidade de medida do alimento a aceita). O pedido SHALL ser vinculado exclusivamente à entidade beneficiária autenticada e ao estabelecimento de origem do alimento, sem que o cliente informe qualquer um desses vínculos.

#### Scenario: Pedido com dados válidos
- **WHEN** uma entidade beneficiária autenticada solicita um pedido para um alimento disponível, com uma quantidade que o tipo de solicitação do alimento permite
- **THEN** o sistema cria o pedido vinculado à entidade autenticada e ao estabelecimento do alimento, e retorna confirmação com os dados do pedido

#### Scenario: Requisição sem autenticação
- **WHEN** uma solicitação de pedido é enviada sem sessão autenticada válida
- **THEN** o sistema nega o acesso e não cria nenhum pedido

#### Scenario: Conta autenticada não é entidade beneficiária
- **WHEN** um estabelecimento autenticado tenta criar um pedido
- **THEN** o sistema rejeita a requisição e não cria nenhum pedido

#### Scenario: Vínculos resolvidos pela sessão e pelo alimento
- **WHEN** uma entidade beneficiária autenticada cria um pedido válido
- **THEN** o sistema vincula o pedido à entidade beneficiária da sessão e ao estabelecimento de origem do alimento, sem que esses vínculos venham do corpo da requisição

#### Scenario: Identificador de vínculo enviado no corpo
- **WHEN** a solicitação inclui um identificador de entidade beneficiária ou de estabelecimento no corpo da requisição
- **THEN** o sistema recusa a requisição como dado inválido, sem criar pedido

### Requirement: Pedido só para alimento disponível
O sistema SHALL aceitar o pedido apenas quando o `foodId` corresponder a um alimento disponível — status "Ativo", não excluído logicamente, não vencido e com quantidade atual maior que zero, o mesmo recorte da listagem. Alimento inexistente ou fora desse conjunto SHALL resultar em resposta de não encontrado, sem criar pedido.

#### Scenario: Alimento inexistente
- **WHEN** a entidade beneficiária solicita um pedido com um `foodId` que não corresponde a nenhum alimento
- **THEN** o sistema responde que o alimento não foi encontrado e não cria pedido

#### Scenario: Alimento indisponível
- **WHEN** a entidade beneficiária solicita um pedido para um alimento vencido, excluído logicamente ou com status diferente de "Ativo"
- **THEN** o sistema responde que o alimento não foi encontrado e não cria pedido

#### Scenario: Alimento esgotado
- **WHEN** a entidade beneficiária solicita um pedido para um alimento cuja quantidade atual é zero, por exemplo depois de pedidos aceitos reservarem toda a quantidade
- **THEN** o sistema responde que o alimento não foi encontrado e não cria pedido

### Requirement: Quantidade do pedido validada contra o estoque
O sistema SHALL exigir uma quantidade maior que zero, com até 2 casas decimais. Quantidade ausente, não numérica, igual a zero, negativa ou com mais de 2 casas SHALL ser rejeitada como dado inválido, informando o campo. Além disso, a quantidade SHALL respeitar o estoque, a unidade de medida e o tipo de solicitação do alimento (RN03), conferidos nesta ordem:

1. **Estoque:** não pode ser maior que a quantidade atual do alimento.
2. **Fração:** quantidade fracionada só é aceita se a unidade de medida do alimento aceitar fração.
3. **Tipo de solicitação:**
   - "Somente total": igual à quantidade atual do alimento.
   - "Somente parcial": menor que a quantidade atual do alimento. A exceção é a sobra: quando a quantidade atual já não permite um pedido parcial (1 ou menos em unidade sem fração, 0,01 em unidade fracionada), o pedido SHALL ser aceito com a quantidade atual inteira (DT30).
   - "Total ou parcial": qualquer quantidade até a quantidade atual.

Em nenhuma recusa o pedido é criado. As recusas por estoque, fração e tipo respondem `400`.

#### Scenario: Quantidade acima do estoque
- **WHEN** a entidade beneficiária solicita uma quantidade maior que a quantidade atual do alimento
- **THEN** o sistema rejeita o pedido informando que a quantidade excede o disponível, sem criar pedido

#### Scenario: Quantidade inválida
- **WHEN** a entidade beneficiária envia a solicitação sem quantidade, com quantidade não numérica, igual a zero, negativa ou com mais de 2 casas decimais
- **THEN** o sistema rejeita a requisição informando o campo inválido, sem criar pedido

#### Scenario: Fração em unidade que não aceita fração
- **WHEN** a entidade beneficiária pede 2,5 de um alimento cuja unidade de medida não aceita fração
- **THEN** o sistema rejeita o pedido por fração não permitida, sem criar pedido

#### Scenario: Fração em unidade que aceita fração
- **WHEN** a entidade beneficiária pede 2,5 kg de um alimento "Total ou parcial" com 10 kg disponíveis, em unidade que aceita fração
- **THEN** o sistema cria o pedido

#### Scenario: "Somente total" com a quantidade inteira
- **WHEN** a entidade beneficiária pede exatamente a quantidade atual de um alimento "Somente total"
- **THEN** o sistema cria o pedido

#### Scenario: "Somente total" com parte da quantidade
- **WHEN** a entidade beneficiária pede menos que a quantidade atual de um alimento "Somente total"
- **THEN** o sistema rejeita o pedido por exigir a quantidade total, sem criar pedido

#### Scenario: "Somente parcial" com parte da quantidade
- **WHEN** a entidade beneficiária pede 3 de um alimento "Somente parcial" com 5 disponíveis
- **THEN** o sistema cria o pedido

#### Scenario: "Somente parcial" com a quantidade inteira
- **WHEN** a entidade beneficiária pede 5 de um alimento "Somente parcial" com 5 disponíveis, em unidade sem fração
- **THEN** o sistema rejeita o pedido por exigir quantidade parcial, sem criar pedido

#### Scenario: "Somente parcial" com a sobra em unidade sem fração
- **WHEN** a entidade beneficiária pede 1 de um alimento "Somente parcial" que tem só 1 disponível, em unidade sem fração
- **THEN** o sistema cria o pedido com a quantidade 1

#### Scenario: "Somente parcial" com a sobra em unidade fracionada
- **WHEN** a entidade beneficiária pede 0,01 de um alimento "Somente parcial" que tem só 0,01 disponível, em unidade que aceita fração
- **THEN** o sistema cria o pedido com a quantidade 0,01

#### Scenario: "Somente parcial" com quantidade que ainda permite parcial
- **WHEN** a entidade beneficiária pede 0,02 de um alimento "Somente parcial" que tem 0,02 disponível, em unidade que aceita fração
- **THEN** o sistema rejeita o pedido por exigir quantidade parcial, porque 0,01 ainda é um pedido parcial possível

#### Scenario: Quantidade igual à quantidade total do alimento
- **WHEN** a entidade beneficiária pede exatamente a quantidade atual de um alimento "Total ou parcial"
- **THEN** o sistema cria o pedido normalmente

#### Scenario: "Total ou parcial" com parte da quantidade
- **WHEN** a entidade beneficiária pede menos que a quantidade atual de um alimento "Total ou parcial"
- **THEN** o sistema cria o pedido normalmente

### Requirement: Pedido inicia com status "Pendente"
O sistema SHALL atribuir automaticamente o status "Pendente" a todo pedido no momento da criação, sem permitir que o cliente informe ou escolha o status inicial.

#### Scenario: Status inicial automático
- **WHEN** uma entidade beneficiária cria um pedido com dados válidos
- **THEN** o sistema atribui o status "Pendente" ao pedido criado, independentemente de qualquer valor de status presente na requisição

### Requirement: Limite de pedidos em aberto por entidade beneficiária
O sistema SHALL recusar a criação de um novo pedido quando a entidade beneficiária autenticada já possuir 10 ou mais pedidos em aberto, sem criar o pedido. Um pedido conta como **em aberto** quando pertence à entidade, não está excluído logicamente e seu status é "Pendente" ou "Em andamento". Os status "Rejeitado", "Doado" e "Cancelado" são finais e não contam para o limite. Pedidos de outras entidades beneficiárias não contam.

A verificação do limite SHALL ocorrer depois de resolver a entidade beneficiária da sessão e antes de qualquer validação do alimento ou da quantidade, de modo que uma entidade no limite receba a mesma recusa independentemente do conteúdo da requisição.

#### Scenario: Entidade abaixo do limite cria pedido
- **WHEN** uma entidade beneficiária autenticada com 9 pedidos em aberto solicita um pedido válido para um alimento disponível
- **THEN** o sistema cria o pedido normalmente, passando a entidade a ter 10 pedidos em aberto

#### Scenario: Entidade no limite tem o pedido recusado
- **WHEN** uma entidade beneficiária autenticada com 10 pedidos em aberto solicita um novo pedido
- **THEN** o sistema recusa a requisição por conflito de estado, informando que o limite de pedidos em aberto foi atingido, e não cria nenhum pedido

#### Scenario: Entidade acima do limite tem o pedido recusado
- **WHEN** uma entidade beneficiária autenticada com mais de 10 pedidos em aberto solicita um novo pedido
- **THEN** o sistema recusa a requisição da mesma forma e não cria nenhum pedido

#### Scenario: Pedidos pendentes e em andamento somam no limite
- **WHEN** uma entidade beneficiária autenticada possui 6 pedidos "Pendente" e 4 pedidos "Em andamento", e solicita um novo pedido
- **THEN** o sistema considera os 10 pedidos em aberto e recusa a requisição pelo limite, sem criar pedido

#### Scenario: Pedidos excluídos logicamente não contam para o limite
- **WHEN** uma entidade beneficiária autenticada possui 9 pedidos em aberto e outros pedidos marcados como excluídos logicamente, e solicita um pedido válido
- **THEN** o sistema considera apenas os 9 pedidos em aberto, fica abaixo do limite e cria o pedido

#### Scenario: Pedidos rejeitados não contam para o limite
- **WHEN** uma entidade beneficiária autenticada possui 9 pedidos em aberto ("Pendente" ou "Em andamento") e outros pedidos com status "Rejeitado", e solicita um pedido válido
- **THEN** o sistema considera apenas os 9 pedidos em aberto, fica abaixo do limite e cria o pedido

#### Scenario: Pedidos doados não contam para o limite
- **WHEN** uma entidade beneficiária autenticada possui 9 pedidos em aberto ("Pendente" ou "Em andamento") e outros pedidos com status "Doado", e solicita um pedido válido
- **THEN** o sistema considera apenas os 9 pedidos em aberto, fica abaixo do limite e cria o pedido

#### Scenario: Pedidos cancelados não contam para o limite
- **WHEN** uma entidade beneficiária autenticada possui 9 pedidos em aberto ("Pendente" ou "Em andamento") e outros pedidos com status "Cancelado", e solicita um pedido válido
- **THEN** o sistema considera apenas os 9 pedidos em aberto, fica abaixo do limite e cria o pedido

#### Scenario: Limite é isolado por entidade beneficiária
- **WHEN** uma entidade beneficiária autenticada sem pedidos em aberto solicita um pedido válido, enquanto outra entidade possui 10 ou mais pedidos em aberto
- **THEN** o sistema cria o pedido da entidade autenticada, sem considerar os pedidos de outras entidades

#### Scenario: Limite é verificado antes da validação do alimento
- **WHEN** uma entidade beneficiária autenticada com 10 pedidos em aberto solicita um pedido informando um alimento inexistente ou indisponível
- **THEN** o sistema recusa a requisição pelo limite de pedidos em aberto, sem chegar a avaliar o alimento, e não cria nenhum pedido

### Requirement: Um pedido em aberto por entidade e alimento
O sistema SHALL recusar a criação de um novo pedido quando a entidade beneficiária autenticada já possuir um pedido em aberto para o mesmo alimento, sem criar o pedido. Um pedido conta como **em aberto** pelo mesmo critério do limite de pedidos em aberto: pertence à entidade, não está excluído logicamente e seu status é "Pendente" ou "Em andamento". Os status "Rejeitado", "Doado" e "Cancelado" são finais e não bloqueiam um novo pedido. Pedidos de outras entidades beneficiárias para o mesmo alimento, e pedidos da mesma entidade para outros alimentos, não contam. A quantidade solicitada não influencia o bloqueio.

A verificação SHALL ocorrer depois do limite de pedidos em aberto e depois de confirmar que o alimento está disponível, e antes da validação da quantidade.

#### Scenario: Primeiro pedido da entidade para o alimento
- **WHEN** uma entidade beneficiária autenticada sem pedido em aberto para um alimento disponível solicita um pedido válido para ele
- **THEN** o sistema cria o pedido normalmente

#### Scenario: Novo pedido com o anterior pendente
- **WHEN** uma entidade beneficiária autenticada com um pedido "Pendente" para um alimento solicita outro pedido para o mesmo alimento
- **THEN** o sistema recusa a requisição por conflito de estado, informando que já existe um pedido em aberto para o alimento, e não cria nenhum pedido

#### Scenario: Novo pedido com o anterior em andamento
- **WHEN** uma entidade beneficiária autenticada com um pedido "Em andamento" para um alimento solicita outro pedido para o mesmo alimento
- **THEN** o sistema recusa a requisição da mesma forma e não cria nenhum pedido

#### Scenario: Novo pedido depois de o anterior ser rejeitado
- **WHEN** uma entidade beneficiária autenticada cujo único pedido para um alimento está "Rejeitado" solicita um novo pedido válido para o mesmo alimento
- **THEN** o sistema cria o pedido normalmente

#### Scenario: Novo pedido depois de o anterior ser doado
- **WHEN** uma entidade beneficiária autenticada cujo único pedido para um alimento está "Doado" solicita um novo pedido válido para o mesmo alimento disponível
- **THEN** o sistema cria o pedido normalmente

#### Scenario: Novo pedido depois de o anterior ser cancelado
- **WHEN** uma entidade beneficiária autenticada cujo único pedido para um alimento está "Cancelado" solicita um novo pedido válido para o mesmo alimento disponível
- **THEN** o sistema cria o pedido normalmente

#### Scenario: Pedido excluído logicamente não bloqueia
- **WHEN** uma entidade beneficiária autenticada cujo único pedido para um alimento está marcado como excluído logicamente solicita um novo pedido válido para o mesmo alimento
- **THEN** o sistema cria o pedido normalmente

#### Scenario: Outra entidade com pedido em aberto para o mesmo alimento
- **WHEN** uma entidade beneficiária autenticada sem pedido para um alimento solicita um pedido válido para ele, enquanto outra entidade possui um pedido "Pendente" para o mesmo alimento
- **THEN** o sistema cria o pedido da entidade autenticada, sem considerar os pedidos de outras entidades

#### Scenario: Pedido em aberto da mesma entidade para outro alimento
- **WHEN** uma entidade beneficiária autenticada com um pedido "Pendente" para um alimento solicita um pedido válido para um alimento diferente
- **THEN** o sistema cria o pedido normalmente

#### Scenario: Quantidade diferente não evita o bloqueio
- **WHEN** uma entidade beneficiária autenticada com um pedido em aberto para um alimento solicita outro pedido para o mesmo alimento com uma quantidade diferente da do primeiro
- **THEN** o sistema recusa a requisição por já existir um pedido em aberto para o alimento e não cria nenhum pedido

#### Scenario: Alimento que deixou de estar disponível
- **WHEN** uma entidade beneficiária autenticada com um pedido em aberto para um alimento solicita um novo pedido para esse alimento depois de ele ficar vencido, excluído logicamente ou com status diferente de "Ativo"
- **THEN** o sistema responde que o alimento não foi encontrado, sem avaliar a duplicidade, e não cria pedido

#### Scenario: Limite de pedidos em aberto prevalece
- **WHEN** uma entidade beneficiária autenticada com 10 pedidos em aberto, um deles para o alimento solicitado, solicita um novo pedido para esse alimento
- **THEN** o sistema recusa a requisição pelo limite de pedidos em aberto, e não pela duplicidade, e não cria nenhum pedido

#### Scenario: Duplicidade é verificada antes da quantidade
- **WHEN** uma entidade beneficiária autenticada com um pedido em aberto para um alimento solicita outro pedido para o mesmo alimento com quantidade acima da disponível
- **THEN** o sistema recusa a requisição por já existir um pedido em aberto para o alimento, sem chegar a avaliar a quantidade, e não cria nenhum pedido

### Requirement: Recusas por conflito identificam o motivo
O sistema SHALL identificar, no corpo da resposta de conflito (`409`) da criação de pedido, o motivo da recusa por um código estável e legível por máquina, além da mensagem descritiva. O código SHALL ser `ORDERS_IN_PROGRESS_LIMIT_REACHED` quando a recusa se deve ao limite de pedidos em aberto e `DUPLICATE_ORDER_IN_PROGRESS` quando se deve a já existir um pedido em aberto da entidade para o mesmo alimento. Os códigos mantêm os nomes do MVP, mesmo com a troca de terminologia. Cada motivo SHALL ter sempre o seu código, independentemente do texto da mensagem.

#### Scenario: Recusa pelo limite traz o código do limite
- **WHEN** uma entidade beneficiária autenticada com 10 pedidos em aberto solicita um novo pedido
- **THEN** o corpo da resposta de conflito traz o código `ORDERS_IN_PROGRESS_LIMIT_REACHED`

#### Scenario: Recusa por duplicidade traz o código de duplicidade
- **WHEN** uma entidade beneficiária autenticada com um pedido em aberto para um alimento solicita outro pedido para o mesmo alimento
- **THEN** o corpo da resposta de conflito traz o código `DUPLICATE_ORDER_IN_PROGRESS`

### Requirement: Pedido registra o tipo total ou parcial

O sistema SHALL registrar em cada pedido criado se ele é do tipo total ou parcial, sem que o cliente informe o tipo. O tipo SHALL seguir o tipo de solicitação do alimento:

- "Somente total": o pedido é sempre total.
- "Somente parcial": o pedido é sempre parcial, inclusive o que leva a sobra (DT30).
- "Total ou parcial": o pedido é total quando a quantidade pedida for igual à quantidade atual do alimento, e parcial quando for menor.

#### Scenario: Alimento "Somente total"

- **WHEN** a entidade pede a quantidade atual inteira de um alimento "Somente total"
- **THEN** o pedido é registrado como total

#### Scenario: Quantidade igual ao estoque

- **WHEN** a entidade pede a quantidade atual inteira de um alimento "Total ou parcial"
- **THEN** o pedido é registrado como total

#### Scenario: Quantidade menor que o estoque

- **WHEN** a entidade pede menos que a quantidade atual de um alimento "Total ou parcial"
- **THEN** o pedido é registrado como parcial

#### Scenario: Alimento "Somente parcial"

- **WHEN** a entidade pede parte da quantidade atual de um alimento "Somente parcial"
- **THEN** o pedido é registrado como parcial

#### Scenario: Sobra de alimento "Somente parcial"

- **WHEN** a entidade pede a sobra inteira de um alimento "Somente parcial" que já não permite pedido parcial
- **THEN** o pedido é registrado como parcial

### Requirement: Criação de pedido confere o alimento no momento da gravação

O sistema SHALL conferir a disponibilidade e a quantidade do alimento e gravar o pedido sem que uma edição, desativação, exclusão ou aceite do mesmo alimento ocorra entre a conferência e a gravação.

#### Scenario: Criação concorrente com desativação

- **WHEN** a criação de um pedido e a desativação do alimento são processadas ao mesmo tempo
- **THEN** ou o pedido é criado antes e vira "Rejeitado" pela desativação, ou a criação responde que o alimento não foi encontrado; nunca fica um pedido "Pendente" em alimento "Inativo"

#### Scenario: Criação concorrente com edição de quantidade

- **WHEN** a criação de um pedido e uma edição da quantidade do alimento são processadas ao mesmo tempo
- **THEN** o pedido é validado e tem o tipo definido pela quantidade em vigor naquele momento, e a edição considera o pedido se ele for gravado antes
### Requirement: Recusas de quantidade identificam o motivo

O sistema SHALL identificar, no corpo da resposta `400` da criação de pedido, o motivo da recusa de quantidade por um código estável, além da mensagem:

- `QUANTITY_EXCEEDS_AVAILABLE`: a quantidade é maior que a disponível;
- `FRACTION_NOT_ALLOWED`: a quantidade é fracionada e a unidade de medida não aceita fração;
- `TOTAL_QUANTITY_REQUIRED`: o alimento é "Somente total" e a quantidade é menor que a disponível;
- `PARTIAL_QUANTITY_REQUIRED`: o alimento é "Somente parcial", a quantidade é igual à disponível, e um pedido parcial ainda é possível.

Quando mais de um motivo se aplica, vale o primeiro da ordem de conferência (estoque, fração, tipo).

#### Scenario: Recusa por estoque traz o código de estoque

- **WHEN** a entidade pede 6 de um alimento "Somente total" com 5 disponíveis
- **THEN** a resposta `400` traz o código `QUANTITY_EXCEEDS_AVAILABLE`

#### Scenario: Recusa por fração traz o código de fração

- **WHEN** a entidade pede 2,5 de um alimento "Somente total" com 5 disponíveis, em unidade sem fração
- **THEN** a resposta `400` traz o código `FRACTION_NOT_ALLOWED`

#### Scenario: Recusa por tipo "Somente total" traz o código do total

- **WHEN** a entidade pede 3 de um alimento "Somente total" com 5 disponíveis
- **THEN** a resposta `400` traz o código `TOTAL_QUANTITY_REQUIRED`

#### Scenario: Recusa por tipo "Somente parcial" traz o código do parcial

- **WHEN** a entidade pede 5 de um alimento "Somente parcial" com 5 disponíveis
- **THEN** a resposta `400` traz o código `PARTIAL_QUANTITY_REQUIRED`

### Requirement: Modal "Solicitar doação" respeita o tipo do alimento

A tela de detalhe do alimento SHALL oferecer, no modal "Solicitar doação", só as opções de quantidade que o tipo de solicitação do alimento permite. O campo de quantidade SHALL aceitar fração só quando a unidade de medida do alimento a aceita. O formulário SHALL validar a quantidade pelas mesmas regras do servidor antes de enviar. Quando o servidor recusar a quantidade, o modal SHALL avisar que a quantidade pode ter mudado e atualizar os dados do alimento.

- "Somente total": só a opção "Quantidade total", já selecionada, com a quantidade disponível fixa.
- "Somente parcial": só a opção "Quantidade parcial", com máximo abaixo do disponível. Na sobra (DT30), o modal mostra a quantidade restante fixa e explica que é o que sobrou do alimento.
- "Total ou parcial": as duas opções, como hoje.

#### Scenario: Alimento "Somente total"

- **WHEN** a entidade abre o modal de um alimento "Somente total"
- **THEN** o modal mostra só a opção "Quantidade total", com a quantidade disponível, e envia essa quantidade

#### Scenario: Alimento "Somente parcial"

- **WHEN** a entidade abre o modal de um alimento "Somente parcial" com 5 un disponíveis
- **THEN** o modal mostra só a opção "Quantidade parcial" e recusa no campo uma quantidade igual a 5

#### Scenario: Sobra de alimento "Somente parcial"

- **WHEN** a entidade abre o modal de um alimento "Somente parcial" com só 1 un disponível
- **THEN** o modal mostra a quantidade restante de 1 un fixa, explica que é a sobra do alimento e envia 1

#### Scenario: Alimento "Total ou parcial"

- **WHEN** a entidade abre o modal de um alimento "Total ou parcial"
- **THEN** o modal mostra as opções "Quantidade total" e "Quantidade parcial"

#### Scenario: Unidade sem fração

- **WHEN** a entidade digita 2,5 na quantidade parcial de um alimento cuja unidade não aceita fração
- **THEN** o campo mostra um erro de quantidade inteira, e o pedido não é enviado

#### Scenario: Quantidade recusada pelo servidor

- **WHEN** o servidor recusa a quantidade com `400`, porque o estoque mudou desde que a tela foi aberta
- **THEN** o modal avisa que a quantidade pode ter mudado e recarrega os dados do alimento
