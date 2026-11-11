## MODIFIED Requirements

### Requirement: Visualização dos detalhes completos de um pedido vinculado
O sistema SHALL permitir que um usuário autenticado obtenha, por id, os detalhes completos de um pedido do qual ele é parte — o estabelecimento de origem do alimento ou a entidade beneficiária que criou o pedido. O vínculo SHALL ser resolvido pela sessão, nunca informado pelo cliente. Um pedido SHALL ser retornado somente quando o solicitante for uma das partes e o pedido não estiver excluído logicamente; caso contrário o sistema SHALL responder que o pedido não foi encontrado, sem revelar se ele existe para outra instituição. A exclusão lógica de qualquer das instituições envolvidas NÃO SHALL impedir o acesso das partes: o detalhe permanece disponível, em qualquer status, como registro histórico (RN12). O `id` em formato não numérico SHALL ser rejeitado como inválido, sem consultar nenhum pedido.

Os detalhes retornados SHALL incluir:
- do pedido: identificador, quantidade solicitada, data do pedido, data da última atualização da quantidade (`quantityUpdatedAt`, nula se a quantidade nunca foi alterada pelo estabelecimento), status (identificador e nome), motivo do cancelamento (identificador e nome) e quem cancelou (`cancelledBy`: `ESTABLISHMENT`, `BENEFICIARY_ENTITY`, `ADMINISTRATOR` ou `SYSTEM`). O motivo e quem cancelou SHALL vir preenchidos só no pedido "Cancelado", e nulos nos demais;
- o alimento vinculado por completo: identificador, imagem, nome, quantidade atual e unidade, descrição, data de vencimento, categoria (identificador e nome) e status (identificador e nome). O alimento SHALL ser retornado mesmo que, após a criação do pedido, tenha sido excluído logicamente, vencido ou mudado de status — é um registro histórico do pedido;
- o estabelecimento de origem e a entidade beneficiária: identificador, razão social, nome fantasia, descrição, município e UF;
- **somente na instituição da outra parte e somente enquanto o pedido está "Em andamento"** (RN12, RF28): o e-mail institucional, o celular institucional e o endereço completo (CEP, rua, número, complemento, município e UF). Em qualquer outro status esses três campos SHALL vir nulos, e na instituição do próprio solicitante SHALL vir sempre nulos. O sistema NÃO retorna, em nenhum caso, dado pessoal do usuário vinculado (e-mail pessoal, celular pessoal, nome do responsável).

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

#### Scenario: Pedido em andamento traz o contato da outra parte
- **WHEN** a entidade abre um pedido "Em andamento"
- **THEN** o detalhe traz, no estabelecimento, o e-mail institucional, o celular institucional e o endereço completo (CEP, rua, número, complemento, município e UF)

#### Scenario: Estabelecimento também vê o contato da entidade
- **WHEN** o estabelecimento abre um pedido "Em andamento"
- **THEN** o detalhe traz, na entidade, o e-mail institucional, o celular institucional e o endereço completo

#### Scenario: Contato da própria instituição não é devolvido
- **WHEN** qualquer das partes abre um pedido "Em andamento"
- **THEN** na instituição do próprio solicitante, o e-mail institucional, o celular institucional e o endereço vêm nulos

#### Scenario: Detalhe não expõe contato institucional nem endereço de rua
- **WHEN** uma das partes abre um pedido "Pendente", "Rejeitado", "Doado" ou "Cancelado"
- **THEN** os dados das duas instituições trazem apenas identificador, razão social, nome fantasia, descrição, município e UF, e o e-mail institucional, o celular institucional e o endereço (CEP, rua, número) vêm nulos

#### Scenario: Contato some quando o pedido deixa de estar em andamento
- **WHEN** a entidade confirma o recebimento de um pedido "Em andamento" e a mesma parte abre o detalhe de novo
- **THEN** o pedido está "Doado" e o detalhe não traz mais e-mail, celular nem endereço do estabelecimento

#### Scenario: Detalhe não expõe dado pessoal
- **WHEN** o solicitante abre um pedido do qual é parte, em qualquer status
- **THEN** a resposta não contém e-mail pessoal, celular pessoal nem nome do responsável de nenhuma das instituições

#### Scenario: Outra parte excluída logicamente
- **WHEN** o estabelecimento foi excluído logicamente e a entidade abre um pedido "Doado" ou "Cancelado" feito a ele que não está excluído
- **THEN** o sistema retorna o detalhe normalmente, com os dados do estabelecimento excluído

