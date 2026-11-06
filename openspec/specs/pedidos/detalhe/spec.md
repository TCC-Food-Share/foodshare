# pedidos/detalhe Specification

## Purpose

Permitir que o estabelecimento de origem ou a entidade beneficiária de um pedido obtenha, por id, os detalhes completos desse pedido — o alimento vinculado por inteiro, o status, a quantidade, a data e a identificação e localização (cidade/UF) das duas instituições envolvidas —, viabilizando o acompanhamento de um pedido específico (RF28).

## Requirements

### Requirement: Visualização dos detalhes completos de um pedido vinculado
O sistema SHALL permitir que um usuário autenticado obtenha, por id, os detalhes completos de um pedido do qual ele é parte — o estabelecimento de origem do alimento ou a entidade beneficiária que criou o pedido. O vínculo SHALL ser resolvido pela sessão, nunca informado pelo cliente. Um pedido SHALL ser retornado somente quando o solicitante for uma das partes e o pedido não estiver excluído logicamente; caso contrário o sistema SHALL responder que o pedido não foi encontrado, sem revelar se ele existe para outra instituição. O `id` em formato não numérico SHALL ser rejeitado como inválido, sem consultar nenhum pedido.

Os detalhes retornados SHALL incluir:
- do pedido: identificador, quantidade solicitada, data do pedido, status (identificador e nome), motivo do cancelamento (identificador e nome) e quem cancelou (`cancelledBy`: `ESTABLISHMENT`, `BENEFICIARY_ENTITY`, `ADMINISTRATOR` ou `SYSTEM`). O motivo e quem cancelou SHALL vir preenchidos só no pedido "Cancelado", e nulos nos demais;
- o alimento vinculado por completo: identificador, imagem, nome, quantidade atual e unidade, descrição, data de vencimento, categoria (identificador e nome) e status (identificador e nome). O alimento SHALL ser retornado mesmo que, após a criação do pedido, tenha sido excluído logicamente, vencido ou mudado de status — é um registro histórico do pedido;
- o estabelecimento de origem e a entidade beneficiária: identificador, razão social, nome fantasia, descrição, município e UF. O sistema NÃO retorna e-mail ou telefone institucional nem o endereço de rua das instituições, nem qualquer dado pessoal do usuário vinculado.

#### Scenario: Estabelecimento de origem abre o pedido
- **WHEN** o estabelecimento de origem de um pedido solicita o detalhe desse pedido por id
- **THEN** o sistema retorna os detalhes completos do pedido

#### Scenario: Entidade beneficiária abre o pedido
- **WHEN** a entidade beneficiária que criou um pedido solicita o detalhe desse pedido por id
- **THEN** o sistema retorna os detalhes completos do pedido

#### Scenario: Requisição sem autenticação
- **WHEN** o detalhe de um pedido é solicitado sem sessão autenticada válida
- **THEN** o sistema nega o acesso e não retorna nenhum dado

#### Scenario: Solicitante não é parte do pedido
- **WHEN** um usuário autenticado solicita o detalhe de um pedido em que não é nem o estabelecimento de origem nem a entidade beneficiária
- **THEN** o sistema responde que o pedido não foi encontrado, sem revelar que o pedido existe

#### Scenario: Pedido inexistente ou excluído
- **WHEN** o id informado não corresponde a nenhum pedido, ou corresponde a um pedido excluído logicamente
- **THEN** o sistema responde que o pedido não foi encontrado

#### Scenario: Conta autenticada não é estabelecimento nem entidade beneficiária
- **WHEN** uma conta sem estabelecimento nem entidade beneficiária vinculada solicita o detalhe de um pedido
- **THEN** o sistema responde que o pedido não foi encontrado

#### Scenario: Id em formato inválido
- **WHEN** o id informado não é um número
- **THEN** o sistema rejeita a requisição informando que o id é inválido, sem consultar nenhum pedido

#### Scenario: Alimento vinculado já indisponível
- **WHEN** o solicitante abre um pedido cujo alimento vinculado, depois da criação do pedido, foi excluído logicamente, venceu ou mudou de status
- **THEN** o sistema retorna o detalhe do pedido com os dados completos desse alimento mesmo assim

#### Scenario: Detalhe não expõe contato institucional nem endereço de rua
- **WHEN** o solicitante abre um pedido do qual é parte
- **THEN** os dados de cada instituição no detalhe trazem apenas identificador, razão social, nome fantasia, descrição, município e UF, sem e-mail ou telefone institucional, sem CEP/rua/número e sem dados pessoais do usuário

#### Scenario: Pedido cancelado traz motivo e quem cancelou
- **WHEN** uma das partes abre um pedido que o estabelecimento cancelou com o motivo "Alimento não está mais disponível"
- **THEN** o detalhe traz esse motivo e `cancelledBy` igual a `ESTABLISHMENT`

#### Scenario: Pedido não cancelado não traz motivo
- **WHEN** uma das partes abre um pedido "Pendente", "Em andamento", "Rejeitado" ou "Doado"
- **THEN** o detalhe traz o motivo do cancelamento e quem cancelou nulos

### Requirement: Tela de detalhe mostra o cancelamento
A tela de detalhe de um pedido "Cancelado" SHALL mostrar, no card de situação do pedido, quem cancelou, do ponto de vista de quem está vendo, e o motivo do cancelamento:

- "Você cancelou este pedido." quando a própria instituição cancelou;
- "O estabelecimento cancelou este pedido." ou "A entidade cancelou este pedido." quando foi a outra parte;
- "Nossa equipe cancelou este pedido." quando foi o administrador, sem citar "administrador";
- "Este pedido foi cancelado automaticamente." quando foi o sistema.

#### Scenario: Entidade abre pedido que ela cancelou
- **WHEN** a entidade abre o detalhe de um pedido que ela cancelou com o motivo "Solicitação feita por engano"
- **THEN** a tela mostra "Você cancelou este pedido." e o motivo "Solicitação feita por engano"

#### Scenario: Estabelecimento abre pedido cancelado pela entidade
- **WHEN** o estabelecimento abre o detalhe de um pedido que a entidade cancelou
- **THEN** a tela mostra "A entidade cancelou este pedido." e o motivo escolhido por ela

#### Scenario: Pedido cancelado pela exclusão do alimento
- **WHEN** a entidade abre um pedido cancelado porque o estabelecimento excluiu o alimento
- **THEN** a tela mostra "O estabelecimento cancelou este pedido." e o motivo informado na exclusão
