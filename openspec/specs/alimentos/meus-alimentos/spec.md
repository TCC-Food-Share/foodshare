# alimentos/meus-alimentos Specification

## Purpose

Permitir que o estabelecimento veja e gerencie os alimentos que cadastrou, separados por status, com busca, ordenação e as ações que cada estado permite.

## Requirements

### Requirement: Listagem dos alimentos do próprio estabelecimento

O sistema SHALL permitir que um estabelecimento autenticado liste, de forma paginada, os próprios alimentos não excluídos logicamente, em qualquer status e mesmo vencidos, com filtro opcional por status ("Ativo", "Reservado" ou "Inativo"). Cada alimento SHALL trazer os mesmos dados do detalhe e a quantidade de pedidos "Pendente" e de pedidos "Em andamento" vinculados a ele. O vínculo com o estabelecimento SHALL ser resolvido pela sessão.

#### Scenario: Lista só os alimentos do próprio estabelecimento

- **WHEN** um estabelecimento autenticado lista os próprios alimentos
- **THEN** o sistema retorna apenas os alimentos dele, sem os de outros estabelecimentos

#### Scenario: Filtro por status

- **WHEN** o estabelecimento lista os próprios alimentos com o filtro de status "Inativo"
- **THEN** o sistema retorna apenas os alimentos dele com status "Inativo"

#### Scenario: Status fora do conjunto

- **WHEN** o filtro de status não é "Ativo", "Reservado" nem "Inativo"
- **THEN** o sistema rejeita a requisição como dado inválido

#### Scenario: Alimento excluído logicamente não aparece

- **WHEN** o estabelecimento tem um alimento excluído logicamente
- **THEN** esse alimento não aparece na listagem, em nenhum status

#### Scenario: Alimento vencido aparece

- **WHEN** o estabelecimento tem um alimento "Ativo" com data de vencimento no passado
- **THEN** esse alimento aparece na listagem, no status "Ativo"

#### Scenario: Contagem de pedidos em aberto

- **WHEN** um alimento tem 2 pedidos "Pendente", 1 pedido "Em andamento" e 3 pedidos em status finais
- **THEN** a listagem informa 2 pedidos "Pendente" e 1 pedido "Em andamento" para esse alimento

#### Scenario: Conta autenticada não é estabelecimento

- **WHEN** uma entidade beneficiária autenticada tenta listar alimentos do estabelecimento
- **THEN** o sistema recusa o acesso com `403` e `code: ROLE_NOT_ALLOWED`

#### Scenario: Requisição sem autenticação

- **WHEN** a listagem é solicitada sem sessão autenticada válida
- **THEN** o sistema nega o acesso e não retorna nenhum dado

### Requirement: Busca na listagem do estabelecimento

O sistema SHALL aceitar um termo único de busca, que encontra o alimento por trecho do nome, da categoria, da quantidade ou da descrição, sem diferenciar maiúsculas nem acentos, ou por trecho da data de vencimento ou da data de publicação no formato dd/mm/aaaa. A busca SHALL combinar com o filtro de status.

#### Scenario: Busca por nome sem acento

- **WHEN** o estabelecimento busca "pao" e tem o alimento "Pão francês"
- **THEN** o alimento aparece no resultado

#### Scenario: Busca por categoria

- **WHEN** o estabelecimento busca o nome da categoria de um alimento
- **THEN** o alimento aparece no resultado

#### Scenario: Busca por quantidade

- **WHEN** o estabelecimento busca "50" e tem um alimento com quantidade 50
- **THEN** o alimento aparece no resultado

#### Scenario: Busca por data

- **WHEN** o estabelecimento busca "31/12/2026" e tem um alimento com essa data de vencimento ou de publicação
- **THEN** o alimento aparece no resultado

#### Scenario: Busca combinada com status

- **WHEN** o estabelecimento busca um termo com o filtro de status "Ativo"
- **THEN** o resultado traz apenas os alimentos "Ativo" que correspondem ao termo

### Requirement: Ordenação e paginação da listagem do estabelecimento