#### Scenario: Própria instituição excluída logicamente
- **WHEN** a instituição do solicitante está marcada como excluída logicamente e o pedido não está excluído
- **THEN** o detalhe não é recusado por causa da exclusão da instituição

#### Scenario: Pedido cancelado traz motivo e quem cancelou
- **WHEN** uma das partes abre um pedido que o estabelecimento cancelou com o motivo "Alimento não está mais disponível"
- **THEN** o detalhe traz esse motivo e `cancelledBy` igual a `ESTABLISHMENT`

#### Scenario: Pedido não cancelado não traz motivo
- **WHEN** uma das partes abre um pedido "Pendente", "Em andamento", "Rejeitado" ou "Doado"
- **THEN** o detalhe traz o motivo do cancelamento e quem cancelou nulos

#### Scenario: Pedido com quantidade ajustada traz a data
- **WHEN** a quantidade de um pedido "Pendente" do tipo total foi ajustada pelo estabelecimento (edição, aceite ou cancelamento de outro pedido) e uma das partes abre o detalhe
- **THEN** o detalhe traz `quantityUpdatedAt` com a data do ajuste

#### Scenario: Pedido sem ajuste de quantidade
- **WHEN** uma das partes abre um pedido cuja quantidade nunca foi ajustada
- **THEN** o detalhe traz `quantityUpdatedAt` nulo

## ADDED Requirements

### Requirement: Card de contato e WhatsApp no detalhe do pedido em andamento

A tela de detalhe de um pedido "Em andamento" SHALL mostrar, no card da outra instituição, o e-mail institucional, o celular institucional e o endereço completo dela (RF28, RN12), de modo que as duas partes combinem a retirada. O celular SHALL ser um link para o WhatsApp no padrão `https://wa.me/<número>`, com o número em formato internacional: código do país `55` seguido do DDD e do número, só com dígitos, sem máscara (RF09). O link SHALL abrir em nova aba. O botão do WhatsApp SHALL aparecer somente quando o celular tem 11 dígitos (DDD e número com nono dígito); com 10 dígitos (telefone fixo, que o cadastro aceita) a tela SHALL mostrar o número sem o botão. Em qualquer outro status a tela SHALL NOT mostrar contato nem endereço, e SHALL NOT mostrar o card com campos vazios.

#### Scenario: Link do WhatsApp em formato internacional
- **WHEN** a entidade abre um pedido "Em andamento" cujo estabelecimento tem o celular institucional "(18) 99123-4567"
- **THEN** a tela mostra o botão do WhatsApp apontando para `https://wa.me/5518991234567`, que abre em nova aba

#### Scenario: Estabelecimento abre o WhatsApp da entidade
- **WHEN** o estabelecimento abre um pedido "Em andamento" cuja entidade tem o celular institucional "(18) 98888-7777"
- **THEN** a tela mostra o botão do WhatsApp apontando para `https://wa.me/5518988887777`

#### Scenario: E-mail e endereço exibidos
- **WHEN** a entidade abre um pedido "Em andamento"
- **THEN** o card do estabelecimento mostra o e-mail institucional e o endereço completo (rua, número, complemento quando houver, CEP, município e UF)

#### Scenario: Telefone fixo sem botão
- **WHEN** a outra instituição tem o celular institucional "(18) 3642-1234", com 10 dígitos
- **THEN** a tela mostra o número, sem o botão do WhatsApp

#### Scenario: Pedido fora de "Em andamento" na tela
- **WHEN** uma das partes abre o detalhe de um pedido "Pendente", "Rejeitado", "Doado" ou "Cancelado"
- **THEN** a tela não mostra e-mail, celular, endereço nem botão do WhatsApp da outra instituição

### Requirement: Aviso de quantidade atualizada no detalhe

A tela de detalhe SHALL mostrar o aviso "Quantidade atualizada pelo estabelecimento em <data>", com a data de `quantityUpdatedAt` no formato local da tela, junto da quantidade solicitada, sempre que `quantityUpdatedAt` existir, para as duas partes e em qualquer status. Quando for nulo, a tela SHALL NOT mostrar o aviso.

#### Scenario: Aviso com data
- **WHEN** a entidade abre um pedido cuja quantidade foi ajustada pelo estabelecimento em 05/11/2026
- **THEN** a tela mostra "Quantidade atualizada pelo estabelecimento em 05/11/2026" junto da quantidade solicitada

#### Scenario: Sem aviso
- **WHEN** uma das partes abre um pedido cuja quantidade nunca foi ajustada
- **THEN** a tela não mostra o aviso de quantidade atualizada
