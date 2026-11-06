## MODIFIED Requirements

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

## ADDED Requirements

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
