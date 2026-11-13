# instituicoes/perfil-publico Specification

## Purpose

Mostrar a uma instituição o perfil público de uma instituição do tipo oposto, só com dados mínimos: para a entidade,
o estabelecimento e seus alimentos disponíveis; para o estabelecimento, a entidade e os pedidos entre os dois (RF12,
RF13, RN35, RN36).

## Requirements

### Requirement: Perfil público com dados mínimos

O sistema SHALL devolver, por id, o perfil público de uma instituição do tipo oposto ao de quem pede: a entidade
beneficiária consulta `GET /establishments/:id` (RF13) e o estabelecimento consulta `GET /beneficiary-entities/:id`
(RF12). O perfil SHALL trazer **somente** (RN36):

- `id`;
- `name`: o nome fantasia ou, sem ele, a razão social;
- `image`: a URL da rota de leitura da imagem (`/files/...`), ou `null`;
- `description`;
- `city` e `state`.

A resposta NÃO SHALL conter CNPJ, razão social em campo separado, e-mail ou celular (institucional ou pessoal),
endereço além de município e UF, nome do responsável, data de cadastro ou o marcador de exclusão. A instituição SHALL
ser devolvida só quando existe, não está excluída logicamente (RN35) e o usuário dela tem o e-mail confirmado (DT41);
caso contrário, o sistema SHALL responder `404`, sem dizer qual dos motivos se aplica. `id` não numérico SHALL ser
recusado com `400`. As rotas `GET /establishments/me` e `GET /beneficiary-entities/me` NÃO mudam.

#### Scenario: Entidade abre o perfil de um estabelecimento

- **WHEN** uma entidade beneficiária pede `GET /establishments/:id` de um estabelecimento ativo e confirmado
- **THEN** o sistema retorna só `id`, `name`, `image`, `description`, `city` e `state`

#### Scenario: Estabelecimento abre o perfil de uma entidade

- **WHEN** um estabelecimento pede `GET /beneficiary-entities/:id` de uma entidade ativa e confirmada
- **THEN** o sistema retorna só `id`, `name`, `image`, `description`, `city` e `state`

#### Scenario: Perfil sem nome fantasia

- **WHEN** a entidade abre o perfil de um estabelecimento que apagou o nome fantasia (DT40)
- **THEN** o `name` é a razão social

#### Scenario: Perfil não expõe contato nem endereço

- **WHEN** o perfil público é retornado, mesmo havendo entre as duas um pedido `Em andamento`
- **THEN** a resposta não contém e-mail, celular, CEP, rua, número, complemento, CNPJ nem nome do responsável

#### Scenario: Instituição excluída

- **WHEN** o estabelecimento pede o perfil de uma entidade excluída logicamente
- **THEN** o sistema responde `404`

#### Scenario: Instituição com e-mail não confirmado

- **WHEN** a entidade pede o perfil de um estabelecimento que ainda não confirmou o e-mail
- **THEN** o sistema responde `404`

#### Scenario: Id inexistente

- **WHEN** o perfil é pedido com um id que não corresponde a nenhuma instituição do tipo
- **THEN** o sistema responde `404`

#### Scenario: Id em formato inválido

- **WHEN** o perfil é pedido com id igual a "abc"
- **THEN** o sistema responde `400`, sem consultar nenhuma instituição

#### Scenario: Estabelecimento tenta abrir perfil de estabelecimento

- **WHEN** um estabelecimento pede `GET /establishments/:id`
- **THEN** o sistema responde `403` com `code: ROLE_NOT_ALLOWED`

#### Scenario: Entidade tenta abrir perfil de entidade

- **WHEN** uma entidade beneficiária pede `GET /beneficiary-entities/:id`
- **THEN** o sistema responde `403` com `code: ROLE_NOT_ALLOWED`

#### Scenario: Administrador tenta abrir perfil público

- **WHEN** um administrador pede qualquer uma das duas rotas de perfil público
- **THEN** o sistema responde `403` com `code: ROLE_NOT_ALLOWED`

#### Scenario: Rota do próprio cadastro continua igual

- **WHEN** o estabelecimento pede `GET /establishments/me`
- **THEN** o sistema retorna o cadastro completo dele, como antes, e não o perfil público

### Requirement: Tela do perfil público do estabelecimento