O sistema SHALL ordenar a listagem por nome, categoria, quantidade, data de vencimento ou data de publicação, em ordem crescente ou decrescente, com data de publicação decrescente como padrão. A paginação SHALL seguir o padrão das listagens: `page`, `pageSize` de 10, 20, 50 ou 100 e resposta com `data`, `total`, `page` e `pageSize`.

#### Scenario: Ordenação por campo

- **WHEN** o estabelecimento ordena por data de vencimento crescente
- **THEN** os alimentos vêm do que vence antes para o que vence depois

#### Scenario: Ordenação padrão

- **WHEN** o estabelecimento lista sem informar ordenação
- **THEN** os alimentos vêm do publicado mais recentemente para o mais antigo

#### Scenario: Campo de ordenação inválido

- **WHEN** o campo de ordenação não é um dos aceitos
- **THEN** o sistema rejeita a requisição como dado inválido

#### Scenario: Tamanho de página inválido

- **WHEN** o `pageSize` não é 10, 20, 50 nem 100
- **THEN** o sistema responde `400`

### Requirement: Tela "Meus Alimentos"

O frontend SHALL oferecer a tela "Meus Alimentos", no menu e acessível apenas ao estabelecimento, com abas "Ativo", "Reservado" e "Inativo" (cada uma com a sua contagem), busca, ordenação por coluna, paginação com o select "Itens por página" e o botão de cadastrar alimento. As ações de cada linha SHALL respeitar o estado do alimento: "Ver" e "Excluir" sempre; "Editar" e "Desativar" só em "Ativo" e indisponíveis enquanto houver pedido "Em andamento"; "Reativar" só em "Inativo".

#### Scenario: Ações de alimento "Ativo" sem pedido em andamento

- **WHEN** o estabelecimento vê um alimento "Ativo" sem pedido "Em andamento"
- **THEN** a linha oferece "Ver", "Editar", "Desativar" e "Excluir"

#### Scenario: Ações de alimento "Ativo" com pedido em andamento

- **WHEN** o estabelecimento vê um alimento "Ativo" com pedido "Em andamento"
- **THEN** "Editar" e "Desativar" ficam indisponíveis, com o motivo visível, e "Ver" e "Excluir" continuam disponíveis

#### Scenario: Ações de alimento "Reservado"

- **WHEN** o estabelecimento vê um alimento "Reservado"
- **THEN** a linha oferece apenas "Ver" e "Excluir"

#### Scenario: Ações de alimento "Inativo"

- **WHEN** o estabelecimento vê um alimento "Inativo"
- **THEN** a linha oferece "Ver", "Reativar" e "Excluir"

#### Scenario: Entidade beneficiária não acessa a tela

- **WHEN** uma entidade beneficiária acessa o endereço da tela
- **THEN** o frontend a redireciona para a tela inicial, e o item não aparece no menu dela

#### Scenario: Diálogo de edição diz o efeito antes de salvar

- **WHEN** o estabelecimento informa uma nova quantidade no diálogo de edição de um alimento com pedidos "Pendente"
- **THEN** o diálogo diz quantos pedidos totais serão atualizados e quantos pedidos parciais serão rejeitados, antes da confirmação

#### Scenario: Diálogo de desativação diz o efeito

- **WHEN** o estabelecimento abre a desativação de um alimento com pedidos "Pendente"
- **THEN** o diálogo diz quantos pedidos serão rejeitados

#### Scenario: Diálogo de exclusão diz o efeito e pede o motivo

- **WHEN** o estabelecimento abre a exclusão de um alimento com pedidos "Pendente" e "Em andamento"
- **THEN** o diálogo diz quantos pedidos serão rejeitados e quantos serão cancelados, e exige um motivo no select com busca, que oferece "Sugerir nova opção" e não lista motivos de sistema

#### Scenario: Exclusão sem pedido em andamento não pede motivo

- **WHEN** o estabelecimento abre a exclusão de um alimento sem pedido "Em andamento"
- **THEN** o diálogo pede só a confirmação, sem o select de motivo