A entidade beneficiária SHALL ver o perfil público do estabelecimento numa tela com: o cabeçalho (`UserAvatar` com
fallback de iniciais, nome, cidade/UF), a seção "Sobre" com a descrição e a seção "Alimentos disponíveis", com o
contador e a grade de alimentos no mesmo card do feed, paginada com o select "Itens por página". Os alimentos SHALL
ser os do recorte do feed para aquele estabelecimento (DT42, `alimentos/listagem`). Cada card SHALL abrir o detalhe
do alimento. A tela NÃO SHALL mostrar contato, endereço, CNPJ, botão de WhatsApp nem data de cadastro.

#### Scenario: Perfil com alimentos disponíveis

- **WHEN** a entidade abre o perfil de um estabelecimento com 3 alimentos disponíveis e 1 alimento `Ativo` vencido
- **THEN** a seção "Alimentos disponíveis" mostra os 3 alimentos e o contador "3 alimentos", sem o vencido

#### Scenario: Perfil sem alimentos disponíveis

- **WHEN** o estabelecimento não tem alimento disponível
- **THEN** a seção mostra um estado vazio ("Nenhum alimento disponível no momento")

#### Scenario: Alimentos de outros estabelecimentos não aparecem

- **WHEN** a entidade abre o perfil de um estabelecimento
- **THEN** a grade mostra só alimentos desse estabelecimento

#### Scenario: Card abre o detalhe

- **WHEN** a entidade clica num alimento do perfil
- **THEN** o frontend abre o detalhe desse alimento, de onde ela pode solicitar a doação

### Requirement: Tela do perfil público da entidade com os pedidos entre as duas

O estabelecimento SHALL ver o perfil público da entidade numa tela com o mesmo cabeçalho e a mesma seção "Sobre" e
com a seção "Histórico de pedidos" ("Pedidos entre você e esta entidade"). A seção SHALL listar os pedidos não
excluídos logicamente entre o estabelecimento logado e essa entidade, em qualquer status (RF12, RN35), com abas
"Todos", "Pendente", "Em andamento", "Rejeitado", "Doado" e "Cancelado", cada uma com a contagem, uma tabela com
alimento, data do pedido, quantidade com unidade e status, e a ação "Ver", que abre o detalhe do pedido. A seção SHALL
ser paginada com o select "Itens por página". Pedidos da entidade com outros estabelecimentos NÃO SHALL aparecer.

#### Scenario: Histórico com pedidos em vários status

- **WHEN** o estabelecimento abre o perfil de uma entidade com quem tem 2 pedidos `Doado`, 1 `Em andamento` e 1
  `Cancelado`
- **THEN** a aba "Todos" mostra os 4 pedidos, e cada aba de status mostra a própria contagem

#### Scenario: Pedidos com outros estabelecimentos não aparecem

- **WHEN** a entidade também tem pedidos com outro estabelecimento
- **THEN** esses pedidos não aparecem no histórico nem nas contagens

#### Scenario: Pedido excluído logicamente não aparece

- **WHEN** um pedido entre os dois está excluído logicamente
- **THEN** ele não aparece no histórico

#### Scenario: Ver abre o detalhe do pedido

- **WHEN** o estabelecimento clica em "Ver" num pedido do histórico
- **THEN** o frontend abre o detalhe desse pedido

#### Scenario: Sem pedidos entre os dois

- **WHEN** o estabelecimento nunca recebeu pedido dessa entidade
- **THEN** a seção mostra um estado vazio ("Nenhum pedido entre vocês ainda")

### Requirement: Perfil indisponível na tela

Quando o perfil público responde `404` (instituição excluída, inexistente ou com e-mail não confirmado), a tela SHALL
mostrar "Instituição não encontrada", sem o cabeçalho nem as seções, e um link de volta para a listagem do tipo. O
frontend NÃO SHALL abrir o perfil de uma instituição do mesmo tipo de quem está logado: o endereço SHALL redirecionar
para a tela inicial do papel.

#### Scenario: Perfil de instituição excluída

- **WHEN** o estabelecimento abre, pelo detalhe de um pedido antigo, o perfil de uma entidade que foi excluída
- **THEN** a tela mostra "Instituição não encontrada" e o link para a listagem de entidades

#### Scenario: Endereço do tipo errado

- **WHEN** uma entidade acessa direto o endereço de perfil de uma entidade
- **THEN** o frontend redireciona para a tela inicial do papel
